ALTER TABLE orders ADD COLUMN cost_total REAL NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN profit_total REAL NOT NULL DEFAULT 0;

ALTER TABLE order_items ADD COLUMN unit_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN line_subtotal REAL NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN line_cost REAL NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN line_profit REAL NOT NULL DEFAULT 0;

UPDATE order_items
SET
  unit_cost = COALESCE((SELECT cost FROM products WHERE products.id = order_items.product_id), 0),
  line_subtotal = unit_price * quantity,
  line_cost = COALESCE((SELECT cost FROM products WHERE products.id = order_items.product_id), 0) * quantity,
  line_profit = (unit_price * quantity) - (COALESCE((SELECT cost FROM products WHERE products.id = order_items.product_id), 0) * quantity);

UPDATE orders
SET
  cost_total = COALESCE((SELECT SUM(line_cost) FROM order_items WHERE order_items.order_id = orders.id), 0),
  profit_total = subtotal - COALESCE((SELECT SUM(line_cost) FROM order_items WHERE order_items.order_id = orders.id), 0);
