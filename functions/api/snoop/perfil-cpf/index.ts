/**
 * /api/snoop/perfil-cpf — Agregação total e ultra-completa de dados por CPF com Cache D1 & Foto-All
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
        'Accept': 'application/json, text/plain, image/*, */*',
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!resp.ok) return null;

    const contentType = resp.headers.get('content-type') || '';
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
      return { success: true, foto: `data:${mime};base64,${base64}` };
    }

    const text = await resp.text();
    if (text.trim().startsWith('<')) return null;
    try {
      return JSON.parse(text);
    } catch {
      const trimmed = text.trim();
      if (trimmed.length > 50 && /^[A-Za-z0-9+/=]+$/.test(trimmed.replace(/\s+/g, ""))) {
        return { success: true, foto: trimmed };
      }
      return null;
    }
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
  const apiKey = (env as any).SNOOP_API_KEY || "snp_dP3ynuQD-sTMH-CVmi-1kQh-yJNuqT7tMP3f";
  const url = new URL(request.url);
  const cpf = (url.searchParams.get('cpf') || '').replace(/\D/g, '');
  if (!cpf || cpf.length < 11) {
    return new Response(JSON.stringify({ success: false, error: 'CPF invalido' }), { status: 400, headers: CORS });
  }

  const bypassCache = url.searchParams.get('fresh') === 'true';
  if (!bypassCache) {
    try {
      const cached = await env.DB.prepare(
        "SELECT payload FROM consultas_cache WHERE key = ? AND datetime(updated_at, '+15 days') > datetime('now')"
      ).bind(`cpf:${cpf}`).first<any>();
      if (cached?.payload) {
        const perfilCached = JSON.parse(cached.payload);
        return new Response(JSON.stringify({ success: true, cpf, perfil: perfilCached, from_cache: true }), { headers: CORS });
      }
    } catch {}
  }

  // Agregação paralela bruta de todas as bases Snoop Intelligence
  const [cpfData, fotoData, fotoCpfData, fotoSPData, fotoMAData, fotoROData, fotoAllData, parentes, vizinhos, score, profissionais, telefones, veiculos, geoData] = await Promise.all([
    snoopGet('generic/cpf', { cpf }, apiKey),
    snoopGet('foto', { cpf }, apiKey),
    snoopGet('foto/cpf', { cpf }, apiKey),
    snoopGet('foto-sp', { cpf }, apiKey),
    snoopGet('foto-ma', { cpf }, apiKey),
    snoopGet('foto-ro', { cpf }, apiKey),
    snoopGet('foto-all', { cpf }, apiKey),
    snoopGet('parentes', { cpf }, apiKey),
    snoopGet('vizinhos', { cpf }, apiKey),
    snoopGet('score', { cpf }, apiKey),
    snoopGet('profissionais', { cpf }, apiKey),
    snoopGet('telefone/cpf', { cpf }, apiKey),
    snoopGet('veiculos-jbr', { cpf }, apiKey),
    snoopGet('geo', { cpf }, apiKey),
  ]);

  const rawCpf = cpfData?.body ?? cpfData?.data ?? cpfData ?? {};

  const fontesConsultadas = {
    receita_federal: !!(rawCpf.name || rawCpf.nome || rawCpf.cpf),
    foto_nacional: !!(fotoData || fotoCpfData || fotoAllData?.nacional || rawCpf.foto),
    foto_sp: !!(fotoSPData || fotoAllData?.sp || rawCpf.foto_sp),
    foto_ma: !!(fotoMAData || fotoAllData?.ma || rawCpf.foto_ma),
    foto_ro: !!(fotoROData || fotoAllData?.ro || rawCpf.foto_ro),
    telefones: Array.isArray(telefones?.data || telefones?.body || telefones || rawCpf.phones) && (telefones?.data || telefones?.body || telefones || rawCpf.phones).length > 0,
    enderecos: Array.isArray(rawCpf.all_addresses || rawCpf.enderecos) && (rawCpf.all_addresses || rawCpf.enderecos).length > 0,
    parentes: Array.isArray(parentes?.data || parentes?.body || parentes || rawCpf.parentes) && (parentes?.data || parentes?.body || parentes || rawCpf.parentes).length > 0,
    score: !!(score?.data || score?.body || score || rawCpf.score),
    veiculos: Array.isArray(veiculos?.data || veiculos?.body || veiculos || rawCpf.vehicles) && (veiculos?.data || veiculos?.body || veiculos || rawCpf.vehicles).length > 0,
  };

  const perfil: any = {
    cpf_dados: rawCpf,
    foto: fotoData?.body ?? fotoData?.data ?? fotoData ?? fotoCpfData?.body ?? fotoCpfData?.data ?? fotoCpfData ?? fotoAllData?.nacional ?? rawCpf.foto ?? null,
    fotos: {
      nacional: fotoData?.body ?? fotoData?.data ?? fotoData ?? fotoCpfData?.body ?? fotoCpfData?.data ?? fotoCpfData ?? fotoAllData?.nacional ?? fotoAllData?.body?.nacional ?? rawCpf.foto ?? rawCpf.fotos?.nacional ?? null,
      sp: fotoSPData?.body ?? fotoSPData?.data ?? fotoSPData ?? fotoAllData?.sp ?? fotoAllData?.body?.sp ?? rawCpf.foto_sp ?? rawCpf.fotos?.sp ?? null,
      ma: fotoMAData?.body ?? fotoMAData?.data ?? fotoMAData ?? fotoAllData?.ma ?? fotoAllData?.body?.ma ?? rawCpf.foto_ma ?? rawCpf.fotos?.ma ?? null,
      ro: fotoROData?.body ?? fotoROData?.data ?? fotoROData ?? fotoAllData?.ro ?? fotoAllData?.body?.ro ?? rawCpf.foto_ro ?? rawCpf.fotos?.ro ?? null,
      all: fotoAllData?.data ?? fotoAllData?.body ?? fotoAllData ?? null,
    },
    parentes: parentes?.data ?? parentes?.body ?? parentes ?? rawCpf.parentes ?? null,
    vizinhos: vizinhos?.data ?? vizinhos?.body ?? vizinhos ?? rawCpf.vizinhos ?? null,
    score: score?.data ?? score?.body ?? score ?? rawCpf.score ?? null,
    profissionais: profissionais?.data ?? profissionais?.body ?? profissionais ?? rawCpf.profissionais ?? null,
    telefones: telefones?.data ?? telefones?.body ?? telefones ?? rawCpf.phones ?? rawCpf.telefones ?? null,
    veiculos: veiculos?.data ?? veiculos?.body ?? veiculos ?? rawCpf.vehicles ?? rawCpf.veiculos ?? null,
    geo: geoData?.data ?? geoData?.body ?? geoData ?? null,
    fontes_consultadas: fontesConsultadas,
  };

  try {
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS consultas_cache (key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))"
    ).run();
    await env.DB.prepare(
      "INSERT INTO consultas_cache (key, payload, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = datetime('now')"
    ).bind(`cpf:${cpf}`, JSON.stringify(perfil)).run();
  } catch {}

  try {
    await env.DB.prepare('INSERT INTO consultas_logs (user_id, modulo) VALUES (?, ?)').bind(user.id, 'cpf').run();
  } catch {}

  return new Response(JSON.stringify({ success: true, cpf, perfil }), { headers: CORS });
};

export const onRequestOptions: PagesFunction<Env> = async () => new Response(null, { headers: CORS });