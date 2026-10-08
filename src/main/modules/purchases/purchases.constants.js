/**
 * Constantes de pedidos de compra.
 */

const STATUS = {
  DRAFT: 'draft',
  REQUESTED: 'requested',
  APPROVED: 'approved',
  CANCELLED: 'cancelled',
  RECEIVED: 'received'
};

const ALLOWED_STATUS_TRANSITIONS = {
  [STATUS.DRAFT]: [STATUS.REQUESTED, STATUS.CANCELLED],
  [STATUS.REQUESTED]: [STATUS.APPROVED, STATUS.CANCELLED],
  [STATUS.APPROVED]: [STATUS.RECEIVED, STATUS.CANCELLED],
  [STATUS.CANCELLED]: [],
  [STATUS.RECEIVED]: []
};

const STATUS_LABELS = {
  [STATUS.DRAFT]: 'Rascunho',
  [STATUS.REQUESTED]: 'Solicitado',
  [STATUS.APPROVED]: 'Aprovado',
  [STATUS.CANCELLED]: 'Cancelado',
  [STATUS.RECEIVED]: 'Recebido'
};

module.exports = {
  STATUS,
  ALLOWED_STATUS_TRANSITIONS,
  STATUS_LABELS
};
