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
      'SELECT id FROM consultas_planos WHERE user_id = ? AND expires_at > datetime(\'now\') LIMIT 1'
    ).bind(user.id).first<any>();
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
  const hasActivePlan = await checkActivePlan(user, env);
  if (!hasActivePlan && user.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'PLANO_INATIVO' }), { status: 403, headers: CORS });
  }
  const apiKey = (env as any).SNOOP_API_KEY || "snp_dP3ynuQD-sTMH-CVmi-1kQh-yJNuqT7tMP3f";
  const url = new URL(request.url);
  const cpf = (url.searchParams.get('cpf') || '').replace(/\D/g, '');
  if (!cpf || cpf.length < 11) {
    return new Response(JSON.stringify({ success: false, error: 'CPF invalido' }), { status: 400, headers: CORS });
  }

  const bypassCache = true; // Forçar atualização em tempo real automaticamente e de forma silenciosa
  if (false) {
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
    snoopGet('foto/sp', { cpf }, apiKey).then(res => res || snoopGet('foto-sp', { cpf }, apiKey)),
    snoopGet('foto/ma', { cpf }, apiKey).then(res => res || snoopGet('foto-ma', { cpf }, apiKey)),
    snoopGet('foto/ro', { cpf }, apiKey).then(res => res || snoopGet('foto-ro', { cpf }, apiKey)),
    snoopGet('foto/all', { cpf }, apiKey).then(res => res || snoopGet('foto-all', { cpf }, apiKey)),
    snoopGet('parentes', { cpf }, apiKey),
    snoopGet('vizinhos', { cpf }, apiKey),
    snoopGet('score', { cpf }, apiKey),
    snoopGet('profissionais', { cpf }, apiKey),
    snoopGet('telefone/cpf', { cpf }, apiKey),
    snoopGet('veiculos/jbr', { cpf }, apiKey).then(res => res || snoopGet('veiculos-jbr', { cpf }, apiKey)),
    snoopGet('geo', { cpf }, apiKey),
  ]);

  const getValidPhoto = (obj: any): string | null => {
    if (!obj) return null;
    if (obj.success === false) return null;
    if (typeof obj === 'string') {
      const trimmed = obj.trim();
      if (trimmed.length > 50 || trimmed.startsWith('data:') || trimmed.startsWith('http')) {
        return trimmed;
      }
      return null;
    }
    if (typeof obj === 'object') {
      const candidate = obj.foto ?? obj.url ?? obj.base64 ?? obj.data ?? obj.body;
      if (candidate && typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed.length > 50 || trimmed.startsWith('data:') || trimmed.startsWith('http')) {
          return trimmed;
        }
      }
    }
    return null;
  };

  const rawCpf = cpfData?.body ?? cpfData?.data ?? cpfData ?? {};

  const cleanFotoNacional = getValidPhoto(fotoData) ?? getValidPhoto(fotoCpfData) ?? getValidPhoto(fotoAllData?.nacional) ?? getValidPhoto(fotoAllData?.body?.nacional) ?? rawCpf.foto ?? rawCpf.fotos?.nacional ?? null;
  const cleanFotoSP = getValidPhoto(fotoSPData) ?? getValidPhoto(fotoAllData?.sp) ?? getValidPhoto(fotoAllData?.body?.sp) ?? rawCpf.foto_sp ?? rawCpf.fotos?.sp ?? null;
  const cleanFotoMA = getValidPhoto(fotoMAData) ?? getValidPhoto(fotoAllData?.ma) ?? getValidPhoto(fotoAllData?.body?.ma) ?? rawCpf.foto_ma ?? rawCpf.fotos?.ma ?? null;
  const cleanFotoRO = getValidPhoto(fotoROData) ?? getValidPhoto(fotoAllData?.ro) ?? getValidPhoto(fotoAllData?.body?.ro) ?? rawCpf.foto_ro ?? rawCpf.fotos?.ro ?? null;

  const fontesConsultadas = {
    receita_federal: !!(rawCpf.name || rawCpf.nome || rawCpf.cpf),
    foto_nacional: !!cleanFotoNacional,
    foto_sp: !!cleanFotoSP,
    foto_ma: !!cleanFotoMA,
    foto_ro: !!cleanFotoRO,
    telefones: Array.isArray(telefones?.data || telefones?.body || telefones || rawCpf.phones) && (telefones?.data || telefones?.body || telefones || rawCpf.phones).length > 0,
    enderecos: Array.isArray(rawCpf.all_addresses || rawCpf.enderecos) && (rawCpf.all_addresses || rawCpf.enderecos).length > 0,
    parentes: Array.isArray(parentes?.data || parentes?.body || parentes || rawCpf.parentes) && (parentes?.data || parentes?.body || parentes || rawCpf.parentes).length > 0,
    score: !!(score?.data || score?.body || score || rawCpf.score),
    veiculos: Array.isArray(veiculos?.data || veiculos?.body || veiculos || rawCpf.vehicles) && (veiculos?.data || veiculos?.body || veiculos || rawCpf.vehicles).length > 0,
  };

  const perfil: any = {
    cpf_dados: rawCpf,
    foto: cleanFotoNacional,
    fotos: {
      nacional: cleanFotoNacional,
      sp: cleanFotoSP,
      ma: cleanFotoMA,
      ro: cleanFotoRO,
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