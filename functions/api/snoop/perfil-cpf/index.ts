/**
 * /api/snoop/perfil-cpf — Endpoint de agregacao: busca todos os dados de um CPF em paralelo
 * Retorna um perfil unificado e completo para exibicao.
 */
import type { Env } from '../../../types';

const SNOOP_BASE = 'https://snoopintelligence.cloud/api/v2';
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

async function checkActivePlan(userId: number, env: Env): Promise<boolean> {
  try {
    const plan = await env.DB.prepare(
      'SELECT id FROM consultas_planos WHERE user_id = ? AND expires_at > datetime(\'now\') LIMIT 1'
    ).bind(userId).first<any>();
    return !!plan;
  } catch { return false; }
}

async function snoopGet(endpoint: string, params: Record<string, string>, apiKey: string): Promise<any> {
  try {
    const qs = new URLSearchParams(params).toString();
    const url = SNOOP_BASE + '/' + endpoint + (qs ? '?' + qs : '');
    const resp = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const text = await resp.text();
    if (text.trim().startsWith('<')) return null;
    return JSON.parse(text);
  } catch { return null; }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const user = await getUserFromSession(request, env);
  if (!user) return new Response(JSON.stringify({ success: false, error: 'Nao autenticado' }), { status: 401, headers: CORS });
  const hasActivePlan = await checkActivePlan(user.id, env);
  if (!hasActivePlan && user.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'PLANO_INATIVO' }), { status: 403, headers: CORS });
  }
  const apiKey = (env as any).SNOOP_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ success: false, error: 'API Key nao configurada' }), { status: 500, headers: CORS });
  const url = new URL(request.url);
  const cpf = (url.searchParams.get('cpf') || '').replace(/\D/g, '');
  if (!cpf || cpf.length < 11) {
    return new Response(JSON.stringify({ success: false, error: 'CPF invalido' }), { status: 400, headers: CORS });
  }

  // Todas as requisicoes paralelas para agregacao total do perfil
  const [cpfData, fotoData, parentes, vizinhos, score, profissionais, telefones, veiculos] = await Promise.all([
    snoopGet('generic/cpf', { cpf }, apiKey),
    snoopGet('foto', { cpf }, apiKey),
    snoopGet('parentes', { cpf }, apiKey),
    snoopGet('vizinhos', { cpf }, apiKey),
    snoopGet('score', { cpf }, apiKey),
    snoopGet('profissionais', { cpf }, apiKey),
    snoopGet('telefone/cpf', { cpf }, apiKey),
    snoopGet('veiculos-jbr', { cpf }, apiKey),
  ]);

  const perfil = {
    cpf_dados: cpfData?.body ?? cpfData?.data ?? cpfData ?? null,
    foto: fotoData?.foto || fotoData?.url || (fotoData?.success ? fotoData : null),
    parentes: parentes?.data ?? parentes ?? null,
    vizinhos: vizinhos?.data ?? vizinhos ?? null,
    score: score?.data ?? score ?? null,
    profissionais: profissionais?.data ?? profissionais ?? null,
    telefones: telefones?.data ?? telefones ?? null,
    veiculos: veiculos?.data ?? veiculos ?? null,
  };

  return new Response(JSON.stringify({ success: true, cpf, perfil }), { headers: CORS });
};

export const onRequestOptions: PagesFunction<Env> = async () => new Response(null, { headers: CORS });