-- Migration 010: tabela de pedidos de compra

CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_number TEXT NOT NULL UNIQUE,
    branch TEXT NOT NULL,
    supplier_id INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'draft',

    order_date TEXT,
    expected_date TEXT,

    subtotal REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    additional_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,

    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON purchase_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch ON purchase_orders(branch);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
