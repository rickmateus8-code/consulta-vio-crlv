-- Migration: Remover CHECK constraint restritivo da tabela consultas_planos
-- Permite salvar 'Teste Grátis 1 Dia', planos concedidos por Administrador e planos pagos.

CREATE TABLE IF NOT EXISTS consultas_planos_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  plano TEXT NOT NULL,
  valor REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

INSERT INTO consultas_planos_new (id, user_id, plano, valor, created_at, expires_at)
SELECT id, user_id, plano, valor, created_at, expires_at FROM consultas_planos;

DROP TABLE consultas_planos;

ALTER TABLE consultas_planos_new RENAME TO consultas_planos;

CREATE INDEX IF NOT EXISTS idx_consultas_planos_user_id ON consultas_planos(user_id);
CREATE INDEX IF NOT EXISTS idx_consultas_planos_expires ON consultas_planos(expires_at);
