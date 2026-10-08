function getApi() {
    if (!window.alfadime?.email) {
        throw new Error('API de e-mail nÃÂ£o disponÃÂ­vel. Reinicie o aplicativo.');
    }

    return window.alfadime.email;
}

// ==================== CONFIGS ====================

export function listEmailConfigs() {
    return getApi().configs.list();
}

export function getEmailConfigById(id) {
    return getApi().configs.getById(id);
}

export function createEmailConfig(data) {
    return getApi().configs.create(data);
}

export function updateEmailConfig(id, data) {
    return getApi().configs.update(id, data);
}

export function deleteEmailConfig(id) {
    return getApi().configs.delete(id);
}

export function testSmtpConnection(data) {
    return getApi().configs.testSmtp(data);
}

export function testImapConnection(data) {
    return getApi().configs.testImap(data);
}

// ==================== CAMPAIGNS ====================

export function listEmailCampaigns() {
    return getApi().campaigns.list();
}

export function getEmailCampaignById(id) {
    return getApi().campaigns.getById(id);
}

export function createEmailCampaign(data) {
    return getApi().campaigns.create(data);
}

export function updateEmailCampaign(id, data) {
    return getApi().campaigns.update(id, data);
}

export function deleteEmailCampaign(id) {
    return getApi().campaigns.delete(id);
}

export function sendEmailCampaign(campaignId, options) {
    return getApi().campaigns.send(campaignId, options);
}

export function processIncomingEmails(campaignId) {
    return getApi().campaigns.processIncoming(campaignId);
}

export function getCampaignDashboard(campaignId) {
    return getApi().campaigns.getDashboard(campaignId);
}

export function getCampaignHistory(campaignId) {
    return getApi().campaigns.getHistory(campaignId);
}

export function getCampaignSendLogs(campaignId) {
    return getApi().campaigns.getSendLogs(campaignId);
}

// ==================== RECIPIENTS ====================

export function listEmailRecipients(campaignId) {
    return getApi().recipients.list(campaignId);
}

export function getEmailRecipientById(id) {
    return getApi().recipients.getById(id);
}

export function createEmailRecipient(data) {
    return getApi().recipients.create(data);
}

export function createEmailRecipientsBatch(campaignId, data) {
    return getApi().recipients.createBatch(campaignId, data);
}

export function deleteEmailRecipient(id) {
    return getApi().recipients.delete(id);
}

// ==================== ATTACHMENTS ====================

export function listCampaignAttachments(campaignId) {
    return getApi().attachments.list(String(campaignId || ''));
}

export function selectAndSaveCampaignAttachments(campaignId) {
    return getApi().attachments.selectAndSave(String(campaignId || ''));
}

export function removeCampaignAttachment(attachmentId) {
    return getApi().attachments.remove(String(attachmentId || ''));
}



export function listReceivedMessages() {
    return getApi().received.listMessages();
}

export function listReceivedAttachments(messageId) {
    return getApi().received.listAttachments(messageId);
}

export function fetchReceivedEmails(configId) {
    return getApi().received.fetch(configId);
}

export function processReceivedAttachments(data) {
    return getApi().received.process(data);
}

export function getReceivedDashboard() {
    return getApi().received.dashboard();
}

export function listReceivedProcessingLogs() {
    return getApi().received.listLogs();
}

export function listReceivedPatterns() {
    return getApi().received.listPatterns();
}

export function createReceivedPattern(data) {
    return getApi().received.createPattern(data);
}

export function deleteReceivedPattern(id) {
    return getApi().received.deletePattern(id);
}


export function openReceivedFolder(folderType) {
    return getApi().received.openFolder(folderType);
}