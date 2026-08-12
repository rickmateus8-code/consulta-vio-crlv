import { AttestationRecord, AttestationFrontend, Env } from '../types';
import { nanoid } from 'nanoid';

/**
 * Generate a unique validation code in format XXXX.XXXX
 */
export function generateValidationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1Length = 4;
  const part2Length = 4;

  let part1 = '';
  let part2 = '';

  for (let i = 0; i < part1Length; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  for (let i = 0; i < part2Length; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${part1}.${part2}`;
}

/**
 * Get a unique validation code (check for duplicates)
 */
export async function getUniqueValidationCode(env: Env): Promise<string> {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const code = generateValidationCode();
    const existing = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM attestations WHERE codigo_validacao = ?'
    )
      .bind(code)
      .first<{ count: number }>();

    if (existing && existing.count === 0) {
      return code;
    }
    attempts++;
  }

  throw new Error('Failed to generate unique validation code after 100 attempts');
}

/**
 * Map database record to frontend format
 */
export function mapToFrontend(record: AttestationRecord): AttestationFrontend {
  return {
    id: record.id,
    codigoQR: record.codigo_validacao,
    paciente: record.paciente,
    sexo: record.sexo,
    nascimento: record.nascimento,
    cpf: record.cpf,
    nomeMae: record.nome_mae,
    endereco: record.endereco,
    passaporte: record.passaporte || '',
    condicao: record.condicao,
    vacinacao: record.vacinacao,
    cid: record.cid,
    medico: record.medico,
    crm: record.crm,
    especialidade: record.especialidade,
    dataAssinatura: record.data_assinatura,
    horaAssinatura: record.hora_assinatura,
    dataEmissao: record.data_emissao,
    logoUrl: record.logo_url || undefined,
    enderecoEmitente: record.endereco_emitente,
    instituicao: record.instituicao,
  };
}

/**
 * Get all attestations
 */
export async function getAllAttestations(env: Env): Promise<AttestationRecord[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM attestations ORDER BY created_at DESC'
  ).all<AttestationRecord>();

  return result.results || [];
}

/**
 * Get attestation by ID
 */
export async function getAttestationById(
  env: Env,
  id: string
): Promise<AttestationRecord | null> {
  const result = await env.DB.prepare('SELECT * FROM attestations WHERE id = ?')
    .bind(id)
    .first<AttestationRecord>();

  return result || null;
}

/**
 * Get attestation by validation code
 */
export async function getAttestationByCode(
  env: Env,
  code: string
): Promise<AttestationRecord | null> {
  const result = await env.DB.prepare(
    'SELECT * FROM attestations WHERE codigo_validacao = ?'
  )
    .bind(code.trim().toUpperCase())
    .first<AttestationRecord>();

  return result || null;
}

/**
 * Validate attestation by code and date
 */
export async function validateAttestation(
  env: Env,
  code: string,
  date: string
): Promise<{ valid: boolean; attestation?: AttestationRecord }> {
  const attestation = await getAttestationByCode(env, code);

  if (!attestation) {
    return { valid: false };
  }

  // Check if date matches (compare data_assinatura)
  if (date === attestation.data_assinatura) {
    return { valid: true, attestation };
  }

  return { valid: false };
}

/**
 * Create new attestation
 */
export async function createAttestation(
  env: Env,
  data: Omit<AttestationRecord, 'id' | 'codigo_validacao' | 'created_at' | 'updated_at'>
): Promise<AttestationRecord> {
  const id = await getUniqueValidationCode(env);
  const codigo_validacao = id;

  const record = {
    ...data,
    id,
    codigo_validacao,
    passaporte: data.passaporte || null,
    logo_url: data.logo_url || null,
    endereco_emitente:
      data.endereco_emitente ||
      'Endereço da Clínica',
    instituicao: data.instituicao || 'Clínica / Hospital',
  };

  await env.DB.prepare(
    `INSERT INTO attestations (
      id, codigo_validacao, paciente, sexo, nascimento, cpf, nome_mae, endereco,
      passaporte, condicao, vacinacao, cid, medico, crm, especialidade,
      data_assinatura, hora_assinatura, data_emissao, logo_url, endereco_emitente, instituicao
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )`
  )
    .bind(
      record.id,
      record.codigo_validacao,
      record.paciente,
      record.sexo,
      record.nascimento,
      record.cpf,
      record.nome_mae,
      record.endereco,
      record.passaporte,
      record.condicao,
      record.vacinacao,
      record.cid,
      record.medico,
      record.crm,
      record.especialidade,
      record.data_assinatura,
      record.hora_assinatura,
      record.data_emissao,
      record.logo_url,
      record.endereco_emitente,
      record.instituicao
    )
    .run();

  const created = await getAttestationById(env, id);
  if (!created) {
    throw new Error('Failed to create attestation');
  }

  return created;
}

/**
 * Update attestation
 */
export async function updateAttestation(
  env: Env,
  id: string,
  data: Partial<AttestationRecord>
): Promise<AttestationRecord | null> {
  const existing = await getAttestationById(env, id);
  if (!existing) return null;

  const fields = Object.keys(data)
    .filter((k) => k !== 'id' && k !== 'codigo_validacao' && k !== 'created_at')
    .map((k) => `${k} = ?`)
    .join(', ');

  if (!fields) return existing;

  const values = Object.keys(data)
    .filter((k) => k !== 'id' && k !== 'codigo_validacao' && k !== 'created_at')
    .map((k) => data[k as keyof typeof data]);

  await env.DB.prepare(
    `UPDATE attestations SET ${fields}, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(...values, id)
    .run();

  const updated = await getAttestationById(env, id);
  return updated || null;
}

/**
 * Delete attestation
 */
export async function deleteAttestation(env: Env, id: string): Promise<boolean> {
  const result = await env.DB.prepare('DELETE FROM attestations WHERE id = ?')
    .bind(id)
    .run();

  return (result.meta?.changes || 0) > 0;
}

/**
 * Get attestation count
 */
export async function getAttestationCount(env: Env): Promise<number> {
  const result = await env.DB.prepare('SELECT COUNT(*) as count FROM attestations')
    .first<{ count: number }>();

  return result?.count || 0;
}

/**
 * Normaliza qualquer data (JS Date ou ISO string) para o formato SQLite datetime ('YYYY-MM-DD HH:MM:SS')
 * garantindo compatibilidade 100% perfeita com comparações datetime('now') no D1.
 */
export function formatSQLiteDatetime(dateInput: Date | string | number): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Garante a criação da tabela consultas_planos sem a CHECK constraint restritiva legada
 */
export async function ensureConsultasPlanosTable(env: Env): Promise<void> {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS consultas_planos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        plano TEXT NOT NULL,
        valor REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL
      )
    `).run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_consultas_planos_user_id ON consultas_planos(user_id)').run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_consultas_planos_expires ON consultas_planos(expires_at)').run();
  } catch {}
}

/**
 * Insere um registro na tabela consultas_planos, migrando automaticamente a tabela
 * caso ela ainda possua a CHECK constraint legada em SQLite D1.
 */
export async function insertConsultasPlano(
  env: Env,
  userId: string | number,
  plano: string,
  valor: number,
  expiresAt: string | Date
): Promise<any> {
  await ensureConsultasPlanosTable(env);
  const formattedExpires = formatSQLiteDatetime(expiresAt);
  try {
    return await env.DB.prepare(
      'INSERT INTO consultas_planos (user_id, plano, valor, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(String(userId), plano, valor, formattedExpires).run();
  } catch (err: any) {
    // Se falhar por causa da CHECK constraint legada do D1, executa a migração automática para remover a restrição
    const errMsg = String(err?.message || err || '');
    if (errMsg.includes('CHECK constraint failed') || errMsg.includes('SQLITE_CONSTRAINT_CHECK') || errMsg.includes('CHECK')) {
      try {
        await env.DB.batch([
          env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS consultas_planos_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id TEXT NOT NULL,
              plano TEXT NOT NULL,
              valor REAL NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              expires_at TEXT NOT NULL
            )
          `),
          env.DB.prepare(`
            INSERT INTO consultas_planos_new (id, user_id, plano, valor, created_at, expires_at)
            SELECT id, user_id, plano, valor, created_at, expires_at FROM consultas_planos
          `),
          env.DB.prepare('DROP TABLE consultas_planos'),
          env.DB.prepare('ALTER TABLE consultas_planos_new RENAME TO consultas_planos'),
          env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_consultas_planos_user_id ON consultas_planos(user_id)'),
          env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_consultas_planos_expires ON consultas_planos(expires_at)'),
        ]);

        return await env.DB.prepare(
          'INSERT INTO consultas_planos (user_id, plano, valor, expires_at) VALUES (?, ?, ?, ?)'
        ).bind(String(userId), plano, valor, formattedExpires).run();
      } catch (migrationErr) {
        console.error('[insertConsultasPlano] Erro na migracao de remocao de CHECK constraint:', migrationErr);
        throw err;
      }
    }
    throw err;
  }
}

