const { app } = require('electron');
const path = require('path');
const crypto = require('crypto');
const db = require('../../database/connection');

class AuthHandler {
  constructor() {
    this.currentSession = null;
    this.computerId = this.generateComputerId();
  }

  generateComputerId() {
    const hostname = require('os').hostname();
    const platform = require('os').platform();
    const arch = require('os').arch();
    const uniqueString = `${hostname}-${platform}-${arch}-${Date.now()}`;
    return crypto.createHash('sha256').update(uniqueString).digest('hex').substring(0, 16);
  }

  getComputerName() {
    return require('os').hostname();
  }

  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ? AND is_active = 1',
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getUserPermissions(role) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM module_permissions WHERE role = ?',
        [role],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  async createOrUpdateSession(userId, isPersistent) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      db.run(
        `INSERT OR REPLACE INTO user_sessions 
         (user_id, computer_id, computer_name, is_persistent, created_at, last_access_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [userId, this.computerId, this.getComputerName(), isPersistent ? 1 : 0],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, user_id: userId });
        }
      );
    });
  }

  async updateLastAccess(userId) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE user_sessions SET last_access_at = datetime('now') 
         WHERE user_id = ? AND computer_id = ?`,
        [userId, this.computerId],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  async getSessionByComputer() {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT us.*, u.username, u.display_name, u.role, u.is_active
         FROM user_sessions us
         JOIN users u ON us.user_id = u.id
         WHERE us.computer_id = ? AND u.is_active = 1`,
        [this.computerId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async login(username, isPersistent = false) {
    try {
      const user = await this.getUserByUsername(username);
      
      if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      const permissions = await this.getUserPermissions(user.role);
      
      await this.createOrUpdateSession(user.id, isPersistent);
      
      this.currentSession = {
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          role: user.role,
          is_active: user.is_active,
        },
        permissions,
        computerId: this.computerId,
      };

      await this.updateLastAccess(user.id);

      return {
        success: true,
        data: this.currentSession,
      };
    } catch (error) {
      console.error('AuthHandler.login error:', error);
      return { success: false, error: error.message };
    }
  }

  async logout() {
    try {
      this.currentSession = null;
      return { success: true };
    } catch (error) {
      console.error('AuthHandler.logout error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCurrentSession() {
    try {
      if (this.currentSession) {
        return { success: true, data: this.currentSession };
      }

      const session = await this.getSessionByComputer();
      
      if (!session) {
        return { success: true, data: null };
      }

      const permissions = await this.getUserPermissions(session.role);

      this.currentSession = {
        user: {
          id: session.user_id,
          username: session.username,
          display_name: session.display_name,
          role: session.role,
          is_active: session.is_active,
        },
        permissions,
        computerId: this.computerId,
      };

      return { success: true, data: this.currentSession };
    } catch (error) {
      console.error('AuthHandler.getCurrentSession error:', error);
      return { success: false, error: error.message };
    }
  }

  async validateSession() {
    try {
      if (!this.currentSession) {
        const session = await this.getSessionByComputer();
        
        if (!session) {
          return { success: false, error: 'Nenhuma sessão ativa' };
        }

        const permissions = await this.getUserPermissions(session.role);

        this.currentSession = {
          user: {
            id: session.user_id,
            username: session.username,
            display_name: session.display_name,
            role: session.role,
            is_active: session.is_active,
          },
          permissions,
          computerId: this.computerId,
        };
      }

      return { success: true, data: this.currentSession };
    } catch (error) {
      console.error('AuthHandler.validateSession error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateLastAccessHandler() {
    try {
      if (this.currentSession?.user?.id) {
        await this.updateLastAccess(this.currentSession.user.id);
      }
      return { success: true };
    } catch (error) {
      console.error('AuthHandler.updateLastAccess error:', error);
      return { success: false, error: error.message };
    }
  }

  getComputerId() {
    return this.computerId;
  }
}

module.exports = new AuthHandler();