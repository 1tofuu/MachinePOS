-- Daily sales summary
SELECT
  DATE(o.created_at) AS sale_date,
  ROUND(SUM(o.subtotal), 2) AS total_selling_amount,
  ROUND(SUM(o.cost_total), 2) AS total_principal_amount,
  ROUND(SUM(o.profit_total), 2) AS total_profit,
  COUNT(*) AS completed_orders
FROM orders o
WHERE o.status = 'completed'
GROUP BY DATE(o.created_at)
ORDER BY sale_date DESC;

-- Monthly sales summary
SELECT
  STRFTIME('%Y-%m', o.created_at) AS sale_month,
  ROUND(SUM(o.subtotal), 2) AS total_selling_amount,
  ROUND(SUM(o.cost_total), 2) AS total_principal_amount,
  ROUND(SUM(o.profit_total), 2) AS total_profit,
  COUNT(*) AS completed_orders
FROM orders o
WHERE o.status = 'completed'
GROUP BY STRFTIME('%Y-%m', o.created_at)
ORDER BY sale_month DESC;

-- Top products by profit
SELECT
  oi.product_id,
  oi.name,
  SUM(oi.quantity) AS units_sold,
  ROUND(SUM(oi.line_subtotal), 2) AS selling_amount,
  ROUND(SUM(oi.line_cost), 2) AS principal_amount,
  ROUND(SUM(oi.line_profit), 2) AS profit
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status = 'completed'
GROUP BY oi.product_id, oi.name
ORDER BY profit DESC;

-- Single order audit
SELECT
  o.number,
  o.created_at,
  oi.name,
  oi.quantity,
  oi.unit_price,
  oi.unit_cost,
  oi.line_subtotal,
  oi.line_cost,
  oi.line_profit
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.number = '#10237';
