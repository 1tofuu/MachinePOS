CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  description TEXT,
  price REAL NOT NULL,
  cost REAL DEFAULT 0,
  category TEXT NOT NULL,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 10,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT,
  subtotal REAL NOT NULL,
  tax REAL NOT NULL,
  total REAL NOT NULL,
  cost_total REAL NOT NULL DEFAULT 0,
  profit_total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  payment TEXT
);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  unit_cost REAL NOT NULL DEFAULT 0,
  line_subtotal REAL NOT NULL DEFAULT 0,
  line_cost REAL NOT NULL DEFAULT 0,
  line_profit REAL NOT NULL DEFAULT 0
);

-- Line calculations:
-- line_subtotal = unit_price * quantity
-- line_cost = unit_cost * quantity
-- line_profit = line_subtotal - line_cost
--
-- Order calculations:
-- subtotal = SUM(order_items.line_subtotal)
-- cost_total = SUM(order_items.line_cost)
-- profit_total = subtotal - cost_total
-- total = subtotal + tax
