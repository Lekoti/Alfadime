const nodemailer = require("nodemailer");
const Imap = require("imap");
const MailComposer = require(
    "nodemailer/lib/mail-composer"
);

const {
    EMAIL_CONFIG
} = require("./email-dispatch.config");

const {
    isValidEmail,
    toSafeNumber
} = require("../../utils/validation.utils");

function getConfigValue(
    config,
    names,
    fallback = ""
) {
    for (const name of names) {
        if (
            config &&
            config[name] !== undefined &&
            config[name] !== null &&
            String(config[name]).trim() !== ""
        ) {
            return config[name];
        }
    }

    return fallback;
}

function getText(
    config,
    names,
    fallback = ""
) {
    return String(
        getConfigValue(
            config,
            names,
            fallback
        ) || ""
    ).trim();
}

function getNumber(
    config,
    names,
    fallback = 0
) {
    const value =
        getConfigValue(
            config,
            names,
            fallback
        );

    return toSafeNumber(
        value,
        fallback
    );
}

function getSecureOption(mode) {
    switch (
        String(mode || "")
            .trim()
            .toLowerCase()
    ) {
        case "tls":
        case "ssl":
        case "tls/ssl":
            return true;

        case "starttls":
            return {
                secure: false,
                requireTLS: true
            };

        case "none":
        default:
            return false;
    }
}

function normalizeSmtpConfig(
    config = {}
) {
    return {
        host: getText(config, [
            "smtp_host"
        ]),

        port: getNumber(config, [
            "smtp_port"
        ], 587),

        secureMode: getText(config, [
            "smtp_secure"
        ], "starttls"),

        user: getText(config, [
            "smtp_user"
        ]),

        password: getText(config, [
            "smtp_password_encrypted",
            "smtppassword",
            "smtp_password"
        ]),

        from_name: getText(config, [
            "from_name"
        ]),

        from_email: getText(config, [
            "from_email"
        ]),

        replyTo: getText(config, [
            "reply_to_email"
        ])
    };
}

function normalizeImapConfig(
    config = {}
) {
    return {
        host: getText(config, [
            "imap_host",
            "imaphost"
        ]),

        port: getNumber(config, [
            "imap_port",
            "imapport"
        ], 993),

        secureMode: getText(config, [
            "imap_secure",
            "imapsecure"
        ], "tls"),

        user: getText(config, [
            "imap_user",
            "imapuser"
        ]),

        password: getText(config, [
            "imap_password_encrypted",
            "imappasswordencrypted",
            "imappassword",
            "imap_password"
        ])
    };
}

function validateSmtpConfig(config) {
    if (!config.host) {
        throw new Error(
            "Informe o SMTP Host."
        );
    }

    if (!config.port) {
        throw new Error(
            "Informe a SMTP Porta."
        );
    }

    if (!config.user) {
        throw new Error(
            "Informe o SMTP Usuário."
        );
    }

    if (!config.password) {
        throw new Error(
            "Informe a SMTP Senha antes de testar ou enviar."
        );
    }
}

function validateImapConfig(config) {
    if (!config.host) {
        throw new Error(
            "IMAP Host não configurado."
        );
    }

    if (!config.port) {
        throw new Error(
            "IMAP Porta não configurada."
        );
    }

    if (!config.user) {
        throw new Error(
            "IMAP Usuário não configurado."
        );
    }

    if (!config.password) {
        throw new Error(
            "IMAP Senha não configurada."
        );
    }
}

function createSmtpTransport(
    sourceConfig
) {
    const config =
        normalizeSmtpConfig(
            sourceConfig
        );

    validateSmtpConfig(config);

    const secureOption =
        getSecureOption(
            config.secureMode
        );

    const transportOptions = {
        host: config.host,
        port: config.port,
        secure:
            typeof secureOption ===
            "boolean"
                ? secureOption
                : false,
        auth: {
            user: config.user,
            pass: config.password
        },
        connectionTimeout:
            EMAIL_CONFIG.CONNECTION_TIMEOUT_MS
    };

    if (
        typeof secureOption ===
            "object" &&
        secureOption !== null
    ) {
        Object.assign(
            transportOptions,
            secureOption
        );
    }

    return nodemailer.createTransport(
        transportOptions
    );
}

function normalizeEmailList(value) {
    if (!value) {
        return [];
    }

    return String(value)
        .replace(/[,;]/g, "\n")
        .split("\n")
        .map((email) => email.trim())
        .filter((email) =>
            isValidEmail(email)
        );
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}

function textToEmailHtml(value) {
    return escapeHtml(value)
        .replace(
            / {2}/g,
            " &nbsp;"
        )
        .replace(
            /\r?\n/g,
            "<br>\n"
        );
}

function buildMailOptions(
    sourceConfig,
    messageData,
    attachments = []
) {
    const config =
        normalizeSmtpConfig(
            sourceConfig
        );

    const mailOptions = {
        from: {
            name:
                config.from_name ||
                config.from_email ||
                config.user,
            address:
                config.from_email ||
                config.user
        },
        to: {
            name:
                messageData.toName ||
                undefined,
            address:
                messageData.to
        },
        subject:
            messageData.subject,
        text:
            String(
                messageData.text ||
                messageData.html ||
                ""
            ),
        html:
            textToEmailHtml(
                messageData.html ||
                messageData.text ||
                ""
            )
    };

    if (messageData.cc) {
        const cc =
            normalizeEmailList(
                messageData.cc
            );

        if (cc.length) {
            mailOptions.cc = cc;
        }
    }

    if (messageData.bcc) {
        const bcc =
            normalizeEmailList(
                messageData.bcc
            );

        if (bcc.length) {
            mailOptions.bcc = bcc;
        }
    }

    if (config.replyTo) {
        mailOptions.replyTo =
            config.replyTo;
    }

    if (
        Array.isArray(attachments) &&
        attachments.length
    ) {
        mailOptions.attachments =
            attachments.map(
                (attachment) => {
                    if (
                        typeof attachment ===
                        "string"
                    ) {
                        return {
                            path: attachment
                        };
                    }

                    return {
                        filename:
                            attachment.fileName ||
                            attachment.filename ||
                            attachment.name,
                        path:
                            attachment.path ||
                            attachment.filePath,
                        contentType:
                            attachment.contentType
                    };
                }
            );
    }

    return mailOptions;
}

function createRawMessage(
    mailOptions
) {
    return new Promise(
        (resolve, reject) => {
            const composer =
                new MailComposer(
                    mailOptions
                );

            composer.compile()
                .build(
                    (error, message) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        resolve(message);
                    }
                );
        }
    );
}

function getImapConnectionConfig(
    sourceConfig
) {
    const config =
        normalizeImapConfig(
            sourceConfig
        );

    validateImapConfig(config);

    const secure =
        [
            "tls",
            "ssl",
            "tls/ssl"
        ].includes(
            String(
                config.secureMode
            ).toLowerCase()
        );

    return {
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port,
        tls: secure,
        tlsOptions: {
            servername: config.host
        },
        connTimeout:
            EMAIL_CONFIG.CONNECTION_TIMEOUT_MS,
        authTimeout:
            EMAIL_CONFIG.CONNECTION_TIMEOUT_MS
    };
}

function openImapBox(
    imap,
    boxName
) {
    return new Promise(
        (resolve, reject) => {
            imap.openBox(
                boxName,
                false,
                (error, box) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(box);
                }
            );
        }
    );
}

function getImapBoxes(imap) {
    return new Promise(
        (resolve, reject) => {
            imap.getBoxes(
                (error, boxes) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(boxes || {});
                }
            );
        }
    );
}

function flattenImapBoxes(
    boxes,
    prefix = "",
    result = []
) {
    Object.entries(boxes || {})
        .forEach(([name, box]) => {
            const fullName =
                prefix
                    ? `${prefix}${box.delimiter || "/"}${name}`
                    : name;

            result.push(fullName);

            if (box.children) {
                flattenImapBoxes(
                    box.children,
                    fullName,
                    result
                );
            }
        });

    return result;
}

function findSentMailbox(
    boxes
) {
    const folders =
        flattenImapBoxes(boxes);

    const preferredNames = [
        "Enviadas",
        "Sent",
        "INBOX.Enviadas",
        "INBOX.Sent"
    ];

    for (
        const preferredName
        of preferredNames
    ) {
        const found =
            folders.find((folder) => {
                return folder.toLowerCase() ===
                    preferredName.toLowerCase();
            });

        if (found) {
            return found;
        }
    }

    const sentFolder =
        folders.find((folder) => {
            const normalized =
                folder
                    .normalize("NFD")
                    .replace(
                        /[\u0300-\u036f]/g,
                        ""
                    )
                    .toLowerCase();

            return (
                normalized === "enviadas" ||
                normalized === "sent" ||
                normalized.endsWith(".enviadas") ||
                normalized.endsWith(".sent")
            );
        });

    return sentFolder || null;
}

function appendToSentFolder(
    sourceConfig,
    rawMessage,
    internalDate = new Date()
) {
    return new Promise(
        (resolve, reject) => {
            let imap;

            try {
                imap = new Imap(
                    getImapConnectionConfig(
                        sourceConfig
                    )
                );
            } catch (error) {
                reject(error);
                return;
            }

            let settled = false;

            function finish(
                error,
                result
            ) {
                if (settled) {
                    return;
                }

                settled = true;

                try {
                    if (imap) {
                        imap.end();
                    }
                } catch {
                    // Encerramento já realizado.
                }

                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            }

            imap.once(
                "ready",
                async () => {
                    try {
                        const boxes =
                            await getImapBoxes(
                                imap
                            );

                        const mailbox =
                            findSentMailbox(
                                boxes
                            );

                        if (!mailbox) {
                            throw new Error(
                                "Pasta Enviadas/Sent não encontrada no IMAP."
                            );
                        }

                        await openImapBox(
                            imap,
                            mailbox
                        );

                        await new Promise(
                            (resolveAppend, rejectAppend) => {
                                imap.append(
                                    rawMessage,
                                    {
                                        mailbox
                                    },
                                    (error) => {
                                        if (error) {
                                            rejectAppend(error);
                                            return;
                                        }

                                        resolveAppend();
                                    }
                                );
                            }
                        );

                        finish(null, {
                            saved: true,
                            mailbox
                        });
                    } catch (error) {
                        finish(
                            error
                        );
                    }
                }
            );

            imap.once(
                "error",
                (error) => {
                    finish(error);
                }
            );

            imap.connect();
        }
    );
}

async function sendEmailViaSmtp(
    sourceConfig,
    messageData,
    attachments = []
) {
    const config =
        normalizeSmtpConfig(
            sourceConfig
        );

    const transport =
        createSmtpTransport(
            sourceConfig
        );

    const mailOptions =
        buildMailOptions(
            sourceConfig,
            messageData,
            attachments
        );

    let rawMessage;

    try {
        rawMessage =
            await createRawMessage(
                mailOptions
            );
    } catch (error) {
        console.error(
            "Falha ao montar mensagem:",
            error.message
        );

        throw error;
    }

    try {
        const info =
            await transport.sendMail(
                mailOptions
            );

        let sentCopy = {
            saved: false,
            mailbox: null,
            error: null
        };

        try {
            sentCopy =
                await appendToSentFolder(
                    sourceConfig,
                    rawMessage
                );
        } catch (imapError) {
            sentCopy = {
                saved: false,
                mailbox: null,
                error:
                    imapError?.message ||
                    "Não foi possível salvar a cópia em Enviadas."
            };

            console.error(
                "E-mail enviado, mas não salvo em Enviadas:",
                sentCopy.error
            );
        }

        console.log(
            "E-mail enviado para:",
            messageData.to,
            info.messageId
        );

        return {
            success: true,
            messageId:
                info.messageId,
            sentCopy
        };
    } catch (error) {
        console.error(
            "Falha ao enviar e-mail para:",
            messageData.to,
            error.message
        );

        throw error;
    } finally {
        try {
            transport.close();
        } catch {
            // Transporte já encerrado.
        }
    }
}

async function testSmtpConnection(
    sourceConfig
) {
    try {
        const config =
            normalizeSmtpConfig(
                sourceConfig
            );

        const transport =
            createSmtpTransport(
                sourceConfig
            );

        await transport.verify();

        try {
            transport.close();
        } catch {
            // Transporte já encerrado.
        }

        return {
            success: true,
            message:
                `Conexão SMTP OK: ${config.host}:${config.port} — ${config.user}`
        };
    } catch (error) {
        return {
            success: false,
            message:
                error?.message ||
                "Falha desconhecida no SMTP."
        };
    }
}

module.exports = {
    createSmtpTransport,
    sendEmailViaSmtp,
    testSmtpConnection,
    normalizeSmtpConfig,
    normalizeImapConfig,
    appendToSentFolder
};