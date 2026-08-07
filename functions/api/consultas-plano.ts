/**
 * /api/consultas-plano — Gerencia planos de consulta SnoopIntelligence
 */
import type { Env } from '../types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const PLANO_CONFIG: Record<string, { valor: number; horas: number }> = {
  diario:  { valor: 5.00,   horas: 24 },
  semanal: { valor: 50.00,  horas: 168 },
  mensal:  { valor: 100.00, horas: 720 },
};

async function getUserFromSession(request: Request, env: Env): Promise<any | null> {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/docmaster_session=([^;]+)/);
  if (!match) return null;
  const session = await env.DB.prepare(
    'SELECT s.user_id, u.id, u.username, u.role, u.balance, u.free_documents FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime(\'now\')'
  ).bind(match[1]).first<any>();
  return session || null;
}

// GET /api/consultas-plano — retorna status do plano ativo e uso real das ultimas 24h
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getUserFromSession(request, env);
  if (!user) return new Response(JSON.stringify({ success: false, error: 'Nao autenticado' }), { status: 401, headers: CORS });
  
  let freeDocs: string[] = [];
  try {
    if (user.free_documents) {
      freeDocs = typeof user.free_documents === 'string' ? JSON.parse(user.free_documents) : user.free_documents;
    }
  } catch {}

  const isFree = user.role === 'admin' || (Array.isArray(freeDocs) && freeDocs.includes('consultas'));

  const dbPlan = await env.DB.prepare(
    'SELECT * FROM consultas_planos WHERE user_id = ? AND expires_at > datetime(\'now\') ORDER BY expires_at DESC LIMIT 1'
  ).bind(user.id).first<any>();

  const activePlan = isFree ? {
    id: 'free-admin-granted',
    plano: 'Concedido pelo Admin (Gratuito)',
    is_free: true,
    expires_at: '2099-12-31T23:59:59Z'
  } : dbPlan;

  let usage24h = 0;
  let usageByModulo: Record<string, number> = {};
  try {
    const usageRes = await env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM consultas_logs WHERE user_id = ? AND created_at >= datetime(\'now\', \'-24 hours\')'
    ).bind(user.id).first<any>();
    usage24h = usageRes?.cnt || 0;

    const modRes = await env.DB.prepare(
      'SELECT modulo, COUNT(*) as cnt FROM consultas_logs WHERE user_id = ? AND created_at >= datetime(\'now\', \'-24 hours\') GROUP BY modulo'
    ).bind(user.id).all<any>();
    if (modRes?.results) {
      for (const row of modRes.results) {
        usageByModulo[row.modulo] = row.cnt;
      }
    }
  } catch { usage24h = 0; }

  return new Response(JSON.stringify({
    success: true,
    is_free: isFree,
    plan: activePlan || null,
    balance: user.balance,
    usage_24h: usage24h,
    usage_by_modulo: usageByModulo,
  }), { headers: CORS });
};

// POST /api/consultas-plano — compra um plano
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getUserFromSession(request, env);
  if (!user) return new Response(JSON.stringify({ success: false, error: 'Nao autenticado' }), { status: 401, headers: CORS });
  
  let body: { plano: string };
  try { body = await request.json() as any; } catch {
    return new Response(JSON.stringify({ success: false, error: 'Body invalido' }), { status: 400, headers: CORS });
  }
  const { plano } = body;
  const cfg = PLANO_CONFIG[plano];
  if (!cfg) return new Response(JSON.stringify({ success: false, error: 'Plano invalido' }), { status: 400, headers: CORS });
  if (user.balance < cfg.valor) {
    return new Response(JSON.stringify({ success: false, error: 'Saldo insuficiente', required: cfg.valor, balance: user.balance }), { status: 402, headers: CORS });
  }
  const expiresAt = new Date(Date.now() + cfg.horas * 3600_000).toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').bind(cfg.valor, user.id),
    env.DB.prepare('INSERT INTO consultas_planos (user_id, plano, valor, expires_at) VALUES (?, ?, ?, ?)').bind(user.id, plano, cfg.valor, expiresAt),
    env.DB.prepare('INSERT INTO transactions (user_id, type, amount, description, created_at) VALUES (?, \'debit\', ?, ?, datetime(\'now\'))').bind(user.id, cfg.valor, 'Plano de Consultas ' + plano),
  ]);
  const updatedUser = await env.DB.prepare('SELECT balance FROM users WHERE id = ?').bind(user.id).first<any>();
  return new Response(JSON.stringify({ success: true, message: 'Plano ativado com sucesso!', plano, expires_at: expiresAt, new_balance: updatedUser?.balance ?? 0 }), { headers: CORS });
};

export const onRequestOptions: PagesFunction<Env> = async () => new Response(null, { headers: CORS });