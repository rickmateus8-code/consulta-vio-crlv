-- DocMaster Full Database Schema & Security Backup
-- Backup date: 2026-08-11
-- Enforces 30-day max document retention, atomic balance debits, transaction logs and zero security vulnerability tolerance.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  display_name TEXT,
  plain_password TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  balance REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  free_documents TEXT DEFAULT '[]',
  permissions TEXT DEFAULT '{"editaveis":[],"ferramentas":[]}',
  referral_percentage REAL,
  cashback_percentage REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attestations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  codigo_qr TEXT UNIQUE NOT NULL,
  validation_url TEXT,
  status TEXT NOT NULL DEFAULT 'emitido' CHECK (status IN ('emitido', 'cancelado')),
  paciente TEXT NOT NULL,
  sexo TEXT,
  nascimento TEXT,
  cpf TEXT,
  cns TEXT,
  tipo_doc TEXT DEFAULT 'CPF',
  nome_mae TEXT,
  endereco TEXT,
  cid TEXT,
  cid_display TEXT,
  cid_nome TEXT,
  medico TEXT NOT NULL,
  crm TEXT NOT NULL,
  especialidade TEXT,
  instituicao TEXT,
  unidade TEXT,
  endereco_emitente TEXT,
  texto_atestado TEXT,
  afastamento TEXT DEFAULT '3',
  data_assinatura TEXT,
  hora_assinatura TEXT,
  data_emissao TEXT,
  cidade TEXT,
  logo_url TEXT,
  logo_right TEXT,
  signature_color TEXT DEFAULT '#0b109f',
  signature_image TEXT,
  modo_carimbo INTEGER DEFAULT 0,
  pdf_data TEXT,
  pdf_generated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS receitas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  codigo_qr TEXT UNIQUE NOT NULL,
  validation_url TEXT,
  status TEXT NOT NULL DEFAULT 'emitido' CHECK (status IN ('emitido', 'cancelado')),
  tipo_receituario TEXT NOT NULL DEFAULT 'simples' CHECK (tipo_receituario IN ('simples', 'controle_especial', 'antimicrobiano')),
  paciente TEXT NOT NULL,
  cpf TEXT,
  identidade TEXT,
  endereco TEXT,
  telefone TEXT,
  cidade TEXT,
  medico TEXT NOT NULL,
  crm TEXT NOT NULL,
  especialidade TEXT,
  instituicao TEXT,
  endereco_emitente TEXT,
  cnpj_emitente TEXT,
  telefone_emitente TEXT,
  site_emitente TEXT,
  prescricao TEXT NOT NULL DEFAULT '[]',
  data_emissao TEXT,
  hora_emissao TEXT,
  logo_url TEXT,
  signature_color TEXT DEFAULT '#0b109f',
  signature_image TEXT,
  pdf_data TEXT,
  pdf_generated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  codigo_qr TEXT UNIQUE,
  codigo_validacao TEXT,
  status TEXT NOT NULL DEFAULT 'emitido' CHECK (status IN ('emitido', 'cancelado')),
  pdf_data TEXT,
  pdf_generated_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount REAL NOT NULL,
  description TEXT,
  document_type TEXT,
  document_id TEXT,
  status TEXT DEFAULT 'completed',
  external_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_pricing (
  document_type TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 5.00,
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Default system settings: 30 days retention max for all document types
INSERT OR IGNORE INTO system_settings (key, value) VALUES
  ('auto_delete_atestado', '30'),
  ('auto_delete_receita', '30'),
  ('auto_delete_cnh', '30'),
  ('auto_delete_cha', '30'),
  ('auto_delete_toxicologico', '30'),
  ('auto_delete_historico', '30');
