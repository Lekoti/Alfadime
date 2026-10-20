const usersDatabaseService = require("./usersDatabaseService");

const {
    USER_ROLES
} = require("./userRoles.constants");

const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const PROTECTED_CREATOR_USERNAME = "sLekoti";

function listUsers(currentUser) {
    return usersDatabaseService.listUsers(currentUser);
}

function createUser(data, currentUser) {
    return usersDatabaseService.createUser(data, currentUser);
}

function updateUser(id, data, currentUser) {
    return usersDatabaseService.updateUser(id, data, currentUser);
}

function deleteUser(id, currentUser) {
    return usersDatabaseService.deleteUser(id, currentUser);
}

function setUserActive(id, isActive, currentUser) {
    return usersDatabaseService.setUserActive(id, isActive, currentUser);
}

function listPermissions() {
    return usersDatabaseService.listPermissions();
}

function runGitCommand(gitArguments) {
    return new Promise((resolve, reject) => {
        execFile(
            "git",
            gitArguments,
            {
                cwd: process.cwd(),
                windowsHide: true,
                maxBuffer: 10 * 1024 * 1024
            },
            (error, stdout, stderr) => {
                if (error) {
                    reject(
                        new Error(
                            stderr ||
                            error.message
                        )
                    );

                    return;
                }

                resolve(
                    String(stdout || "").trim()
                );
            }
        );
    });
}

async function publishRelease(currentUser) {
    try {
        const { app } = require("electron");


        if (app?.isPackaged) {
            return {
                success: false,
                error: "A publicação de atualizações está disponível apenas no ambiente de desenvolvimento."
            };
        }


        if (
            !currentUser ||
            currentUser.role !== USER_ROLES.CREATOR
        ) {
            return {
                success: false,
                error: "Somente o perfil Staff pode publicar atualizações."
            };
        }

        const packagePath = path.join(
            process.cwd(),
            "package.json"
        );

        const packageJson = JSON.parse(
            fs.readFileSync(
                packagePath,
                "utf8"
            )
        );

        const versionParts =
            String(packageJson.version || "").split(".");

        if (versionParts.length !== 3) {
            return {
                success: false,
                error: "Versão inválida no package.json."
            };
        }

        versionParts[2] = String(
            Number(versionParts[2]) + 1
        );

        const newVersion =
            versionParts.join(".");

        const newTag = `v${newVersion}`;

        packageJson.version = newVersion;

        fs.writeFileSync(
            packagePath,
            JSON.stringify(
                packageJson,
                null,
                2
            ) + "\n",
            "utf8"
        );

        await runGitCommand(["add", "."]);

        try {
            await runGitCommand([
                "commit",
                "-m",
                `release: publica atualizacao ${newTag}`
            ]);
        } catch {
            // Continua se não houver alterações para commitar.
        }

        await runGitCommand([
            "pull",
            "--rebase"
        ]);

        await runGitCommand([
            "tag",
            newTag
        ]);

        await runGitCommand([
            "push",
            "origin",
            "main"
        ]);

        await runGitCommand([
            "push",
            "origin",
            newTag
        ]);

        return {
            success: true,
            data: {
                version: newVersion,
                tag: newTag
            }
        };
    } catch (error) {
        console.error(
            "[USERS] Erro ao publicar atualização:",
            error
        );

        return {
            success: false,
            error: error?.message ||
                "Não foi possível publicar a atualização."
        };
    }
}

module.exports = {
    listUsers,
    createUser,
    updateUser,
    deleteUser,
    setUserActive,
    listPermissions,
    publishRelease
};