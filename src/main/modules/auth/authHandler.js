const crypto = require("node:crypto");
const os = require("node:os");

const {
    getDatabase
} = require("../../database/connection");


class AuthHandler {
    constructor() {
        this.currentSession = null;
        this.computerId = this.generateComputerId();
    }


    getDatabase() {
        return getDatabase();
    }


    generateComputerId() {
        const hostname =
            os.hostname();

        const platform =
            os.platform();

        const arch =
            os.arch();

        const uniqueString =
            [
                hostname,
                platform,
                arch
            ].join("-");

        return crypto
            .createHash("sha256")
            .update(uniqueString)
            .digest("hex")
            .substring(0, 16);
    }


    getComputerName() {
        return os.hostname();
    }


    normalizeUsername(username) {
        return String(
            username || ""
        ).trim();
    }


    async getUserByUsername(username) {
        const database =
            this.getDatabase();

        return database
            .prepare(`
                SELECT *
                FROM users
                WHERE username = ?
                  AND is_active = 1
                LIMIT 1
            `)
            .get(username);
    }


    async getUserPermissions(role) {
        const database =
            this.getDatabase();

        return database
            .prepare(`
                SELECT *
                FROM module_permissions
                WHERE role = ?
                ORDER BY module_key
            `)
            .all(role);
    }


    async createOrUpdateSession(
        userId,
        isPersistent
    ) {
        const database =
            this.getDatabase();

        const now =
            new Date().toISOString();

        database
            .prepare(`
                INSERT INTO user_sessions (
                    user_id,
                    computer_id,
                    computer_name,
                    is_persistent,
                    created_at,
                    last_access_at
                )
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, computer_id)
                DO UPDATE SET
                    computer_name = excluded.computer_name,
                    is_persistent = excluded.is_persistent,
                    last_access_at = excluded.last_access_at
            `)
            .run(
                userId,
                this.computerId,
                this.getComputerName(),
                isPersistent ? 1 : 0,
                now,
                now
            );

        return database
            .prepare(`
                SELECT *
                FROM user_sessions
                WHERE user_id = ?
                  AND computer_id = ?
                LIMIT 1
            `)
            .get(
                userId,
                this.computerId
            );
    }


    async updateUserLastLogin(userId) {
        const database =
            this.getDatabase();

        database
            .prepare(`
                UPDATE users
                SET last_login_at = ?,
                    updated_at = ?
                WHERE id = ?
            `)
            .run(
                new Date().toISOString(),
                new Date().toISOString(),
                userId
            );
    }


    async updateLastAccess(userId) {
        const database =
            this.getDatabase();

        database
            .prepare(`
                UPDATE user_sessions
                SET last_access_at = ?
                WHERE user_id = ?
                  AND computer_id = ?
            `)
            .run(
                new Date().toISOString(),
                userId,
                this.computerId
            );
    }


    async getSessionByComputer() {
        const database =
            this.getDatabase();

        return database
            .prepare(`
                SELECT
                    us.*,
                    u.username,
                    u.display_name,
                    u.role,
                    u.is_active
                FROM user_sessions us
                INNER JOIN users u
                    ON u.id = us.user_id
                WHERE us.computer_id = ?
                  AND us.is_persistent = 1
                  AND u.is_active = 1
                ORDER BY us.last_access_at DESC
                LIMIT 1
            `)
            .get(
                this.computerId
            );
    }


    buildSession(user, permissions) {
        return {
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                role: user.role,
                is_active: user.is_active
            },
            permissions,
            computerId: this.computerId
        };
    }


    async login(
        username,
        isPersistent = false
    ) {
        try {
            const normalizedUsername =
                this.normalizeUsername(
                    username
                );

            if (!normalizedUsername) {
                return {
                    success: false,
                    error: "Informe o nome do usuário."
                };
            }

            const user =
                await this.getUserByUsername(
                    normalizedUsername
                );

            if (!user) {
                return {
                    success: false,
                    error: "Usuário não encontrado ou inativo."
                };
            }

            const permissions =
                await this.getUserPermissions(
                    user.role
                );

            await this.createOrUpdateSession(
                user.id,
                Boolean(isPersistent)
            );

            await this.updateUserLastLogin(
                user.id
            );

            this.currentSession =
                this.buildSession(
                    user,
                    permissions
                );

            await this.updateLastAccess(
                user.id
            );

            return {
                success: true,
                data: this.currentSession
            };
        } catch (error) {
            console.error(
                "[AUTH] Erro ao fazer login:",
                error
            );

            return {
                success: false,
                error:
                    error?.message ||
                    "Não foi possível realizar o login."
            };
        }
    }


    async logout() {
        try {
            if (this.currentSession?.user?.id) {
                const database =
                    this.getDatabase();

                database
                    .prepare(`
                        DELETE FROM user_sessions
                        WHERE user_id = ?
                          AND computer_id = ?
                    `)
                    .run(
                        this.currentSession.user.id,
                        this.computerId
                    );
            }

            this.currentSession = null;

            return {
                success: true
            };
        } catch (error) {
            console.error(
                "[AUTH] Erro ao sair:",
                error
            );

            return {
                success: false,
                error:
                    error?.message ||
                    "Não foi possível encerrar a sessão."
            };
        }
    }


    async getCurrentSession() {
        try {
            if (this.currentSession) {
                await this.updateLastAccess(
                    this.currentSession.user.id
                );

                return {
                    success: true,
                    data: this.currentSession
                };
            }

            const session =
                await this.getSessionByComputer();

            if (!session) {
                return {
                    success: true,
                    data: null
                };
            }

            const permissions =
                await this.getUserPermissions(
                    session.role
                );

            this.currentSession =
                this.buildSession(
                    {
                        id: session.user_id,
                        username: session.username,
                        display_name: session.display_name,
                        role: session.role,
                        is_active: session.is_active
                    },
                    permissions
                );

            await this.updateLastAccess(
                session.user_id
            );

            return {
                success: true,
                data: this.currentSession
            };
        } catch (error) {
            console.error(
                "[AUTH] Erro ao recuperar sessão:",
                error
            );

            return {
                success: false,
                error:
                    error?.message ||
                    "Não foi possível recuperar a sessão."
            };
        }
    }


    async validateSession() {
        try {
            const result =
                await this.getCurrentSession();

            if (
                !result.success ||
                !result.data
            ) {
                return {
                    success: false,
                    error: "Nenhuma sessão ativa."
                };
            }

            return result;
        } catch (error) {
            console.error(
                "[AUTH] Erro ao validar sessão:",
                error
            );

            return {
                success: false,
                error:
                    error?.message ||
                    "Sessão inválida."
            };
        }
    }


    async updateLastAccessHandler() {
        try {
            if (
                this.currentSession?.user?.id
            ) {
                await this.updateLastAccess(
                    this.currentSession.user.id
                );
            }

            return {
                success: true
            };
        } catch (error) {
            console.error(
                "[AUTH] Erro ao atualizar acesso:",
                error
            );

            return {
                success: false,
                error:
                    error?.message ||
                    "Não foi possível atualizar o acesso."
            };
        }
    }


    getAuthenticatedUser() {
        return this.currentSession?.user || null;
    }


    getComputerId() {
        return this.computerId;
    }
}


module.exports =
    new AuthHandler();