/**
 * /api/iseek/[...endpoint] — Proxy seguro para iSeek Pro API (Provedor Secundário)
 */
import type { Env } from '../../types';
import { insertConsultasPlano } from '../../utils/db';

const ISEEK_BASE = 'https://iseek.pro/api';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN',
  'Content-Type': 'application/json',
};

async function getUserFromSession(request: Request, env: Env): Promise<any | null> {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/docmaster_session=([^;]+)/);
  if (!match) return null;
  const session = await env.DB.prepare(
    'SELECT s.user_id, u.id, u.username, u.role, u.free_documents, u.permissions FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime(\'now\')'
  ).bind(match[1]).first<any>();
  return session || null;
}

async function checkActivePlan(user: any, env: Env): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'admin') return true;
  let freeDocs: string[] = [];
  try {
    if (user.free_documents) {
      freeDocs = typeof user.free_documents === 'string' ? JSON.parse(user.free_documents) : user.free_documents;
    }
  } catch {}
  if (Array.isArray(freeDocs) && freeDocs.includes('consultas')) return true;

  let perms: any = {};
  try {
    if (user.permissions) {
      perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
    }
  } catch {}
  if (Array.isArray(perms?.ferramentas) && perms.ferramentas.includes('consultas')) return true;
  if (Array.isArray(perms?.editaveis) && perms.editaveis.includes('consultas')) return true;

  try {
    const plan = await env.DB.prepare(
      'SELECT id FROM consultas_planos WHERE user_id = ? AND datetime(expires_at) > datetime(\'now\') LIMIT 1'
    ).bind(user.id).first<any>();
    if (plan) return true;

    // Se o usuário não tem plano ativo e NUNCA teve qualquer plano, conceder o Teste Grátis de 1 Dia automaticamente!
    const anyPlanEver = await env.DB.prepare(
      'SELECT id FROM consultas_planos WHERE user_id = ? LIMIT 1'
    ).bind(user.id).first<any>();

    if (!anyPlanEver) {
      const trialExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await insertConsultasPlano(env, user.id, 'Teste Grátis 1 Dia', 0, trialExpiresAt);
      return true;
    }
  } catch (e) {
    console.error('[checkActivePlan] Erro:', e);
  }
  return false;
}


async function handleProxy(request: Request, env: Env, params: any, method: string): Promise<Response> {
  const user = await getUserFromSession(request, env);
  if (!user) {
    return new Response(JSON.stringify({ success: false, error: 'Nao autenticado' }), { status: 401, headers: CORS });
  }

  const hasActivePlan = await checkActivePlan(user, env);
  if (!hasActivePlan && user.role !== 'admin') {
    return new Response(
      JSON.stringify({ success: false, error: 'PLANO_INATIVO', message: 'Voce nao possui um plano de consultas ativo.' }),
      { status: 403, headers: CORS }
    );
  }

  const cookieStr = (env as any).ISEEK_COOKIE || '';
  const csrfToken = (env as any).ISEEK_CSRF_TOKEN || '';

  if (!cookieStr) {
    return new Response(
      JSON.stringify({
        success: false,
        provider: 'iseek',
        error: 'ISEEK_COOKIE_MISSING',
        message: 'Requer Cookie de sessão do iSeek Pro. Configure a variável ISEEK_COOKIE no Cloudflare.',
      }),
      { status: 403, headers: CORS }
    );
  }

  const endpointParts = Array.isArray(params.endpoint) ? params.endpoint : [params.endpoint];
  const endpointPath = endpointParts.join('/');
  const url = new URL(request.url);
  const targetUrl = `${ISEEK_BASE}/${endpointPath}${url.search}`;

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
    'Cookie': cookieStr,
  };

  if (csrfToken) headers['X-CSRF-TOKEN'] = csrfToken;

  let reqInit: RequestInit = { method, headers };

  if (method === 'POST') {
    try {
      const bodyText = await request.text();
      reqInit.body = bodyText;
      headers['Content-Type'] = 'application/json';
    } catch {}
  }

  try {
    const resp = await fetch(targetUrl, reqInit);
    const text = await resp.text();

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawResponse: text, status: resp.status };
    }

    try {
      await env.DB.prepare('INSERT INTO consultas_logs (user_id, modulo) VALUES (?, ?)').bind(user.id, `iseek/${endpointPath}`).run();
    } catch {}

    if (!resp.ok) {
      const errorMsg = data?.message || data?.error || (resp.status === 403 ? 'Acesso negado pelo iSeek Pro (Sessão expirada ou Cloudflare Challenge).' : `Erro HTTP ${resp.status} no iSeek Pro`);
      return new Response(
        JSON.stringify({
          success: false,
          provider: 'iseek',
          error: data?.error || `HTTP_${resp.status}`,
          message: errorMsg,
          details: data
        }),
        { status: resp.status, headers: CORS }
      );
    }

    return new Response(JSON.stringify({ success: true, provider: 'iseek', data }), { status: 200, headers: CORS });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, provider: 'iseek', error: err.message || 'Erro na conexao com iSeek Pro' }),
      { status: 500, headers: CORS }
    );
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => handleProxy(request, env, params, 'GET');
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => handleProxy(request, env, params, 'POST');
export const onRequestOptions: PagesFunction<Env> = async () => new Response(null, { headers: CORS });
