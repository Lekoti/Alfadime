const {
    contextBridge,
    ipcRenderer
} = require(
    "electron"
);


function invoke(
    channel,
    ...args
) {
    return ipcRenderer.invoke(
        channel,
        ...args
    );
}


function subscribe(
    channel,
    callback
) {
    const listener =
        (
            _event,
            data
        ) =>
            callback(
                data
            );

    ipcRenderer.on(
        channel,
        listener
    );

    return () =>
        ipcRenderer.removeListener(
            channel,
            listener
        );
}


contextBridge.exposeInMainWorld(
    "alfadime",
    {
        auth: {
    login: (
        username,
        password,
        isPersistent
    ) =>
        invoke(
            "auth:login",
            {
                username,
                password,
                isPersistent
            }
        ),


    register: (payload) =>
        invoke(
            "auth:register",
            payload
        ),

            logout: () =>
                invoke(
                    "auth:logout"
                ),

            getCurrentSession: () =>
                invoke(
                    "auth:get_current_session"
                ),

            getComputerId: () =>
                invoke(
                    "auth:get_computer_id"
                ),

            validateSession: () =>
                invoke(
                    "auth:validate_session"
                ),

            updateLastAccess: () =>
                invoke(
                    "auth:update_last_access"
                )
        },

        users: {
            list: () =>
                invoke(
                    "users:list"
                ),

            create: (data) =>
                invoke(
                    "users:create",
                    data
                ),

            update: (id, data) =>
                invoke(
                    "users:update",
                    id,
                    data
                ),

            setActive: (id, isActive) =>
                invoke(
                    "users:set-active",
                    id,
                    isActive
                ),

            listPermissions: () =>
                invoke(
                    "users:list-permissions"
                )
        },

        permissions: {
    listModules: () =>
        invoke(
            "permissions:list-modules"
        ),

    listFunctions: (moduleKey) =>
        invoke(
            "permissions:list-functions",
            moduleKey
        ),

    getForUser: (userId) =>
        invoke(
            "permissions:get-for-user",
            userId
        ),

    getForRole: (role) =>
        invoke(
            "permissions:get-for-role",
            role
        ),

    save: (payload) =>
        invoke(
            "permissions:save",
            payload
        ),

    clearUserOverrides: (userId) =>
        invoke(
            "permissions:clear-user-overrides",
            userId
        )
},

        app: {
            getVersion: () =>
                invoke(
                    "app:get-version"
                ),

            getOpenAtLogin: () =>
                invoke(
                    "app:get-open-at-login"
                ),

            setOpenAtLogin: (
                enabled
            ) =>
                invoke(
                    "app:set-open-at-login",
                    enabled
                ),

            checkForUpdates: () =>
                invoke(
                    "app:check-for-updates"
                ),

            downloadUpdate: () =>
                invoke(
                    "app:download-update"
                ),

            installUpdate: () =>
                invoke(
                    "app:install-update"
                ),

            isUpdateDownloaded: () =>
                invoke(
                    "app:is-update-downloaded"
                ),

            onUpdateStatus: (
                callback
            ) =>
                subscribe(
                    "app:update-status",
                    callback
                )
        },

        pricePending: {
            list: () =>
                invoke(
                    "price-pending:list"
                ),

            getById: (
                id
            ) =>
                invoke(
                    "price-pending:get-by-id",
                    id
                ),

            create: (
                data
            ) =>
                invoke(
                    "price-pending:create",
                    data
                ),

            updateCell: (
                id,
                column,
                value
            ) =>
                invoke(
                    "price-pending:update-cell",
                    {
                        id,
                        column,
                        value
                    }
                ),

            remove: (
                id
            ) =>
                invoke(
                    "price-pending:remove",
                    id
                ),

            updateEmailReceipt: (
                payload
            ) =>
                invoke(
                    "price-pending:update-email-receipt",
                    payload
                ),

            refresh: () =>
                invoke(
                    "price-pending:refresh"
                ),

            export: (
                options
            ) =>
                invoke(
                    "price-pending:export",
                    options
                ),

            getDbConfig: () =>
                invoke(
                    "price-pending:get-db-config"
                ),

            saveDbConfig: (
                config
            ) =>
                invoke(
                    "price-pending:save-db-config",
                    config
                ),

            testConnection: (
                path
            ) =>
                invoke(
                    "price-pending:test-connection",
                    path
                ),

            getFoldersConfig: () =>
                invoke(
                    "price-pending:get-folders-config"
                ),

            saveFoldersConfig: (
                config
            ) =>
                invoke(
                    "price-pending:save-folders-config",
                    config
                ),

            onChanged: (
                callback
            ) =>
                subscribe(
                    "price-pending:changed",
                    callback
                )
        },

        products: {
            list: (
                filters
            ) =>
                invoke(
                    "products:list",
                    filters
                ),

            getFilterOptions: (
                field
            ) =>
                invoke(
                    "products:get-filter-options",
                    field
                ),

            syncExcel: () =>
                invoke(
                    "products:sync-excel"
                ),

            onChanged: (
                callback
            ) =>
                subscribe(
                    "products:changed",
                    callback
                )
        },

        industryContacts: {
            list: () =>
                invoke(
                    "industry-contacts:list"
                ),

            listWithoutContact: () =>
                invoke(
                    "industry-contacts:without-contact"
                ),

            save: (
                data
            ) =>
                invoke(
                    "industry-contacts:save",
                    data
                ),

            delete: (
                id
            ) =>
                invoke(
                    "industry-contacts:delete",
                    id
                ),

            prepareCharge: (
                payload
            ) =>
                invoke(
                    "industry-contacts:prepare-charge",
                    payload
                ),

            sendCharge: (
                payload
            ) =>
                invoke(
                    "industry-contacts:send-charge",
                    payload
                ),

            getDbConfig: () =>
                invoke(
                    "industry-contacts:get-db-config"
                ),

            saveDbConfig: (
                config
            ) =>
                invoke(
                    "industry-contacts:save-db-config",
                    config
                ),

            testConnection: (
                path
            ) =>
                invoke(
                    "industry-contacts:test-connection",
                    path
                )
        },

        notifications: {
            list: (
                filters
            ) =>
                invoke(
                    "notifications:list",
                    filters
                ),

            getById: (
                id
            ) =>
                invoke(
                    "notifications:get-by-id",
                    id
                ),

            create: (
                data
            ) =>
                invoke(
                    "notifications:create",
                    data
                ),

            markAsRead: (
                id
            ) =>
                invoke(
                    "notifications:mark-as-read",
                    id
                ),

            dismiss: (
                id
            ) =>
                invoke(
                    "notifications:dismiss",
                    id
                ),

            updateStatus: (
                payload
            ) =>
                invoke(
                    "notifications:update-status",
                    payload
                ),

            delete: (
                id
            ) =>
                invoke(
                    "notifications:delete",
                    id
                ),

            summary: (
                filters
            ) =>
                invoke(
                    "notifications:summary",
                    filters
                )
        },

        productAudit: {
            list: (
                filters
            ) =>
                invoke(
                    "product-audit:list",
                    filters
                ),

            getFilterOptions: (
                field
            ) =>
                invoke(
                    "product-audit:filter-options",
                    field
                )
        },

        productCorrections: {
            list: (
                filters
            ) =>
                invoke(
                    "product-corrections:list",
                    filters
                ),

            getFilterOptions: () =>
                invoke(
                    "product-corrections:filter-options"
                ),

            create: (
                data
            ) =>
                invoke(
                    "product-corrections:create",
                    data
                ),

            cancel: (
                id
            ) =>
                invoke(
                    "product-corrections:cancel",
                    id
                ),

            cancelMany: (
                ids
            ) =>
                invoke(
                    "product-corrections:cancel-many",
                    ids
                ),

            revert: (
                id
            ) =>
                invoke(
                    "product-corrections:revert",
                    id
                ),

            revertMany: (
                ids
            ) =>
                invoke(
                    "product-corrections:revert-many",
                    ids
                ),

            markSent: (
                ids
            ) =>
                invoke(
                    "product-corrections:mark-sent",
                    ids
                ),

            getPendingByProducts: (
                ids
            ) =>
                invoke(
                    "product-corrections:pending-by-products",
                    ids
                ),

            getBulkTargets: (
                ean,
                fields = []
            ) =>
                invoke(
                    "product-corrections:bulk-targets",
                    ean,
                    fields
                ),

            createBulkCorrections: (
                data
            ) =>
                invoke(
                    "product-corrections:create-bulk",
                    data
                ),

            createBulk: (
                data
            ) =>
                invoke(
                    "product-corrections:create-bulk",
                    data
                ),

            getFields: () =>
                invoke(
                    "product-corrections:fields"
                ),

            getBranches: () =>
                invoke(
                    "product-corrections:branches"
                ),

            getCsvBranches: () =>
                invoke(
                    "product-corrections:export-csv-branches"
                ),

            exportCsv: (
                branch
            ) =>
                invoke(
                    "product-corrections:export-csv",
                    branch
                ),

            exportAllCsv: () =>
                invoke(
                    "product-corrections:export-csv-all"
                )
        },

        purchases: {
            getAll: (
                filters
            ) =>
                invoke(
                    "purchases:get-all",
                    filters
                ),

            getById: (
                id
            ) =>
                invoke(
                    "purchases:get-by-id",
                    id
                ),

            create: (
                data
            ) =>
                invoke(
                    "purchases:create",
                    data
                ),

            update: (
                id,
                data
            ) =>
                invoke(
                    "purchases:update",
                    id,
                    data
                ),

            updateStatus: (
                id,
                status
            ) =>
                invoke(
                    "purchases:update-status",
                    id,
                    status
                ),

            delete: (
                id
            ) =>
                invoke(
                    "purchases:delete",
                    id
                ),

            listSuggestions: (
                filters
            ) =>
                invoke(
                    "purchases:list-suggestions",
                    filters
                ),

            getFilterOptions: (
                field
            ) =>
                invoke(
                    "purchases:get-filter-options",
                    field
                ),

            syncCurveExcel: () =>
                invoke(
                    "purchases:sync-curve-excel"
                ),

            onChanged: (
                callback
            ) =>
                subscribe(
                    "purchases:changed",
                    callback
                ),

            exportExcel: (
                payload
            ) =>
                invoke(
                    "purchases:export-excel",
                    payload
                )
        },

        export: {
            getPreference: (
                moduleKey
            ) =>
                invoke(
                    "export:preferences:get",
                    moduleKey
                ),

            savePreference: (
                moduleKey,
                columns
            ) =>
                invoke(
                    "export:preferences:save",
                    moduleKey,
                    columns
                ),

            products: (
                filters,
                columns
            ) =>
                invoke(
                    "export:products",
                    filters,
                    columns
                ),

            productsPreview: (
                filters,
                columns
            ) =>
                invoke(
                    "products:export-preview",
                    filters,
                    columns
                ),

            productsAdvanced: (
                filters,
                columns
            ) =>
                invoke(
                    "products:export-advanced",
                    filters,
                    columns
                ),

            productAudit: (
                filters,
                columns
            ) =>
                invoke(
                    "export:product-audit",
                    filters,
                    columns
                ),

            productCorrections: (
                filters,
                columns
            ) =>
                invoke(
                    "export:product-corrections",
                    filters,
                    columns
                ),

            industryContacts: (
                filters,
                columns,
                rows
            ) =>
                invoke(
                    "export:industry-contacts",
                    filters,
                    columns,
                    rows
                ),

            getTemplates: (
                moduleKey
            ) =>
                invoke(
                    "export:templates:get",
                    moduleKey
                ),

            saveTemplate: (
                moduleKey,
                name,
                filters,
                columns
            ) =>
                invoke(
                    "export:templates:save",
                    moduleKey,
                    name,
                    filters,
                    columns
                ),

            deleteTemplate: (
                moduleKey,
                templateId
            ) =>
                invoke(
                    "export:templates:delete",
                    moduleKey,
                    templateId
                )
        },

        email: {
            received: {
                runRoutine: () =>
                    invoke(
                        "email-received:run-routine"
                    ),

                listMessages: () =>
                    invoke(
                        "email-received:messages:list"
                    ),

                listAttachments: (
                    messageId
                ) =>
                    invoke(
                        "email-received:attachments:list",
                        messageId
                    ),

                fetch: (
                    configId
                ) =>
                    invoke(
                        "email-received:fetch",
                        configId
                    ),

                process: (
                    data
                ) =>
                    invoke(
                        "email-received:process",
                        data
                    ),

                dashboard: () =>
                    invoke(
                        "email-received:dashboard"
                    ),

                listLogs: () =>
                    invoke(
                        "email-received:logs:list"
                    ),

                listPatterns: () =>
                    invoke(
                        "email-received:patterns:list"
                    ),

                createPattern: (
                    data
                ) =>
                    invoke(
                        "email-received:patterns:create",
                        data
                    ),

                deletePattern: (
                    id
                ) =>
                    invoke(
                        "email-received:patterns:delete",
                        id
                    ),

                openFolder: (
                    folderType
                ) =>
                    invoke(
                        "email-received:folders:open",
                        folderType
                    )
            },

            configs: {
                list: () =>
                    invoke(
                        "email-configs:list"
                    ),

                getById: (
                    id
                ) =>
                    invoke(
                        "email-configs:get-by-id",
                        id
                    ),

                create: (
                    data
                ) =>
                    invoke(
                        "email-configs:create",
                        data
                    ),

                update: (
                    id,
                    data
                ) =>
                    invoke(
                        "email-configs:update",
                        id,
                        data
                    ),

                delete: (
                    id
                ) =>
                    invoke(
                        "email-configs:delete",
                        id
                    ),

                testSmtp: (
                    data
                ) =>
                    invoke(
                        "email-configs:test-smtp",
                        data
                    ),

                testImap: (
                    data
                ) =>
                    invoke(
                        "email-configs:test-imap",
                        data
                    )
            },

            campaigns: {
                list: () =>
                    invoke(
                        "email-campaigns:list"
                    ),

                getById: (
                    id
                ) =>
                    invoke(
                        "email-campaigns:get-by-id",
                        id
                    ),

                create: (
                    data
                ) =>
                    invoke(
                        "email-campaigns:create",
                        data
                    ),

                update: (
                    id,
                    data
                ) =>
                    invoke(
                        "email-campaigns:update",
                        id,
                        data
                    ),

                delete: (
                    id
                ) =>
                    invoke(
                        "email-campaigns:delete",
                        id
                    ),

                send: (
                    campaignId,
                    options
                ) =>
                    invoke(
                        "email-campaigns:send",
                        campaignId,
                        options
                    ),

                processIncoming: (
                    campaignId
                ) =>
                    invoke(
                        "email-campaigns:process-incoming",
                        campaignId
                    ),

                getDashboard: (
                    campaignId
                ) =>
                    invoke(
                        "email-campaigns:dashboard",
                        campaignId
                    ),

                getHistory: (
                    campaignId
                ) =>
                    invoke(
                        "email-campaigns:history",
                        campaignId
                    ),

                getSendLogs: (
                    campaignId
                ) =>
                    invoke(
                        "email-campaigns:send-logs",
                        campaignId
                    )
            },

            recipients: {
                list: (
                    campaignId
                ) =>
                    invoke(
                        "email-recipients:list",
                        campaignId
                    ),

                getById: (
                    id
                ) =>
                    invoke(
                        "email-recipients:get-by-id",
                        id
                    ),

                create: (
                    data
                ) =>
                    invoke(
                        "email-recipients:create",
                        data
                    ),

                createBatch: (
                    campaignId,
                    data
                ) =>
                    invoke(
                        "email-recipients:create-batch",
                        campaignId,
                        data
                    ),

                delete: (
                    id
                ) =>
                    invoke(
                        "email-recipients:delete",
                        id
                    )
            },

            attachments: {
                getDatabaseInfo: () =>
                    invoke(
                        "email-campaign-attachments:database-info"
                    ),

                list: (
                    campaignId
                ) =>
                    invoke(
                        "email-campaign-attachments:list",
                        String(
                            campaignId ||
                                ""
                        )
                    ),

                selectAndSave: (
                    campaignId
                ) =>
                    invoke(
                        "email-campaign-attachments:select-and-save",
                        String(
                            campaignId ||
                                ""
                        )
                    ),

                remove: (
                    attachmentId
                ) =>
                    invoke(
                        "email-campaign-attachments:remove",
                        attachmentId
                    )
            },

            processor: {
                start: () =>
                    invoke(
                        "email-processor:start"
                    ),

                stop: () =>
                    invoke(
                        "email-processor:stop"
                    )
            }
        },

        ipc: {
            invoke: (
                channel,
                ...args
            ) =>
                invoke(
                    channel,
                    ...args
                )
        }
    }
);