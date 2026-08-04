/**
 * /api/snoop/[...endpoint] — Proxy seguro para SnoopIntelligence API
 */
import type { Env } from '../../types';

const SNOOP_BASE = 'https://snoopintelligence.cloud/api/v2';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

async function checkActivePlan(userId: number, env: Env): Promise<boolean> {
  try {
    const plan = await env.DB.prepare(
      'SELECT id FROM consultas_planos WHERE user_id = ? AND expires_at > datetime(\'now\') LIMIT 1'
    ).bind(userId).first<any>();
    return !!plan;
  } catch { return false; }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await getUserFromSession(request, env);
  if (!user) return new Response(JSON.stringify({ success: false, error: 'Nao autenticado' }), { status: 401, headers: CORS });
  const hasActivePlan = await checkActivePlan(user.id, env);
  if (!hasActivePlan && user.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'PLANO_INATIVO', message: 'Voce nao possui um plano de consultas ativo.' }), { status: 403, headers: CORS });
  }
  const apiKey = (env as any).SNOOP_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ success: false, error: 'API Key nao configurada' }), { status: 500, headers: CORS });
  const endpointParts = Array.isArray(params.endpoint) ? params.endpoint : [params.endpoint];
  const endpointPath = endpointParts.join('/');
  const url = new URL(request.url);
  const targetUrl = SNOOP_BASE + '/' + endpointPath + '?' + url.searchParams.toString();
  try {
    const resp = await fetch(targetUrl, {
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
    });
    const contentType = resp.headers.get('content-type') || '';
    const text = await resp.text();

    if (text.trim().startsWith('<') || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'DADOS_NAO_ENCONTRADOS',
          message: 'Foto ou dados não encontrados nesta consulta.',
        }),
        { status: resp.ok ? 200 : 404, headers: CORS }
      );
    }

    try {
      const data = JSON.parse(text);
      try {
        await env.DB.prepare('INSERT INTO consultas_logs (user_id, modulo) VALUES (?, ?)').bind(user.id, endpointPath).run();
      } catch {}
      return new Response(JSON.stringify(data), { status: resp.status, headers: CORS });
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'PARSE_ERROR', message: 'Resposta inválida do servidor de dados.' }),
        { status: 500, headers: CORS }
      );
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: CORS });
  }
};
export const onRequestOptions: PagesFunction<Env> = async () => new Response(null, { headers: CORS });