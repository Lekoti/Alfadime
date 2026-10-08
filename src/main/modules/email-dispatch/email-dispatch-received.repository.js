const crypto = require('node:crypto');
const { getDatabase } = require('../../database/connection');
const { toSafeNumber } = require('../../utils/validation.utils');

function ensureTables() {
    const database = getDatabase();
    return database;
}

function listMessages() {
    const database = ensureTables();
    return database.prepare(`
        SELECT * FROM email_received_messages
        ORDER BY received_at DESC, created_at DESC
    `).all();
}

function getMessageById(id) {
    const database = ensureTables();
    return database.prepare(`
        SELECT * FROM email_received_messages WHERE id = ? LIMIT 1
    `).get(id);
}

function listAttachments(messageId) {
    const database = ensureTables();
    return database.prepare(`
        SELECT * FROM email_received_attachments
        WHERE message_id = ? ORDER BY created_at ASC
    `).all(messageId);
}

function listPatterns() {
    const database = ensureTables();
    return database.prepare(`
        SELECT * FROM email_received_patterns
        ORDER BY enabled DESC, name ASC
    `).all();
}

function createPattern(data) {
    const database = ensureTables();
    const now = new Date().toISOString();

    const pattern = {
        id: crypto.randomUUID(),
        name: String(data.name || '').trim(),
        description: data.description ? String(data.description) : null,
        subject_contains: data.subject_contains ? String(data.subject_contains) : null,
        sender_contains: data.sender_contains ? String(data.sender_contains) : null,
        source_extension: data.source_extension
            ? String(data.source_extension).replace('.', '').toLowerCase()
            : null,
        target_extension: data.target_extension
            ? String(data.target_extension).replace('.', '').toLowerCase()
            : null,
        file_name_template: String(data.file_name_template || '{{nome_original}}_{{data}}'),
        destination_folder: data.destination_folder ? String(data.destination_folder) : null,
        enabled: data.enabled === false ? 0 : 1,
        created_at: now,
        updated_at: now
    };

    if (!pattern.name) {
        throw new Error('Informe o nome do padrão.');
    }

    database.prepare(`
        INSERT INTO email_received_patterns (
            id, name, description, subject_contains, sender_contains,
            source_extension, target_extension, file_name_template,
            destination_folder, enabled, created_at, updated_at
        ) VALUES (
            @id, @name, @description, @subject_contains, @sender_contains,
            @source_extension, @target_extension, @file_name_template,
            @destination_folder, @enabled, @created_at, @updated_at
        )
    `).run(pattern);

    return database.prepare(`
        SELECT * FROM email_received_patterns WHERE id = ?
    `).get(pattern.id);
}

function deletePattern(id) {
    const database = ensureTables();
    const result = database.prepare(`
        DELETE FROM email_received_patterns WHERE id = ?
    `).run(id);

    if (!result.changes) {
        throw new Error('Padrão não encontrado.');
    }

    return { success: true, id };
}

function createMessage(data) {
    const database = ensureTables();
    const now = new Date().toISOString();

    const existing = database.prepare(`
        SELECT * FROM email_received_messages
        WHERE config_id IS ? AND message_uid = ?
        LIMIT 1
    `).get(data.config_id || null, String(data.message_uid));

    if (existing) {
        return existing;
    }

    const message = {
        id: crypto.randomUUID(),
        config_id: data.config_id || null,
        message_uid: String(data.message_uid),
        message_id: data.message_id || null,
        sender_email: data.sender_email || null,
        sender_name: data.sender_name || null,
        subject: data.subject || null,
        received_at: data.received_at || now,
        status: 'new',
        error_message: null,
        created_at: now,
        updated_at: now
    };

    database.prepare(`
        INSERT INTO email_received_messages (
            id, config_id, message_uid, message_id, sender_email, sender_name,
            subject, received_at, status, error_message, created_at, updated_at
        ) VALUES (
            @id, @config_id, @message_uid, @message_id, @sender_email, @sender_name,
            @subject, @received_at, @status, @error_message, @created_at, @updated_at
        )
    `).run(message);

    return message;
}

function createAttachment(data) {
    const database = ensureTables();
    const now = new Date().toISOString();

    const attachment = {
        id: crypto.randomUUID(),
        message_id: String(data.message_id),
        original_file_name: String(data.original_file_name || 'anexo'),
        stored_file_name: String(data.stored_file_name || ''),
        stored_file_path: String(data.stored_file_path || ''),
        file_type: data.file_type ? String(data.file_type) : null,
        file_size: toSafeNumber(data.file_size, 0),
        status: data.status || 'downloaded',
        error_message: data.error_message || null,
        created_at: now,
        updated_at: now
    };

    database.prepare(`
        INSERT INTO email_received_attachments (
            id, message_id, original_file_name, stored_file_name, stored_file_path,
            file_type, file_size, status, error_message, created_at, updated_at
        ) VALUES (
            @id, @message_id, @original_file_name, @stored_file_name, @stored_file_path,
            @file_type, @file_size, @status, @error_message, @created_at, @updated_at
        )
    `).run(attachment);

    return attachment;
}

function updateMessageStatus(id, status, errorMessage) {
    const database = ensureTables();

    database.prepare(`
        UPDATE email_received_messages
        SET status = ?, error_message = ?, updated_at = ?
        WHERE id = ?
    `).run(status, errorMessage || null, new Date().toISOString(), id);

    return getMessageById(id);
}

function createProcessingLog(data) {
    const database = ensureTables();

    const log = {
        id: crypto.randomUUID(),
        attachment_id: String(data.attachment_id),
        pattern_id: data.pattern_id || null,
        original_file_name: data.original_file_name || null,
        final_file_name: data.final_file_name || null,
        final_file_path: data.final_file_path || null,
        status: data.status || 'processed',
        error_message: data.error_message || null,
        processed_at: new Date().toISOString()
    };

    database.prepare(`
        INSERT INTO email_received_processing_logs (
            id, attachment_id, pattern_id, original_file_name,
            final_file_name, final_file_path, status, error_message, processed_at
        ) VALUES (
            @id, @attachment_id, @pattern_id, @original_file_name,
            @final_file_name, @final_file_path, @status, @error_message, @processed_at
        )
    `).run(log);

    return log;
}

function listProcessingLogs() {
    const database = ensureTables();

    return database.prepare(`
        SELECT
            logs.*,
            messages.sender_email,
            messages.subject
        FROM email_received_processing_logs logs
        LEFT JOIN email_received_attachments attachments
            ON attachments.id = logs.attachment_id
        LEFT JOIN email_received_messages messages
            ON messages.id = attachments.message_id
        ORDER BY logs.processed_at DESC
    `).all();
}

function getDashboard() {
    const database = ensureTables();

    const messageTotals = database.prepare(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
            SUM(CASE WHEN status = 'downloaded' THEN 1 ELSE 0 END) AS downloaded,
            SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) AS processed,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
        FROM email_received_messages
    `).get();

    const attachmentTotals = database.prepare(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'downloaded' THEN 1 ELSE 0 END) AS downloaded,
            SUM(CASE WHEN status = 'processed' THEN 1 ELSE 0 END) AS processed,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
        FROM email_received_attachments
    `).get();

    return {
        messages: {
            total: toSafeNumber(messageTotals.total, 0),
            new: toSafeNumber(messageTotals.new_count, 0),
            downloaded: toSafeNumber(messageTotals.downloaded, 0),
            processed: toSafeNumber(messageTotals.processed, 0),
            errors: toSafeNumber(messageTotals.errors, 0)
        },
        attachments: {
            total: toSafeNumber(attachmentTotals.total, 0),
            downloaded: toSafeNumber(attachmentTotals.downloaded, 0),
            processed: toSafeNumber(attachmentTotals.processed, 0),
            errors: toSafeNumber(attachmentTotals.errors, 0)
        }
    };
}

module.exports = {
    ensureTables,
    listMessages,
    getMessageById,
    listAttachments,
    listPatterns,
    createPattern,
    deletePattern,
    createMessage,
    createAttachment,
    updateMessageStatus,
    createProcessingLog,
    listProcessingLogs,
    getDashboard
};
