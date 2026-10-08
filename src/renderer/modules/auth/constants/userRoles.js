export const USER_ROLES = {
  CREATOR: 'creator',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  PENDING: 'pending',
};

export const ROLE_LABELS = {
  [USER_ROLES.CREATOR]: 'Criador',
  [USER_ROLES.ADMIN]: 'Administrador',
  [USER_ROLES.EDITOR]: 'Editor',
  [USER_ROLES.VIEWER]: 'Visualizador',
  [USER_ROLES.PENDING]: 'Pendente',
};

export const ROLE_COLORS = {
  [USER_ROLES.CREATOR]: '#7c3aed',
  [USER_ROLES.ADMIN]: '#2563eb',
  [USER_ROLES.EDITOR]: '#059669',
  [USER_ROLES.VIEWER]: '#6b7280',
  [USER_ROLES.PENDING]: '#d97706',
};

export const DEFAULT_USER = {
  id: 1,
  username: 'sLekoti',
  display_name: 'sLekoti (Criador)',
  role: USER_ROLES.CREATOR,
  is_active: 1,
};