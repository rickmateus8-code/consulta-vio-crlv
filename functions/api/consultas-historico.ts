/**
 * /api/consultas-historico — Retorna o historico recente de consultas do usuario
 */
import type { Env } from '../types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function getUserFromSession(request: Request, env: Env): Promise<any | null> {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/docmaster_session=([^;]+)/);
  if (!match) return null;
  const session = await env.DB.prepare(
    'SELECT s.user_id, u.id, u.username, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime(\'now\')'
  ).bind(match[1]).first<any>();
  return session || null;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getUserFromSession(request, env);
  if (!user) return new Response(JSON.stringify({ success: false, error: 'Nao autenticado' }), { status: 401, headers: CORS });

  try {
    const logs = await env.DB.prepare(
      'SELECT id, modulo, created_at FROM consultas_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(user.id).all<any>();
    return new Response(JSON.stringify({ success: true, history: logs.results || [] }), { headers: CORS });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, history: [], error: e.message }), { headers: CORS });
  }
};

export const onRequestOptions: PagesFunction<Env> = async () => new Response(null, { headers: CORS });
