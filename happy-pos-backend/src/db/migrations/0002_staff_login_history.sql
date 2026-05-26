CREATE TABLE IF NOT EXISTS staff_login_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  login_time TEXT NOT NULL,
  logout_time TEXT,
  status TEXT NOT NULL DEFAULT 'online'
);
