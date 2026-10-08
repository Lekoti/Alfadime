-- Migration 011: tabela de itens do pedido de compra

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    purchase_order_id INTEGER NOT NULL,

    product_id INTEGER NOT NULL,
    branch TEXT NOT NULL,

    product_code TEXT NOT NULL,
    ean TEXT,
    product_name TEXT NOT NULL,

    quantity INTEGER NOT NULL,
    unit_cost REAL NOT NULL,

    discount_amount REAL DEFAULT 0,
    additional_amount REAL DEFAULT 0,
    total_amount REAL NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product_catalog(id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_product_id ON purchase_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_branch ON purchase_order_items(branch);
