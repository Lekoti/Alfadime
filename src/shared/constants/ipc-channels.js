export const IPC_CHANNELS = {
  // Autenticação e Usuários
  AUTH: {
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    GET_CURRENT_SESSION: 'auth:get_current_session',
    GET_COMPUTER_ID: 'auth:get_computer_id',
    VALIDATE_SESSION: 'auth:validate_session',
    UPDATE_LAST_ACCESS: 'auth:update_last_access',
  },

  // Configurações
  SETTINGS: {
    GET_ALL: 'settings:get_all',
    GET: 'settings:get',
    SET: 'settings:set',
    DELETE: 'settings:delete',
  },

  // Price Pending
  PRICE_PENDING: {
    GET_ALL: 'price_pending:get_all',
    GET_BY_ID: 'price_pending:get_by_id',
    CREATE: 'price_pending:create',
    UPDATE: 'price_pending:update',
    DELETE: 'price_pending:delete',
    APPROVE: 'price_pending:approve',
    REJECT: 'price_pending:reject',
    GET_STATS: 'price_pending:get_stats',
  },

  // Product Catalog
  PRODUCTS: {
    GET_ALL: 'products:get_all',
    GET_BY_ID: 'products:get_by_id',
    SEARCH: 'products:search',
    CREATE: 'products:create',
    UPDATE: 'products:update',
    DELETE: 'products:delete',
    GET_CATALOG: 'products:get_catalog',
    IMPORT: 'products:import',
    EXPORT: 'products:export',
  },

  // Purchases
  PURCHASES: {
    GET_ALL: 'purchases:get_all',
    GET_BY_ID: 'purchases:get_by_id',
    CREATE: 'purchases:create',
    UPDATE: 'purchases:update',
    DELETE: 'purchases:delete',
    GET_CURVE: 'purchases:get_curve',
    GET_PRODUCT_CURVE: 'purchases:get_product_curve',
  },

  // Product Corrections
  PRODUCT_CORRECTIONS: {
    GET_ALL: 'product_corrections:get_all',
    GET_BY_ID: 'product_corrections:get_by_id',
    CREATE: 'product_corrections:create',
    UPDATE: 'product_corrections:update',
    DELETE: 'product_corrections:delete',
    APPROVE: 'product_corrections:approve',
    REJECT: 'product_corrections:reject',
  },

  // Product Audit
  PRODUCT_AUDIT: {
    GET_ALL: 'product_audit:get_all',
    GET_BY_ID: 'product_audit:get_by_id',
    CREATE: 'product_audit:create',
    UPDATE: 'product_audit:update',
    DELETE: 'product_audit:delete',
    GET_HISTORY: 'product_audit:get_history',
  },

  // Industry Contacts
  INDUSTRY_CONTACTS: {
    GET_ALL: 'industry_contacts:get_all',
    GET_BY_ID: 'industry_contacts:get_by_id',
    CREATE: 'industry_contacts:create',
    UPDATE: 'industry_contacts:update',
    DELETE: 'industry_contacts:delete',
    GET_BY_BRANCH: 'industry_contacts:get_by_branch',
  },

  // Email Dispatch
  EMAIL: {
    GET_RECEIVED: 'email:get_received',
    GET_CAMPAIGNS: 'email:get_campaigns',
    CREATE_CAMPAIGN: 'email:create_campaign',
    SEND_CAMPAIGN: 'email:send_campaign',
    GET_SENT: 'email:get_sent',
    GET_STATS: 'email:get_stats',
  },

  // Notifications
  NOTIFICATIONS: {
    GET_ALL: 'notifications:get_all',
    GET_UNREAD: 'notifications:get_unread',
    MARK_AS_READ: 'notifications:mark_as_read',
    MARK_ALL_AS_READ: 'notifications:mark_all_as_read',
    CREATE: 'notifications:create',
    DELETE: 'notifications:delete',
  },

  // App Updater
  APP_UPDATER: {
    CHECK_FOR_UPDATES: 'app_updater:check_for_updates',
    DOWNLOAD_UPDATE: 'app_updater:download_update',
    INSTALL_UPDATE: 'app_updater:install_update',
    GET_VERSION: 'app_updater:get_version',
  },

  // Database
  DATABASE: {
    BACKUP: 'database:backup',
    RESTORE: 'database:restore',
    GET_INFO: 'database:get_info',
  },
};