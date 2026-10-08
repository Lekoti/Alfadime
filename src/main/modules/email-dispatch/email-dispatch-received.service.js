const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Imap = require('imap');
const { simpleParser } = require('mailparser');

const receivedRepository = require('./email-dispatch-received.repository');
const emailRepository = require('./email-dispatch.repository');
const pricePendingRepository = require('../price-pending/price-pending.repository');

const {
    getEmailDownloadsPath
} = require('./email-dispatch.config');

const {
    processSpreadsheet
} = require('./email-spreadsheet-processor.service');

const {
    DESTINATION_FOLDERS
} = require('../../config/app.config');

const PRICE_DESTINATION = DESTINATION_FOLDERS.PRICES;

const {
    toSafeNumber
} = require('../../utils/validation.utils');

const ALLOWED_EXTENSIONS = new Set([
    '.xlsx',
    '.xls',
    '.xlsm',
    '.csv',
    '.pdf',
    '.doc',
    '.docx',
    '.txt'
]);

const PROCESSABLE_SPREADSHEET_EXTENSIONS = new Set([
    '.xlsx',
    '.xls',
    '.xlsm'
]);

function ensureDirectory(directoryPath) {
    fs.mkdirSync(directoryPath, {
        recursive: true
    });
}

function getText(value) {
    return String(value ?? '').trim();
}

function getConfigValue(config, names, fallback = '') {
    for (const name of names) {
        if (
            config &&
            config[name] !== undefined &&
            config[name] !== null &&
            String(config[name]).trim() !== ''
        ) {
            return config[name];
        }
    }

    return fallback;
}

function getImapConfig(config) {
    const availableFields = Object.keys(config || {}).sort();

    const user = getText(
        getConfigValue(config, [
            'imapuser',
            'imap_user',
            'imapUser',
            'email',
            'fromemail',
            'from_email',
            'username',
            'user'
        ])
    );

    const password = getText(
        getConfigValue(config, [
            'imappasswordencrypted',
            'imap_password_encrypted',
            'imapPasswordEncrypted',
            'imappassword',
            'imap_password',
            'imapPassword',
            'emailpasswordencrypted',
            'email_password_encrypted',
            'emailpassword',
            'email_password',
            'smtpPasswordEncrypted',
            'smtppasswordencrypted',
            'smtp_password_encrypted',
            'smtpPassword',
            'smtppassword',
            'smtp_password',
            'passwordencrypted',
            'password_encrypted',
            'password',
            'senhaencrypted',
            'senha_encrypted',
            'senha'
        ])
    );

    const host = getText(
        getConfigValue(config, [
            'imaphost',
            'imap_host',
            'imapHost',
            'incominghost',
            'incoming_host',
            'server',
            'host'
        ])
    );

    const port = toSafeNumber(
        getConfigValue(config, [
            'imapport',
            'imap_port',
            'imapPort',
            'incomingport',
            'incoming_port'
        ], 993)
    );

    const secure = getText(
        getConfigValue(config, [
            'imapsecure',
            'imap_secure',
            'imapSecure',
            'imapsecurity',
            'imap_security',
            'security',
            'encryption'
        ], 'tls')
    ).toLowerCase();

    console.log(
        '[EMAIL][RECEBIDOS][IMAP] Configuração carregada:',
        {
            configId: config?.id || null,
            configName:
                config?.name ||
                config?.fromemail ||
                config?.email ||
                config?.id ||
                null,
            userConfigured: Boolean(user),
            passwordConfigured: Boolean(password),
            hostConfigured: Boolean(host),
            port,
            secure,
            fields: availableFields
        }
    );

    if (!user) {
        throw new Error(
            'A configuração não possui usuário IMAP. Campos disponíveis: ' +
            availableFields.join(', ')
        );
    }

    if (!password) {
        throw new Error(
            'A configuração não possui senha IMAP utilizável. ' +
            'Salve novamente a conta em Configurações > E-mail. ' +
            'Campos disponíveis: ' +
            availableFields.join(', ')
        );
    }

    if (!host) {
        throw new Error(
            'A configuração não possui servidor IMAP. Campos disponíveis: ' +
            availableFields.join(', ')
        );
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('A configuração possui porta IMAP inválida.');
    }

    return {
        user,
        password,
        host,
        port,
        tls: [
            'tls',
            'ssl',
            'tls/ssl',
            'ssl/tls',
            'true',
            '1'
        ].includes(secure),
        tlsOptions: {
            servername: host
        },
        connTimeout: 30000,
        authTimeout: 30000
    };
}
function getReceivedDirectory() {
    const directory = path.join(
        getEmailDownloadsPath(),
        'recebidos'
    );

    ensureDirectory(directory);

    return directory;
}

function getPendingProcessedPath() {
    const directory = path.join(
        getEmailDownloadsPath(),
        'processados',
        'pendencias'
    );

    ensureDirectory(directory);

    return directory;
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

function detectRoutineType(fileName, subject) {
    const text = normalizeText(
        `${fileName || ''} ${subject || ''}`
    );

    if (
        text.includes('PENDENCIA') ||
        text.includes('PENDENCIAS') ||
        text.includes('PENDENTE')
    ) {
        return 'pendencias';
    }

    if (
        text.includes('PRECO') ||
        text.includes('PRECOS') ||
        text.includes('TABELA')
    ) {
        return 'precos';
    }

    return null;
}

function getSenderEmail(from) {
    if (!from) {
        return '';
    }

    if (Array.isArray(from.value) && from.value[0]) {
        return getText(from.value[0].address).toLowerCase();
    }

    if (typeof from.text === 'string') {
        const match = from.text.match(
            /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
        );

        return match ? match[0].toLowerCase() : '';
    }

    if (from.address) {
        return getText(from.address).toLowerCase();
    }

    return '';
}

function getSenderName(from) {
    if (!from) {
        return '';
    }

    if (Array.isArray(from.value) && from.value[0]) {
        return getText(from.value[0].name);
    }

    return getText(from.text);
}

function extractCampaignCode(subject) {
    const match = String(subject || '').match(
        /\[ALF-([A-Z0-9]{6})\]/i
    );

    return match
        ? 'ALF-' + String(match[1]).toUpperCase()
        : null;
}

function normalizeMessageId(value) {
    return String(value || '')
        .trim()
        .replace(/^<|>$/g, '')
        .toLowerCase();
}

function extractMessageIds(value) {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value
            .flatMap((item) => extractMessageIds(item))
            .filter(Boolean);
    }

    const text = String(value);
    const bracketedIds = text.match(/<[^>]+>/g) || [];

    if (bracketedIds.length > 0) {
        return bracketedIds
            .map(normalizeMessageId)
            .filter(Boolean);
    }

    return text
        .split(/\s+/)
        .map(normalizeMessageId)
        .filter(Boolean);
}

function findLinkedCampaign(parsed) {
    const database = require('../../database/connection')
        .getDatabase();

    const campaignCode = extractCampaignCode(parsed.subject);

    if (campaignCode) {
        const campaign = database.prepare(`
            SELECT *
            FROM email_campaigns
            WHERE UPPER(TRIM(campaign_code)) = ?
            LIMIT 1
        `).get(campaignCode);

        if (campaign) {
            return {
                campaign,
                campaignCode,
                linkedBy: 'campaign_code'
            };
        }

        const codeHistory = database.prepare(`
            SELECT campaign_id
            FROM email_campaign_code_history
            WHERE UPPER(TRIM(campaign_code)) = ?
            LIMIT 1
        `).get(campaignCode);

        if (codeHistory?.campaign_id) {
            const historicalCampaign = database.prepare(`
                SELECT *
                FROM email_campaigns
                WHERE id = ?
                LIMIT 1
            `).get(codeHistory.campaign_id);

            if (historicalCampaign) {
                return {
                    campaign: historicalCampaign,
                    campaignCode,
                    linkedBy: 'campaign_code_history'
                };
            }
        }
    }

    const messageIds = [
        ...extractMessageIds(parsed.inReplyTo),
        ...extractMessageIds(parsed.references)
    ];

    if (messageIds.length === 0) {
        return {
            campaign: null,
            campaignCode,
            linkedBy: null
        };
    }

    const sentEmails = database.prepare(`
        SELECT campaign_id, campaign_code, sent_message_id
        FROM sent_emails
        WHERE sent_message_id IS NOT NULL
    `).all();

    for (const messageId of messageIds) {
        const sentEmail = sentEmails.find((item) => {
            return normalizeMessageId(item.sent_message_id) === messageId;
        });

        if (!sentEmail?.campaign_id) {
            continue;
        }

        const campaign = database.prepare(`
            SELECT *
            FROM email_campaigns
            WHERE id = ?
            LIMIT 1
        `).get(sentEmail.campaign_id);

        if (campaign) {
            return {
                campaign,
                campaignCode:
                    campaignCode ||
                    getText(sentEmail.campaign_code) ||
                    getText(campaign.campaign_code) ||
                    null,
                linkedBy: 'message_id'
            };
        }
    }

    return {
        campaign: null,
        campaignCode,
        linkedBy: null
    };
}

function getStableMessageUid(parsed, imapUid, configId) {
    const messageId = getText(parsed.messageId);

    if (messageId) {
        return `${configId}:message-id:${messageId}`;
    }

    return `${configId}:imap-uid:${imapUid}`;
}

function getExistingMessageByUid(configId, messageUid) {
    const database = require('../../database/connection')
        .getDatabase();

    return database.prepare(`
        SELECT id, status
        FROM email_received_messages
        WHERE config_id IS ?
          AND message_uid = ?
        LIMIT 1
    `).get(
        configId || null,
        messageUid
    );
}

function createMessageIfNeeded(data) {
    const existing = getExistingMessageByUid(
        data.configid,
        data.messageuid
    );

    if (existing) {
        return {
            message: existing,
            alreadyExists: true
        };
    }

    return {
        message: receivedRepository.createMessage({
            config_id: data.configid,
            message_uid: data.messageuid,
            message_id: data.messageid,
            sender_email: data.senderemail,
            sender_name: data.sendername,
            subject: data.subject,
            received_at: data.receivedat
        }),
        alreadyExists: false
    };
}

function listMessageAttachments(messageId) {
    return receivedRepository.listAttachments(messageId);
}

function updateMessageStatus(messageId, status, errorMessage = null) {
    return receivedRepository.updateMessageStatus(
        messageId,
        status,
        errorMessage
    );
}

function normalizeSupplierLookupName(value) {
    return String(value ?? "")
        .replace(/\u00A0/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

const SUPPLIER_GLOBAL_CODE_MAP = Object.freeze({
    "3B PLASTICOS": "778",
    "ABELHA RAINHA": "898",
    "ABL": "887",
    "ABOVE": "750",
    "ACCUMED": "10",
    "ADDIT": "11",
    "ADV": "12",
    "AEROFLEX": "907",
    "AGAPLASTIC": "854",
    "AGESANI": "834",
    "AIRELA": "231",
    "ALMAR CASTANHAS": "896",
    "AMAKHA PARIS": "909",
    "AMOVERI": "911",
    "ANALITIC": "15",
    "ANDRAMED": "840",
    "ANTIBIOTICOS DO BRASIL": "899",
    "APIS FLORA": "517",
    "ARCOR": "759",
    "ARTE NATIVA": "18",
    "ATIVA SMART": "246",
    "AURAQUIMICA": "853",
    "AVANT": "923",
    "AVVIO INDUSTRIA": "863",
    "BANANA BRASIL": "901",
    "BANANINHA FAZENDA": "912",
    "BEIRA ALTA": "868",
    "BELFAR": "169",
    "BELLAPHYTUS": "859",
    "BELLIZ": "253",
    "BIOLAND": "915",
    "BIONATUS": "24",
    "BLAU": "26",
    "BLOWTEX": "16",
    "BRASIL LATEX": "897",
    "BRASTERAPICA": "28",
    "BREYER": "779",
    "BRINDES DIMEBRAS": "883",
    "BUTTERFLY": "31",
    "BYE BAD REVIV": "867",
    "CARTA FABRIL": "742",
    "CASEX": "831",
    "CATARINENSE": "34",
    "CATARINENSE MATACURA": "35",
    "CAZI": "36",
    "CCM INDUSTRIA": "843",
    "CIEX DO BRASIL": "288",
    "CIFARMA": "39",
    "CIFARMA PROPAGANDA": "179",
    "CIMED": "40",
    "CIRANDA MAGICA": "904",
    "CIRURGICA FERNANDES": "41",
    "COLOPLAST": "841",
    "COPAG": "927",
    "COTTONBABY": "788",
    "CRAL": "842",
    "CREATINA ALPHAFITUS": "882",
    "CREMER": "44",
    "CRISTAL": "895",
    "CURAPROX": "798",
    "D K T": "46",
    "DACOLONIA": "893",
    "DDN": "871",
    "DELTA": "49",
    "DENT FLEX": "814",
    "DESCARPACK": "821",
    "DIMEBRAS": "51",
    "DIVON": "53",
    "DORJA": "54",
    "DOVALLE": "751",
    "DR PEANUT": "889",
    "DRICA": "894",
    "DUMALE": "835",
    "ECO DIAGNOSTICA": "852",
    "ECOFITUS": "180",
    "EMS": "56",
    "EMS GENERICO": "875",
    "EQUILIBRIUM": "846",
    "EQUIPLEX": "57",
    "ESCOBEL": "869",
    "ESSENCE": "825",
    "EUROFARMA": "60",
    "EUROPA": "61",
    "EVOLUE": "928",
    "FARMABRA": "63",
    "FARMALOGISTICA": "64",
    "FARMAX": "65",
    "FIBRASCA": "789",
    "FISIOLIDER": "880",
    "FLORA NECTAR": "580",
    "FORTLIFE": "917",
    "GAUCHAFARMA": "335",
    "GEOLAB": "9",
    "GERMED": "66",
    "GFARMA": "587",
    "GIOVANNA BABY": "878",
    "GLICOMED": "590",
    "GLOBO": "122",
    "GLOOR TUBOS": "340",
    "GOLGRAN": "829",
    "GOULART": "724",
    "GREENPHARMA": "184",
    "GUDAY": "924",
    "HADASS": "107",
    "HEALTHY DO BRASIL": "832",
    "HEARST": "67",
    "HERA": "902",
    "HERBISSIMO": "913",
    "HERTZ": "68",
    "HOMEOPATIA WALDEMIRO PEREIRA": "69",
    "HYPERA DCH": "70",
    "HYPERA PP": "728",
    "IFAL": "71",
    "IMEC": "72",
    "INALAIR": "851",
    "INBORPLAS": "73",
    "INCOTERM": "74",
    "INFRAMED": "837",
    "INJEX": "75",
    "INVICTA": "358",
    "JD DISTRIBUIDORA": "615",
    "JD PROD ALIMENTICIOS": "76",
    "JP FARMA": "816",
    "KARL STORZ": "850",
    "KATIGUA": "885",
    "KDU": "811",
    "KESTAL": "127",
    "KONDENTECH": "826",
    "KRAEMER": "77",
    "KROENER": "130",
    "KUKA": "864",
    "LAB PHARMA": "903",
    "LABORATORIO ACLIMACAO": "900",
    "LABOTRAT": "860",
    "LBS": "131",
    "LEBON": "876",
    "LILLO": "872",
    "LOLLY": "870",
    "LUXBIOTECH": "919",
    "MADE IN ITALY": "637",
    "MAKROFARMA": "79",
    "MALAVASI": "768",
    "MAQUIRA": "818",
    "MARJAN": "787",
    "MASTERFARMA": "747",
    "MAX TITANIUM": "890",
    "MAXINUTRI": "193",
    "MCG INDUSTRIA FARMACEUTICA": "929",
    "MCG PERFUMARIA": "931",
    "MCG SUPLEMENTOS": "930",
    "MEDINAL": "195",
    "MEDIX": "80",
    "MEDLEVENSOHN": "196",
    "MEDLEY": "726",
    "MEDPEX": "845",
    "MEDQUIMICA": "82",
    "MELPOEJO": "136",
    "MENOALIV": "793",
    "MERHEJE": "137",
    "MIDIAN": "735",
    "MINANCORA": "199",
    "MISSNER": "83",
    "MULTILAB": "8",
    "MULTILASER": "201",
    "N S": "84",
    "NATCOFARMA": "908",
    "NATIVITA": "405",
    "NATUBRAS": "933",
    "NATULAB": "85",
    "NATURELIFE": "87",
    "NAYR": "785",
    "NEOBEM": "774",
    "NEOPAN": "738",
    "NORTE SUL": "89",
    "NOVA QUIMICA": "741",
    "NTL": "144",
    "OMRON": "93",
    "OMS DO BRASIL": "858",
    "ORA PRO NOBIS UNIAO LTDA": "881",
    "OSORIO": "96",
    "PANTANAL": "838",
    "PHARLAB": "147",
    "PHARMA EXPRESS": "873",
    "PHARMASCIENCE": "99",
    "PHARMUS": "672",
    "POLIBRINQ": "884",
    "PONTELAND": "100",
    "POSEIDON": "101",
    "PRATI": "149",
    "PREVENT PHARMA": "781",
    "PRINCIPIA": "906",
    "PROBIOTICA": "891",
    "PROLIFE": "150",
    "PROMILLUS": "752",
    "PROTECT": "806",
    "QUALYBLESS": "879",
    "QUALYNUTRI": "905",
    "RANBAXY": "104",
    "RAWAMED": "833",
    "RAYOVAC": "762",
    "RILEX": "105",
    "RIOQUIMICA": "106",
    "RMS": "857",
    "SANDOZ": "108",
    "SANFARMA": "109",
    "SANOFI": "727",
    "SB COMERCIO": "926",
    "SCHUSTER": "827",
    "SOBRAL": "111",
    "SPUTNIK UNIFORMES": "823",
    "SUL CONF": "758",
    "SUNMASTER": "467",
    "SUNSTAR": "786",
    "SUPERMEDY": "797",
    "TENA": "160",
    "TEUTO": "3",
    "TORRENT": "817",
    "TOSHIBA": "914",
    "TURMA DA MONICA": "888",
    "TUTTICARE": "161",
    "UBER CIENCIA E TECNOLOGIA": "740",
    "UNILIFE": "916",
    "UNIPHAR INDUSTRIA": "822",
    "VASCONCELOS VMG FARMACEUTICA": "921",
    "VENTCARE": "815",
    "VIDORA": "116",
    "VINAGRE MONTES VERDES": "892",
    "VITA MEDICAL": "836",
    "VITAFOR": "744",
    "VITAMED": "117",
    "VITAMEDIC": "118",
    "VITAO": "925",
    "VIVER MAIS": "802",
    "VUELO": "828",
    "WESP": "119",
    "YINS": "769",
    "ZIIN ZIIN": "167",
    "ZYDUS": "168"
});

const AMBIGUOUS_SUPPLIER_GLOBAL_CODES = new Set([
    "LEGRAND",
    "NEO QUIMICA"
]);

function getSupplierGlobalId(laboratoryName) {
    const normalizedLaboratory = normalizeSupplierLookupName(
        laboratoryName
    );

    if (!normalizedLaboratory) {
        return "";
    }

    if (
        AMBIGUOUS_SUPPLIER_GLOBAL_CODES.has(
            normalizedLaboratory
        )
    ) {
        console.warn(
            "[EMAIL][RECEBIDOS][COD-GLOBAL] Indústria com mais de um código; campo deixado em branco:",
            laboratoryName
        );

        return "";
    }

    const code = SUPPLIER_GLOBAL_CODE_MAP[
        normalizedLaboratory
    ];

    if (!code) {
        console.warn(
            "[EMAIL][RECEBIDOS][COD-GLOBAL] Código global não cadastrado:",
            laboratoryName
        );

        return "";
    }

    return code;
}
function updatePricePendingStatuses(updates, processedAt) {
    const results = [];

    for (const update of updates || []) {
        try {
            const result =
                pricePendingRepository.updateEmailReceiptStatus(
                    update.industry,
                    update.branch,
                    update.column,
                    processedAt
                );

            results.push({
                success: true,
                ...result
            });
        } catch (error) {
            results.push({
                success: false,
                industry: update.industry,
                branch: update.branch,
                column: update.column,
                error: error.message
            });
        }
    }

    return results;
}

function createProcessingLog(data) {
    return receivedRepository.createProcessingLog({
        attachment_id: data.attachmentid,
        pattern_id: data.patternid || null,
        original_file_name: data.originalfilename,
        final_file_name: data.finalfilename || null,
        final_file_path: data.finalfilepath || null,
        status: data.status,
        error_message: data.errormessage || null
    });
}

function createErrorLog(attachment, error) {
    return createProcessingLog({
        attachmentid: attachment.id,
        originalfilename: getAttachmentField(
            attachment,
            [
                'originalfilename',
                'original_file_name'
            ]
        ),
        status: 'error',
        errormessage: error?.message || 'Erro desconhecido.'
    });
}

function getAttachmentField(attachment, names, fallback = '') {
    for (const name of names) {
        if (
            attachment &&
            attachment[name] !== undefined &&
            attachment[name] !== null
        ) {
            return attachment[name];
        }
    }

    return fallback;
}

function hasProcessedLog(attachmentId) {
    const database = require('../../database/connection')
        .getDatabase();

    const row = database.prepare(`
        SELECT id
        FROM email_received_processing_logs
        WHERE attachment_id = ?
          AND status = 'processed'
        LIMIT 1
    `).get(attachmentId);

    return Boolean(row);
}

function processAttachmentAutomatically(
    attachment,
    subject,
    processedAt
) {
    const originalFileName = getText(
        getAttachmentField(attachment, [
            'originalfilename',
            'original_file_name'
        ])
    );

    const storedFilePath = getText(
        getAttachmentField(attachment, [
            'storedfilepath',
            'stored_file_path'
        ])
    );

    const extension = path.extname(
        originalFileName
    ).toLowerCase();

    if (!PROCESSABLE_SPREADSHEET_EXTENSIONS.has(extension)) {
        return {
            status: 'ignored',
            reason: 'Anexo não é uma planilha Excel processável.'
        };
    }

    if (hasProcessedLog(attachment.id)) {
        return {
            status: 'skipped',
            reason: 'Anexo já processado anteriormente.'
        };
    }

    if (!fs.existsSync(storedFilePath)) {
        throw new Error(
            `Arquivo baixado não encontrado: ${storedFilePath}`
        );
    }

    const type = detectRoutineType(
        originalFileName,
        subject
    );

    if (!type) {
        return {
            status: 'ignored',
            reason:
                'Não foi possível identificar se o anexo é de preços ou pendências pelo nome do arquivo ou assunto.'
        };
    }

    const destinationFolder = type === 'precos'
        ? PRICE_DESTINATION
        : getPendingProcessedPath();

    ensureDirectory(destinationFolder);

    const processingResult = processSpreadsheet({
        filePath: storedFilePath,
        type,
        processingDate: processedAt,
        destinationFolder,
        supplierResolver: getSupplierGlobalId
    });

    if (
        !processingResult ||
        !Array.isArray(processingResult.generatedFiles) ||
        !processingResult.generatedFiles.length
    ) {
        throw new Error(
            'Nenhum arquivo padronizado foi gerado. Verifique EAN, filial e dados obrigatórios da planilha.'
        );
    }

    for (const file of processingResult.generatedFiles) {
        createProcessingLog({
            attachmentid: attachment.id,
            originalfilename: originalFileName,
            finalfilename: file.fileName,
            finalfilepath: file.filePath,
            status: 'processed'
        });
    }

    const updates = updatePricePendingStatuses(
        processingResult.updates,
        processedAt
    );

    return {
        status: 'processed',
        type,
        generatedFiles: processingResult.generatedFiles,
        ignoredRows: processingResult.ignoredRows || 0,
        updates
    };
}

async function processMessageAttachments(
    message,
    subject,
    processedAt
) {
    const attachments = listMessageAttachments(message.id);

    if (!attachments.length) {
        updateMessageStatus(message.id, 'no_attachment');

        return {
            processed: 0,
            ignored: 0,
            skipped: 0,
            errors: 0,
            generatedFiles: 0
        };
    }

    const summary = {
        processed: 0,
        ignored: 0,
        skipped: 0,
        errors: 0,
        generatedFiles: 0
    };

    for (const attachment of attachments) {
        try {
            const result = processAttachmentAutomatically(
                attachment,
                subject,
                processedAt
            );

            if (result.status === 'processed') {
                summary.processed += 1;
                summary.generatedFiles +=
                    result.generatedFiles?.length || 0;
            } else if (result.status === 'ignored') {
                summary.ignored += 1;

                createProcessingLog({
                    attachmentid: attachment.id,
                    originalfilename: getAttachmentField(
                        attachment,
                        [
                            'originalfilename',
                            'original_file_name'
                        ]
                    ),
                    status: 'ignored',
                    errormessage: result.reason
                });
            } else if (result.status === 'skipped') {
                summary.skipped += 1;
            }
        } catch (error) {
            summary.errors += 1;
            createErrorLog(attachment, error);
        }
    }

    if (summary.errors > 0) {
        updateMessageStatus(
            message.id,
            'error',
            'Um ou mais anexos apresentaram erro.'
        );
    } else if (summary.processed > 0) {
        updateMessageStatus(message.id, 'processed');
    } else {
        updateMessageStatus(message.id, 'downloaded');
    }

    return summary;
}

function buildAttachmentStoredName(
    originalFileName,
    campaignCode,
    receivedAt
) {
    const extension = path.extname(originalFileName).toLowerCase();
    const baseName = path.basename(
        originalFileName,
        extension
    );

    const safeBaseName = (
        baseName ||
        "ANEXO"
    )
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
        .replace(/\s+/g, " ")
        .trim();

    const safeCampaignCode = (
        getText(campaignCode) ||
        "ALF-SEM-CODIGO"
    )
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();

    const date = receivedAt instanceof Date &&
        !Number.isNaN(receivedAt.getTime())
        ? receivedAt
        : new Date();

    const stamp = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("") + "-" + [
        String(date.getHours()).padStart(2, "0"),
        String(date.getMinutes()).padStart(2, "0"),
        String(date.getSeconds()).padStart(2, "0")
    ].join("");

    const uniqueId = crypto.randomUUID()
        .split("-")[0]
        .toLowerCase();

    return (
        `${safeBaseName} [${safeCampaignCode}] ` +
        `${stamp}-${uniqueId}${extension}`
    );
}

async function downloadMessageAttachments(
    parsed,
    message,
    downloadDirectory,
    campaignCode
) {
    let downloaded = 0;
    let ignored = 0;

    for (const attachment of parsed.attachments || []) {
        const originalName = getText(
            attachment.filename || "anexo"
        );

        const extension = path.extname(
            originalName
        ).toLowerCase();

        if (!ALLOWED_EXTENSIONS.has(extension)) {
            ignored += 1;
            continue;
        }

        const safeName = originalName.replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            "_"
        );

        const storedName = buildAttachmentStoredName(
            safeName,
            campaignCode,
            parsed.date
        );

        const storedPath = path.join(
            downloadDirectory,
            storedName
        );

        fs.writeFileSync(
            storedPath,
            attachment.content
        );

        receivedRepository.createAttachment({
            message_id: message.id,
            original_file_name: safeName,
            stored_file_name: storedName,
            stored_file_path: storedPath,
            file_type: extension.replace(".", ""),
            file_size: toSafeNumber(
                attachment.size ||
                fs.statSync(storedPath).size,
                0
            ),
            status: "downloaded"
        });

        downloaded += 1;
    }

    return {
        downloaded,
        ignored
    };
}
function saveCampaignLink(
    messageId,
    campaignId,
    campaignCode,
    parsed
) {
    const database = require('../../database/connection')
        .getDatabase();

    database.prepare(`
        UPDATE email_received_messages
        SET
            campaign_id = ?,
            campaign_code = ?,
            sent_message_id = ?,
            in_reply_to = ?,
            refs = ?,
            updated_at = ?
        WHERE id = ?
    `).run(
        campaignId || null,
        campaignCode || null,
        getText(parsed.inReplyTo) || null,
        getText(parsed.inReplyTo) || null,
        Array.isArray(parsed.references)
            ? parsed.references.join(' ')
            : getText(parsed.references) || null,
        new Date().toISOString(),
        messageId
    );
}

function findRecipientBySender(campaignId, senderEmail) {
    if (!campaignId || !senderEmail) {
        return null;
    }

    const recipients = emailRepository.listEmailRecipients(
        campaignId
    );

    const normalizedSender = String(senderEmail)
        .trim()
        .toLowerCase();

    return recipients.find((recipient) => {
        return String(recipient.email || '')
            .trim()
            .toLowerCase() === normalizedSender;
    }) || null;
}

async function processRawImapMessage(
    raw,
    imapUid,
    config,
    downloadDirectory,
    processedAt
) {
    const parsed = await simpleParser(raw);

    const linked = findLinkedCampaign(parsed);

    if (!linked.campaign) {
        console.log(
            '[EMAIL][RECEBIDOS][IGNORADO] Sem vínculo com campanha:',
            getText(parsed.subject) || '(sem assunto)'
        );

        return {
            status: 'ignored',
            reason: 'Mensagem sem campanha vinculada.',
            downloaded: 0,
            processed: 0,
            ignored: 1,
            skipped: 0,
            errors: 0,
            generatedFiles: 0
        };
    }

    const messageUid = getStableMessageUid(
        parsed,
        imapUid,
        config.id
    );

    const result = createMessageIfNeeded({
        configid: config.id,
        messageuid: messageUid,
        messageid: getText(parsed.messageId) || null,
        senderemail: getSenderEmail(parsed.from),
        sendername: getSenderName(parsed.from),
        subject: getText(parsed.subject),
        receivedat: parsed.date
            ? parsed.date.toISOString()
            : new Date().toISOString()
    });

    if (result.alreadyExists) {
        return {
            status: 'skipped',
            reason: 'Mensagem já baixada anteriormente.',
            downloaded: 0,
            processed: 0,
            ignored: 0,
            skipped: 1,
            errors: 0,
            generatedFiles: 0,
            campaignId: linked.campaign.id,
            campaignCode: linked.campaignCode
        };
    }

    const message = result.message;

    saveCampaignLink(
        message.id,
        linked.campaign.id,
        linked.campaignCode ||
            linked.campaign.campaign_code ||
            null,
        parsed
    );

    const downloadResult = await downloadMessageAttachments(
        parsed,
        message,
        downloadDirectory,
        linked.campaignCode ||
            linked.campaign.campaign_code ||
            null
    );

    if (!downloadResult.downloaded) {
        updateMessageStatus(message.id, 'no_attachment');

        return {
            status: 'noattachment',
            downloaded: 0,
            processed: 0,
            ignored: downloadResult.ignored,
            skipped: 0,
            errors: 0,
            generatedFiles: 0,
            campaignId: linked.campaign.id,
            campaignCode: linked.campaignCode
        };
    }

    updateMessageStatus(message.id, 'downloaded');

    const processResult = await processMessageAttachments(
        message,
        getText(parsed.subject),
        processedAt
    );

    const recipient = findRecipientBySender(
        linked.campaign.id,
        getSenderEmail(parsed.from)
    );

    if (recipient) {
        emailRepository.updateEmailRecipientStatus(
            recipient.id,
            'replied'
        );
    }

    return {
        status: 'processed',
        downloaded: downloadResult.downloaded,
        processed: processResult.processed,
        ignored:
            downloadResult.ignored +
            processResult.ignored,
        skipped: processResult.skipped,
        errors: processResult.errors,
        generatedFiles: processResult.generatedFiles,
        campaignId: linked.campaign.id,
        campaignCode: linked.campaignCode,
        linkedBy: linked.linkedBy
    };
}

function runImapRoutineForConfig(config, processedAt) {
    const downloadDirectory = getReceivedDirectory();
    const imap = new Imap(getImapConfig(config));

    return new Promise((resolve, reject) => {
        let settled = false;

        const summary = {
            configId: config.id,
            configName: config.name || config.fromemail || config.id,
            messagesFound: 0,
            messagesNew: 0,
            messagesSkipped: 0,
            attachmentsDownloaded: 0,
            attachmentsProcessed: 0,
            attachmentsIgnored: 0,
            attachmentsSkipped: 0,
            errors: 0,
            generatedFiles: 0,
            details: []
        };

        function finish(error) {
            if (settled) {
                return;
            }

            settled = true;

            if (error) {
                reject(error);
            } else {
                resolve(summary);
            }
        }

        function addResultToSummary(item) {
            summary.details.push(item);

            if (item.status === 'skipped') {
                summary.messagesSkipped += 1;
            } else if (item.status !== 'ignored') {
                summary.messagesNew += 1;
            }

            summary.attachmentsDownloaded +=
                toSafeNumber(item.downloaded, 0);

            summary.attachmentsProcessed +=
                toSafeNumber(item.processed, 0);

            summary.attachmentsIgnored +=
                toSafeNumber(item.ignored, 0);

            summary.attachmentsSkipped +=
                toSafeNumber(item.skipped, 0);

            summary.errors +=
                toSafeNumber(item.errors, 0);

            summary.generatedFiles +=
                toSafeNumber(item.generatedFiles, 0);
        }

        function formatImapDate(date) {
            const months = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec'
            ];

            return (
                String(date.getDate()).padStart(2, '0') +
                '-' +
                months[date.getMonth()] +
                '-' +
                date.getFullYear()
            );
        }

        function getHeaderValue(headers, name) {
            const pattern = new RegExp(
                '^' + name + ':\\s*(.*)$',
                'im'
            );

            return (
                String(headers || '')
                    .replace(/\r\n[ \t]+/g, ' ')
                    .match(pattern)?.[1] || ''
            ).trim();
        }

        function fetchFullMessages(uids) {
            if (!uids.length) {
                imap.end();
                finish();
                return;
            }

            const tasks = [];
            const fetch = imap.fetch(uids, {
                bodies: '',
                markSeen: false
            });

            fetch.on('message', (message, sequenceNumber) => {
                let raw = Buffer.alloc(0);
                let imapUid = sequenceNumber;

                message.once('attributes', (attributes) => {
                    if (attributes?.uid) {
                        imapUid = attributes.uid;
                    }
                });

                message.on('body', (stream) => {
                    stream.on('data', (chunk) => {
                        raw = Buffer.concat([
                            raw,
                            Buffer.from(chunk)
                        ]);
                    });
                });

                message.once('end', () => {
                    const task = processRawImapMessage(
                        raw,
                        imapUid,
                        config,
                        downloadDirectory,
                        processedAt
                    ).catch((error) => {
                        console.error(
                            '[EMAIL][RECEBIDOS] Erro na UID ' +
                            imapUid +
                            ':',
                            error.message
                        );

                        return {
                            status: 'error',
                            reason: error.message,
                            downloaded: 0,
                            processed: 0,
                            ignored: 0,
                            skipped: 0,
                            errors: 1,
                            generatedFiles: 0,
                            imapUid
                        };
                    });

                    tasks.push(task);
                });
            });

            fetch.once('error', (error) => {
                imap.end();
                finish(error);
            });

            fetch.once('end', async () => {
                try {
                    const results = await Promise.all(tasks);

                    for (const item of results) {
                        addResultToSummary(item);
                    }

                    imap.end();
                    finish();
                } catch (error) {
                    imap.end();
                    finish(error);
                }
            });
        }

        imap.once('ready', () => {
            imap.openBox('INBOX', false, (openError) => {
                if (openError) {
                    finish(openError);
                    return;
                }

                const sinceDate = new Date();
                sinceDate.setDate(
                    sinceDate.getDate() - 7
                );

                imap.search(
                    [
                        ['SINCE', formatImapDate(sinceDate)]
                    ],
                    (searchError, recentUids) => {
                        if (searchError) {
                            finish(searchError);
                            return;
                        }

                        if (!recentUids?.length) {
                            imap.end();
                            finish();
                            return;
                        }

                        const headerFetch = imap.fetch(
                            recentUids,
                            {
                                bodies:
                                    'HEADER.FIELDS (SUBJECT MESSAGE-ID IN-REPLY-TO REFERENCES)',
                                markSeen: false
                            }
                        );

                        const matchedUids = [];

                        headerFetch.on(
                            'message',
                            (message, sequenceNumber) => {
                                let headers = '';
                                let imapUid = sequenceNumber;

                                message.once(
                                    'attributes',
                                    (attributes) => {
                                        if (attributes?.uid) {
                                            imapUid =
                                                attributes.uid;
                                        }
                                    }
                                );

                                message.on(
                                    'body',
                                    (stream) => {
                                        stream.on(
                                            'data',
                                            (chunk) => {
                                                headers +=
                                                    chunk.toString(
                                                        'utf8'
                                                    );
                                            }
                                        );
                                    }
                                );

                                message.once('end', () => {
                                    const subject =
                                        getHeaderValue(
                                            headers,
                                            'subject'
                                        );

                                    if (
                                        /\[ALF-[A-Z0-9]{6}\]/i.test(
                                            subject
                                        )
                                    ) {
                                        matchedUids.push(
                                            imapUid
                                        );
                                    }
                                });
                            }
                        );

                        headerFetch.once('error', (error) => {
                            imap.end();
                            finish(error);
                        });

                        headerFetch.once('end', () => {
                            summary.messagesFound =
                                matchedUids.length;

                            fetchFullMessages(matchedUids);
                        });
                    }
                );
            });
        });

        imap.once('error', finish);
        imap.connect();
    });
}

async function runEmailRoutine() {
    const processedAt = new Date();

    const configs = emailRepository
        .listEmailConfigs()
        .filter((config) => {
            const host = getConfigValue(config, [
                'imaphost',
                'imap_host'
            ]);

            const user = getConfigValue(config, [
                'imapuser',
                'imap_user'
            ]);

            return Boolean(host && user);
        });

    if (!configs.length) {
        throw new Error(
            'Nenhuma configuração IMAP válida foi encontrada. Cadastre uma conta em Configurações > E-mail.'
        );
    }

    const total = {
        executedAt: processedAt.toISOString(),
        accounts: configs.length,
        messagesFound: 0,
        messagesNew: 0,
        messagesSkipped: 0,
        attachmentsDownloaded: 0,
        attachmentsProcessed: 0,
        attachmentsIgnored: 0,
        attachmentsSkipped: 0,
        errors: 0,
        generatedFiles: 0,
        accountResults: []
    };

    for (const config of configs) {
        try {
            const result = await runImapRoutineForConfig(
                config,
                processedAt
            );

            total.accountResults.push(result);

            total.messagesFound += result.messagesFound;
            total.messagesNew += result.messagesNew;
            total.messagesSkipped += result.messagesSkipped;
            total.attachmentsDownloaded +=
                result.attachmentsDownloaded;
            total.attachmentsProcessed +=
                result.attachmentsProcessed;
            total.attachmentsIgnored +=
                result.attachmentsIgnored;
            total.attachmentsSkipped +=
                result.attachmentsSkipped;
            total.errors += result.errors;
            total.generatedFiles += result.generatedFiles;
        } catch (error) {
            const errorMessage =
                error?.message ||
                String(error || 'Erro desconhecido na rotina IMAP.');

            console.error(
                '[EMAIL][RECEBIDOS][IMAP] Erro na conta:',
                config.name || config.fromemail || config.id,
                errorMessage
            );

            total.errors += 1;

            total.accountResults.push({
                configId: config.id,
                configName:
                    config.name ||
                    config.fromemail ||
                    config.id,
                messagesFound: 0,
                messagesNew: 0,
                messagesSkipped: 0,
                attachmentsDownloaded: 0,
                attachmentsProcessed: 0,
                attachmentsIgnored: 0,
                attachmentsSkipped: 0,
                errors: 1,
                generatedFiles: 0,
                details: [],
                error: errorMessage
            });
        }
    }

    return total;
}

function listMessages() {
    return receivedRepository.listMessages();
}

function listAttachments(messageId) {
    return receivedRepository.listAttachments(messageId);
}

function listPatterns() {
    return receivedRepository.listPatterns();
}

function createPattern(data) {
    return receivedRepository.createPattern(data);
}

function deletePattern(id) {
    return receivedRepository.deletePattern(id);
}

function getDashboard() {
    return receivedRepository.getDashboard();
}

function listProcessingLogs() {
    return receivedRepository.listProcessingLogs();
}

async function fetchReceivedEmails(configId) {
    if (!configId) {
        throw new Error('Selecione uma configuração IMAP.');
    }

    const config = emailRepository.getEmailConfigById(configId);

    if (!config) {
        throw new Error('Configuração IMAP não encontrada.');
    }

    return runImapRoutineForConfig(
        config,
        new Date()
    );
}

function normalizeManualType(value) {
    const normalized = normalizeText(value);

    if (normalized.includes('PENDENC')) {
        return 'pendencias';
    }

    return 'precos';
}

async function processAttachments(data = {}) {
    const messageId = getText(data.messageId);

    if (!messageId) {
        throw new Error('Selecione uma mensagem para processar.');
    }

    const database = require('../../database/connection')
        .getDatabase();

    const message = database.prepare(`
        SELECT *
        FROM email_received_messages
        WHERE id = ?
        LIMIT 1
    `).get(messageId);

    if (!message) {
        throw new Error('Mensagem recebida não encontrada.');
    }

    const attachments = listMessageAttachments(message.id);

    if (!attachments.length) {
        throw new Error('A mensagem não possui anexos.');
    }

    const processedAt = new Date();
    let processed = 0;
    let ignored = 0;
    let skipped = 0;
    let errors = 0;
    let generatedFiles = 0;

    for (const attachment of attachments) {
        try {
            const original = getAttachmentField(
                attachment,
                [
                    'originalfilename',
                    'original_file_name'
                ]
            );

            const result = processAttachmentAutomatically(
                {
                    ...attachment,
                    originalfilename: original
                },
                `${message.subject || ''} ${normalizeManualType(data.type)}`,
                processedAt
            );

            if (result.status === 'processed') {
                processed += 1;
                generatedFiles +=
                    result.generatedFiles?.length || 0;
            } else if (result.status === 'ignored') {
                ignored += 1;
            } else if (result.status === 'skipped') {
                skipped += 1;
            }
        } catch (error) {
            errors += 1;
            createErrorLog(attachment, error);
        }
    }

    updateMessageStatus(
        message.id,
        errors
            ? 'error'
            : processed
                ? 'processed'
                : 'downloaded',
        errors
            ? 'Um ou mais anexos apresentaram erro.'
            : null
    );

    return {
        messageId,
        processedAt: processedAt.toISOString(),
        results: {
            processed,
            ignored,
            skipped,
            errors,
            generatedFiles
        }
    };
}

function openFolder(folderType) {
    const { shell } = require('electron');

    const folders = {
        originais: getReceivedDirectory(),
        recebidos: getReceivedDirectory(),
        pendencias: getPendingProcessedPath(),
        precos: PRICE_DESTINATION
    };

    const destination = folders[String(folderType || '').trim()];

    if (!destination) {
        throw new Error('Pasta solicitada não permitida.');
    }

    ensureDirectory(destination);

    return shell.openPath(destination).then((result) => {
        if (result) {
            throw new Error(
                `Não foi possível abrir a pasta: ${destination}`
            );
        }

        return {
            success: true,
            folderType,
            path: destination
        };
    });
}

module.exports = {
    listMessages,
    listAttachments,
    listPatterns,
    createPattern,
    deletePattern,
    getDashboard,
    listProcessingLogs,
    fetchReceivedEmails,
    processAttachments,
    openFolder,
    runEmailRoutine,

    // Exportação temporária para testar uma única UID IMAP.
    processRawImapMessage
};












