import type { Env } from '../../types';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://docmaster.store',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
};

const DEFAULT_RETENTION = {
  atestado: 30,
  receita: 30,
  cnh: 30,
  cha: 30,
  toxicologico: 30,
  historico: 30,
} as const;

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/docmaster_session=([^;]+)/);
  return match ? match[1] : null;
}

async function getAdminUser(request: Request, env: Env) {
  const token = getSessionToken(request);
  if (!token) return null;
  const session = await env.DB.prepare('SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime("now") LIMIT 1').bind(token).first<{ user_id: string }>();
  if (!session) return null;
  const user = await env.DB.prepare('SELECT id, username, role FROM users WHERE id = ? AND is_active = 1 LIMIT 1').bind(session.user_id).first<any>();
  return user?.role === 'admin' ? user : null;
}

async function ensureSettingsTable(env: Env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  const defaults: Record<string, string> = {
    auto_delete_atestado: String(DEFAULT_RETENTION.atestado),
    auto_delete_receita: String(DEFAULT_RETENTION.receita),
    auto_delete_cnh: String(DEFAULT_RETENTION.cnh),
    auto_delete_cha: String(DEFAULT_RETENTION.cha),
    auto_delete_toxicologico: String(DEFAULT_RETENTION.toxicologico),
    auto_delete_historico: String(DEFAULT_RETENTION.historico),
  };

  for (const [key, value] of Object.entries(defaults)) {
    await env.DB.prepare('INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))').bind(key, value).run();
  }
}

async function logAdminAction(env: Env, adminId: string, action: string, details: any) {
  try {
    await env.DB.prepare(`
      INSERT INTO admin_logs (id, admin_id, action, target_type, details, created_at)
      VALUES (?, ?, ?, 'cleanup', ?, datetime('now'))
    `).bind(crypto.randomUUID(), adminId, action, JSON.stringify(details)).run();
  } catch {}
}

async function getRetentionDays(env: Env) {
  await ensureSettingsTable(env);
  const keys = [
    'auto_delete_atestado',
    'auto_delete_receita',
    'auto_delete_cnh',
    'auto_delete_cha',
    'auto_delete_toxicologico',
    'auto_delete_historico',
  ];
  const rows = await env.DB.prepare(
    `SELECT key, value FROM system_settings WHERE key IN (${keys.map(() => '?').join(', ')})`
  ).bind(...keys).all<{ key: string; value: string }>();

  const map = Object.fromEntries((rows.results || []).map(row => [row.key, Number(row.value)]));
  return {
    atestado: map.auto_delete_atestado || DEFAULT_RETENTION.atestado,
    receita: map.auto_delete_receita || DEFAULT_RETENTION.receita,
    cnh: map.auto_delete_cnh || DEFAULT_RETENTION.cnh,
    cha: map.auto_delete_cha || DEFAULT_RETENTION.cha,
    toxicologico: map.auto_delete_toxicologico || DEFAULT_RETENTION.toxicologico,
    historico: map.auto_delete_historico || DEFAULT_RETENTION.historico,
  };
}

function normalizeDateExpression(expression: string) {
  return `CASE
    WHEN ${expression} IS NULL OR TRIM(${expression}) = '' THEN NULL
    WHEN ${expression} LIKE '__/__/____' THEN substr(${expression}, 7, 4) || '-' || substr(${expression}, 4, 2) || '-' || substr(${expression}, 1, 2)
    WHEN ${expression} LIKE '____-__-__%' THEN substr(${expression}, 1, 10)
    ELSE NULL
  END`;
}

async function countDocuments(env: Env, sql: string, binds: any[]) {
  const row = await env.DB.prepare(sql).bind(...binds).first<{ count: number }>();
  return Number(row?.count || 0);
}

async function runDelete(env: Env, sql: string, binds: any[]) {
  const result = await env.DB.prepare(sql).bind(...binds).run();
  return Number(result.meta?.changes || 0);
}

async function buildPreview(env: Env) {
  const retention = await getRetentionDays(env);
  const docDate = normalizeDateExpression(`COALESCE(
    json_extract(data, '$.dataEmissao'),
    json_extract(data, '$.data_emissao'),
    json_extract(data, '$.emissao'),
    json_extract(data, '$.data_expedicao_historico')
  )`);

  const preview = {
    atestado: await countDocuments(
      env,
      `SELECT COUNT(*) AS count FROM attestations WHERE created_at < date('now', ?) OR (${normalizeDateExpression('data_emissao')} IS NOT NULL AND date(${normalizeDateExpression('data_emissao')}) < date('now', ?))`,
      [`-${retention.atestado} days`, `-${retention.atestado} days`]
    ),
    receita: await countDocuments(
      env,
      `SELECT COUNT(*) AS count FROM receitas WHERE created_at < date('now', ?) OR (${normalizeDateExpression('data_emissao')} IS NOT NULL AND date(${normalizeDateExpression('data_emissao')}) < date('now', ?))`,
      [`-${retention.receita} days`, `-${retention.receita} days`]
    ),
    cnh: await countDocuments(
      env,
      `SELECT COUNT(*) AS count FROM documents WHERE type = 'cnh' AND (created_at < date('now', ?) OR (expires_at IS NOT NULL AND expires_at < datetime('now')) OR (${docDate} IS NOT NULL AND date(${docDate}) < date('now', ?)))`,
      [`-${retention.cnh} days`, `-${retention.cnh} days`]
    ),
    cha: await countDocuments(
      env,
      `SELECT COUNT(*) AS count FROM documents WHERE type = 'cha' AND (created_at < date('now', ?) OR (expires_at IS NOT NULL AND expires_at < datetime('now')) OR (${docDate} IS NOT NULL AND date(${docDate}) < date('now', ?)))`,
      [`-${retention.cha} days`, `-${retention.cha} days`]
    ),
    toxicologico: await countDocuments(
      env,
      `SELECT COUNT(*) AS count FROM documents WHERE type IN ('toxicologico', 'toxicria', 'laudocria') AND (created_at < date('now', ?) OR (expires_at IS NOT NULL AND expires_at < datetime('now')) OR (${docDate} IS NOT NULL AND date(${docDate}) < date('now', ?)))`,
      [`-${retention.toxicologico} days`, `-${retention.toxicologico} days`]
    ),
    historico: await countDocuments(
      env,
      `SELECT COUNT(*) AS count FROM documents WHERE type IN ('historico-sp', 'historico-uninter', 'historicocria') AND (created_at < date('now', ?) OR (expires_at IS NOT NULL AND expires_at < datetime('now')) OR (${docDate} IS NOT NULL AND date(${docDate}) < date('now', ?)))`,
      [`-${retention.historico} days`, `-${retention.historico} days`]
    ),
  };

  return {
    retention_days: retention,
    pendingDeletion: {
      ...preview,
      total: Object.values(preview).reduce((sum, value) => sum + Number(value || 0), 0),
    },
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAdminUser(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    const preview = await buildPreview(env);
    return new Response(JSON.stringify({ success: true, ...preview }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const admin = await getAdminUser(request, env);
  if (!admin) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    const preview = await buildPreview(env);
    const retention = preview.retention_days;
    const docDate = normalizeDateExpression(`COALESCE(
      json_extract(data, '$.dataEmissao'),
      json_extract(data, '$.data_emissao'),
      json_extract(data, '$.emissao'),
      json_extract(data, '$.data_expedicao_historico')
    )`);

    const deleted = {
      atestado: await runDelete(
        env,
        `DELETE FROM attestations WHERE created_at < date('now', ?) OR (${normalizeDateExpression('data_emissao')} IS NOT NULL AND date(${normalizeDateExpression('data_emissao')}) < date('now', ?))`,
        [`-${retention.atestado} days`, `-${retention.atestado} days`]
      ),
      receita: await runDelete(
        env,
        `DELETE FROM receitas WHERE created_at < date('now', ?) OR (${normalizeDateExpression('data_emissao')} IS NOT NULL AND date(${normalizeDateExpression('data_emissao')}) < date('now', ?))`,
        [`-${retention.receita} days`, `-${retention.receita} days`]
      ),
      cnh: await runDelete(
        env,
        `DELETE FROM documents WHERE type = 'cnh' AND (created_at < date('now', ?) OR (expires_at IS NOT NULL AND expires_at < datetime('now')) OR (${docDate} IS NOT NULL AND date(${docDate}) < date('now', ?)))`,
        [`-${retention.cnh} days`, `-${retention.cnh} days`]
      ),
      cha: await runDelete(
        env,
        `DELETE FROM documents WHERE type = 'cha' AND (created_at < date('now', ?) OR (expires_at IS NOT NULL AND expires_at < datetime('now')) OR (${docDate} IS NOT NULL AND date(${docDate}) < date('now', ?)))`,
        [`-${retention.cha} days`, `-${retention.cha} days`]
      ),
      toxicologico: await runDelete(
        env,
        `DELETE FROM documents WHERE type IN ('toxicologico', 'toxicria', 'laudocria') AND (created_at < date('now', ?) OR (expires_at IS NOT NULL AND expires_at < datetime('now')) OR (${docDate} IS NOT NULL AND date(${docDate}) < date('now', ?)))`,
        [`-${retention.toxicologico} days`, `-${retention.toxicologico} days`]
      ),
      historico: await runDelete(
        env,
        `DELETE FROM documents WHERE type IN ('historico-sp', 'historico-uninter', 'historicocria') AND (created_at < date('now', ?) OR (expires_at IS NOT NULL AND expires_at < datetime('now')) OR (${docDate} IS NOT NULL AND date(${docDate}) < date('now', ?)))`,
        [`-${retention.historico} days`, `-${retention.historico} days`]
      ),
    };

    const total = Object.values(deleted).reduce((sum, value) => sum + Number(value || 0), 0);
    await logAdminAction(env, admin.id, 'run_cleanup', { deleted, retention_days: retention, preview: preview.pendingDeletion });

    return new Response(JSON.stringify({
      success: true,
      message: `Limpeza concluída. ${total} documentos excluídos.`,
      deleted: { ...deleted, total },
      retention_days: retention,
    }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Erro interno' }), { status: 500, headers: corsHeaders });
  }
};

export const onRequestOptions: PagesFunction = async () => new Response(null, { headers: corsHeaders });
