-- Migration: Tabela de log real de consultas para contagem em 24h
CREATE TABLE IF NOT EXISTS consultas_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  modulo TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_consultas_logs_user_date ON consultas_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_consultas_logs_user_modulo ON consultas_logs(user_id, modulo, created_at);
