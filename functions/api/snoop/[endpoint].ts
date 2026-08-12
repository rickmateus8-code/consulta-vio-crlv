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
    return !!plan;
  } catch { return false; }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const user = await getUserFromSession(request, env);
  if (!user) return new Response(JSON.stringify({ success: false, error: 'Nao autenticado' }), { status: 401, headers: CORS });
  const hasActivePlan = await checkActivePlan(user, env);
  if (!hasActivePlan && user.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'PLANO_INATIVO', message: 'Voce nao possui um plano de consultas ativo.' }), { status: 403, headers: CORS });
  }
  const apiKey = (env as any).SNOOP_API_KEY || "snp_dP3ynuQD-sTMH-CVmi-1kQh-yJNuqT7tMP3f";
  const endpointParts = Array.isArray(params.endpoint) ? params.endpoint : [params.endpoint];
  const endpointPath = endpointParts.join('/');
  const url = new URL(request.url);
  const targetUrl = SNOOP_BASE + '/' + endpointPath + '?' + url.searchParams.toString();
  try {
    const resp = await fetch(targetUrl, {
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, image/*, */*',
      },
    });
    const contentType = resp.headers.get('content-type') || '';

    // Tratar se for imagem binária
    if (contentType.includes('image/') || (!contentType.includes('application/json') && resp.headers.has('content-length') && !contentType.includes('text/html'))) {
      const arrayBuffer = await resp.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      const len = uint8Array.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      const mime = contentType.includes('image/') ? contentType.split(';')[0] : 'image/jpeg';
      try {
        await env.DB.prepare('INSERT INTO consultas_logs (user_id, modulo) VALUES (?, ?)').bind(user.id, endpointPath).run();
      } catch {}
      return new Response(
        JSON.stringify({ success: true, foto: `data:${mime};base64,${base64}` }),
        { status: 200, headers: CORS }
      );
    }

    const text = await resp.text();

    if (text.trim().startsWith('<') || (!contentType.includes('application/json') && !contentType.includes('text/plain'))) {
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
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        const trimmed = text.trim();
        const cleanB64 = trimmed.replace(/\s+/g, "");
        if (cleanB64.length > 50 && /^[A-Za-z0-9+/=]+$/.test(cleanB64)) {
          let mime = 'jpeg';
          if (cleanB64.startsWith('iVBORw0KGgo')) mime = 'png';
          else if (cleanB64.startsWith('R0lGOD')) mime = 'gif';
          data = { success: true, foto: `data:image/${mime};base64,${cleanB64}` };
        } else {
          throw new Error('Not JSON or base64');
        }
      }
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