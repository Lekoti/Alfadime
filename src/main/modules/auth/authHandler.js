const crypto = require("node:crypto");
const os = require("node:os");


const {
    getUsersDatabase
} = require("../../database/connection");


const granularPermissionsHandler = require("./granularPermissionsHandler");


const {
    USER_ROLES
} = require("./userRoles.constants");


class AuthHandler {
    constructor() {
        this.currentSession = null;
        this.computerId = this.generateComputerId();
    }


    getDatabase() {
        return getUsersDatabase();
    }


    generateComputerId() {
        const hostname = os.hostname();
        const platform = os.platform();
        const arch = os.arch();


        const uniqueString = [
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


    normalizeText(value) {
        return String(value || "").trim();
    }


    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString("hex");


        const hash = crypto
            .scryptSync(password, salt, 64)
            .toString("hex");


        return `${salt}:${hash}`;
    }


    verifyPassword(password, storedHash) {
        if (!storedHash) {
            return false;
        }


        const [
            salt,
            hash
        ] = String(storedHash).split(":");


        if (!salt || !hash) {
            return false;
        }


        const candidate = crypto.scryptSync(password, salt, 64);
        const stored = Buffer.from(hash, "hex");


        if (candidate.length !== stored.length) {
            return false;
        }


        return crypto.timingSafeEqual(candidate, stored);
    }


    async getUserByUsername(username) {
        const database = this.getDatabase();


        return database
            .prepare(`
                SELECT *
                FROM users
                WHERE username = ?
                LIMIT 1
            `)
            .get(username);
    }


    async getUserPermissions(user) {
        if (
            user.role === USER_ROLES.CREATOR ||
            user.role === USER_ROLES.ADMIN
        ) {
            const result = await granularPermissionsHandler.getPermissionsForRole(
                user.role
            );


            if (result?.success) {
                return result.data.modules.map(
                    (module) => ({
                        ...module,
                        can_view: true,
                        can_edit: true,
                        can_delete: true,
                        can_approve: true,
                        can_export: true,
                        can_sync: true
                    })
                );
            }
        }


        const result = await granularPermissionsHandler.getPermissionsForUser(
            user.id
        );


        if (!result?.success) {
            return [];
        }


        return result.data.modules;
    }


    async register({
        username,
        displayName,
        password
    }) {
        try {
            const normalizedUsername = this.normalizeText(username);
            const normalizedDisplayName = this.normalizeText(displayName);
            const normalizedPassword = String(password || "");


            if (!normalizedUsername) {
                return {
                    success: false,
                    error: "Informe o nome de usuário."
                };
            }


            if (!normalizedDisplayName) {
                return {
                    success: false,
                    error: "Informe o nome de exibição."
                };
            }


            if (normalizedPassword.length < 6) {
                return {
                    success: false,
                    error: "Defina uma senha com pelo menos 6 caracteres."
                };
            }


            const existingUser = await this.getUserByUsername(normalizedUsername);


            if (existingUser) {
                return {
                    success: false,
                    error: "Já existe um usuário com este nome."
                };
            }


            const database = this.getDatabase();
            const now = new Date().toISOString();


            database
                .prepare(`
                    INSERT INTO users (
                        username,
                        display_name,
                        role,
                        is_active,
                        password_hash,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `)
                .run(
                    normalizedUsername,
                    normalizedDisplayName,
                    USER_ROLES.VIEWER,
                    1,
                    this.hashPassword(normalizedPassword),
                    now,
                    now
                );


            return {
                success: true,
                data: {
                    username: normalizedUsername
                }
            };
        } catch (error) {
            console.error("[AUTH] Erro ao criar conta:", error);


            return {
                success: false,
                error: error?.message || "Não foi possível criar a conta."
            };
        }
    }


    async createOrUpdateSession(userId, isPersistent) {
        const database = this.getDatabase();
        const now = new Date().toISOString();


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
            .get(userId, this.computerId);
    }


    async updateUserLastLogin(userId) {
        const database = this.getDatabase();


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
        const database = this.getDatabase();


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
        const database = this.getDatabase();


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
            .get(this.computerId);
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


    async login(username, password, isPersistent = false) {
        try {
            const normalizedUsername = this.normalizeText(username);
            const normalizedPassword = String(password || "");


            if (!normalizedUsername) {
                return {
                    success: false,
                    error: "Informe o nome de usuário."
                };
            }


            if (!normalizedPassword) {
                return {
                    success: false,
                    error: "Informe a senha."
                };
            }


            const user = await this.getUserByUsername(normalizedUsername);


            if (!user || !user.is_active) {
                return {
                    success: false,
                    error: "Usuário ou senha inválidos."
                };
            }


            if (!user.password_hash) {
                if (normalizedPassword.length < 6) {
                    return {
                        success: false,
                        error: "Defina uma senha com pelo menos 6 caracteres."
                    };
                }


                const database = this.getDatabase();
                const newPasswordHash = this.hashPassword(normalizedPassword);


                database
                    .prepare(`
                        UPDATE users
                        SET password_hash = ?,
                            updated_at = ?
                        WHERE id = ?
                    `)
                    .run(
                        newPasswordHash,
                        new Date().toISOString(),
                        user.id
                    );


                user.password_hash = newPasswordHash;
            }


            const passwordIsValid = this.verifyPassword(
                normalizedPassword,
                user.password_hash
            );


            if (!passwordIsValid) {
                return {
                    success: false,
                    error: "Usuário ou senha inválidos."
                };
            }


            const permissions = await this.getUserPermissions(user);


            await this.createOrUpdateSession(user.id, Boolean(isPersistent));
            await this.updateUserLastLogin(user.id);


            this.currentSession = this.buildSession(user, permissions);


            await this.updateLastAccess(user.id);


            return {
                success: true,
                data: this.currentSession
            };
        } catch (error) {
            console.error("[AUTH] Erro ao fazer login:", error);


            return {
                success: false,
                error: error?.message || "Não foi possível realizar o login."
            };
        }
    }


    async logout() {
        try {
            if (this.currentSession?.user?.id) {
                const database = this.getDatabase();


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
            console.error("[AUTH] Erro ao sair:", error);


            return {
                success: false,
                error: error?.message || "Não foi possível encerrar a sessão."
            };
        }
    }


    async getCurrentSession() {
        try {
            const session = await this.getSessionByComputer();


            if (!session) {
                this.currentSession = null;


                return {
                    success: true,
                    data: null
                };
            }


            const permissions = await this.getUserPermissions({
                id: session.user_id,
                role: session.role
            });


            this.currentSession = this.buildSession(
                {
                    id: session.user_id,
                    username: session.username,
                    display_name: session.display_name,
                    role: session.role,
                    is_active: session.is_active
                },
                permissions
            );


            await this.updateLastAccess(session.user_id);


            return {
                success: true,
                data: this.currentSession
            };
        } catch (error) {
            console.error("[AUTH] Erro ao recuperar sessão:", error);


            return {
                success: false,
                error: error?.message || "Não foi possível recuperar a sessão."
            };
        }
    }


    async validateSession() {
        try {
            const result = await this.getCurrentSession();


            if (!result.success || !result.data) {
                return {
                    success: false,
                    error: "Nenhuma sessão ativa."
                };
            }


            return result;
        } catch (error) {
            console.error("[AUTH] Erro ao validar sessão:", error);


            return {
                success: false,
                error: error?.message || "Sessão inválida."
            };
        }
    }


    async updateLastAccessHandler() {
        try {
            if (this.currentSession?.user?.id) {
                await this.updateLastAccess(this.currentSession.user.id);
            }


            return {
                success: true
            };
        } catch (error) {
            console.error("[AUTH] Erro ao atualizar acesso:", error);


            return {
                success: false,
                error: error?.message || "Não foi possível atualizar o acesso."
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


module.exports = new AuthHandler();