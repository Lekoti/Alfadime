/**
 * IPC do módulo de e-mail.
 * Canais expostos para o frontend.
 */

const { ipcMain } = require('electron');
const service = require('./email-dispatch.service');
const { testSmtpConnection } = require('./email-dispatch-smtp.service');
const { testImapConnection } = require('./email-dispatch-imap.service');
const {
    getDatabaseInfo,
    listCampaignAttachments,
    selectAndSaveCampaignAttachments,
    removeCampaignAttachment
} = require('./email-dispatch-attachments.service');

let registered = false;

function registerEmailDispatchIpc() {
    if (registered) {
        return;
    }
    registered = true;

    // ==================== CONFIGS ====================

    ipcMain.handle('email-configs:list', () => {
        return service.listConfigs();
    });

    ipcMain.handle('email-configs:get-by-id', (event, id) => {
        return service.getConfigById(id);
    });

    ipcMain.handle('email-configs:create', (event, data) => {
        return service.createConfig(data);
    });

    ipcMain.handle('email-configs:update', (event, id, data) => {
        return service.updateConfig(id, data);
    });

    ipcMain.handle('email-configs:delete', (event, id) => {
        return service.deleteConfig(id);
    });

    ipcMain.handle('email-configs:test-smtp', (event, data) => {
        return testSmtpConnection(data);
    });

    ipcMain.handle('email-configs:test-imap', (event, data) => {
        return testImapConnection(data);
    });

    // ==================== CAMPAIGNS ====================

    ipcMain.handle('email-campaigns:list', () => {
        return service.listCampaigns();
    });

    ipcMain.handle('email-campaigns:get-by-id', (event, id) => {
        return service.getCampaignById(id);
    });

    ipcMain.handle('email-campaigns:create', (event, data) => {
        return service.createCampaign(data);
    });

    ipcMain.handle('email-campaigns:update', (event, id, data) => {
        return service.updateCampaign(id, data);
    });

    ipcMain.handle('email-campaigns:delete', (event, id) => {
        return service.deleteCampaign(id);
    });


    // ==================== ATTACHMENTS, DASHBOARD AND HISTORY ====================

    ipcMain.handle('email-campaign-attachments:list', (event, campaignId) => {
        console.log('[EMAIL][ATTACHMENTS][LIST]', {
            campaignId,
            type: typeof campaignId
        });

        return service.listCampaignAttachments(String(campaignId || ''));
    });

    ipcMain.handle('email-campaign-attachments:select-and-save', async (event, campaignId) => {
        console.log('[EMAIL][ATTACHMENTS][SELECT]', {
            campaignId,
            type: typeof campaignId
        });

        const normalizedCampaignId = String(campaignId || '').trim();

        if (!normalizedCampaignId) {
            throw new Error('ID da campanha vazio ao selecionar anexo.');
        }

        const result = await selectAndSaveCampaignAttachments(
            normalizedCampaignId
        );

        console.log('[EMAIL][ATTACHMENTS][SAVED]', {
            campaignId: normalizedCampaignId,
            addedCount: result?.added_count || 0,
            total: result?.attachments?.length || 0
        });

        return result;
    });

    ipcMain.handle('email-campaign-attachments:remove', (event, attachmentId) => {
        return removeCampaignAttachment(String(attachmentId || ''));
    });

    ipcMain.handle('email-campaigns:dashboard', (event, campaignId) => {
        return service.getCampaignDashboard(campaignId);
    });

    ipcMain.handle('email-campaigns:history', (event, campaignId) => {
        return service.listCampaignHistory(campaignId);
    });

    ipcMain.handle('email-campaigns:send-logs', (event, campaignId) => {
        return service.listCampaignSendLogs(campaignId);
    });


    ipcMain.handle('email-campaign-attachments:database-info', () => {
        return getDatabaseInfo();
    });

    // ==================== RECIPIENTS ====================

    ipcMain.handle('email-recipients:list', (event, campaignId) => {
        return service.listRecipients(campaignId);
    });

    ipcMain.handle('email-recipients:get-by-id', (event, id) => {
        return service.getRecipientById(id);
    });

    ipcMain.handle('email-recipients:create', (event, data) => {
        return service.createRecipient(data);
    });

    ipcMain.handle('email-recipients:create-batch', (event, campaignId, recipientsData) => {
        return service.createRecipientsBatch(campaignId, recipientsData);
    });

    ipcMain.handle('email-recipients:delete', (event, id) => {
        return service.deleteRecipient(id);
    });

    // ==================== SEND CAMPAIGN ====================

    ipcMain.handle('email-campaigns:send', async (event, campaignId, options = {}) => {
        return service.sendCampaign(campaignId, options);
    });

    // ==================== PROCESS INCOMING ====================

    ipcMain.handle('email-campaigns:process-incoming', async (event, campaignId) => {
        return service.processIncoming(campaignId);
    });

    // ==================== PROCESSOR (BACKGROUND) ====================
    // O processador único é iniciado e encerrado pelo main.js.
    // Estes canais permanecem por compatibilidade com o frontend.

    ipcMain.handle('email-processor:start', () => {
        return {
            success: true,
            managedByMainProcess: true,
            message: 'O processador de e-mails já é gerenciado pelo aplicativo.'
        };
    });

    ipcMain.handle('email-processor:stop', () => {
        return {
            success: false,
            managedByMainProcess: true,
            message: 'O processador só é encerrado ao fechar o aplicativo.'
        };
    });
}

module.exports = {
    registerEmailDispatchIpc
};





