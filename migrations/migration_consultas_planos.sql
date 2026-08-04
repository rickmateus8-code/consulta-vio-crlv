-- Migration: Tabela de planos de consultas SnoopIntelligence
CREATE TABLE IF NOT EXISTS consultas_planos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  plano TEXT NOT NULL CHECK(plano IN ('diario', 'semanal', 'mensal')),
  valor REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_consultas_planos_user_id ON consultas_planos(user_id);
CREATE INDEX IF NOT EXISTS idx_consultas_planos_expires ON consultas_planos(expires_at);
