/**
 * /api/snoop/perfil-cpf — Agregação total e ultra-completa de dados por CPF com Cache D1 & Foto-All
 */
import type { Env } from '../../../types';
import { insertConsultasPlano } from '../../../utils/db';

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

  // Agregação paralela limpa e precisa (sem requisições desnecessárias a CEP vizinhos/entorno)
  const [cpfData, fotoData, fotoAllData, parentes, score, profissionais, telefones, veiculos, geoData] = await Promise.all([
    snoopGet('generic/cpf', { cpf }, apiKey),
    snoopGet('foto', { cpf }, apiKey),
    snoopGet('foto/all', { cpf }, apiKey),
    snoopGet('parentes', { cpf }, apiKey),
    snoopGet('score', { cpf }, apiKey),
    snoopGet('profissionais', { cpf }, apiKey),
    snoopGet('telefone/cpf', { cpf }, apiKey),
    snoopGet('veiculos/jbr', { cpf }, apiKey),
    snoopGet('geo', { cpf }, apiKey),
  ]);


  const getValidPhoto = (obj: any): string | null => {
    if (!obj) return null;
    if (obj.success === false && !obj.foto && !obj.base64 && !obj.data && !obj.body) return null;

    if (typeof obj === 'string') {
      const trimmed = obj.trim();
      if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
      if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
      }
      const cleanB64 = trimmed.replace(/\s+/g, '');
      if (cleanB64.length > 30 && /^[A-Za-z0-9+/=]+$/.test(cleanB64)) {
        let mime = 'jpeg';
        if (cleanB64.startsWith('iVBORw0KGgo')) mime = 'png';
        else if (cleanB64.startsWith('R0lGOD')) mime = 'gif';
        return `data:image/${mime};base64,${cleanB64}`;
      }
      return null;
    }

    if (typeof obj === 'object') {
      const candidate = obj.foto ?? obj.url ?? obj.base64 ?? obj.data ?? obj.body ?? obj.nacional;
      if (candidate && candidate !== obj) {
        return getValidPhoto(candidate);
      }
    }
    return null;
  };

  const rawCpf = cpfData?.body ?? cpfData?.data ?? cpfData ?? {};

  const cleanFotoNacional = getValidPhoto(fotoData) ?? getValidPhoto(fotoAllData?.nacional) ?? getValidPhoto(fotoAllData?.body?.nacional) ?? getValidPhoto(rawCpf.foto) ?? getValidPhoto(rawCpf.fotos?.nacional) ?? getValidPhoto(rawCpf.foto_nacional) ?? null;
  const cleanFotoSP = getValidPhoto(fotoAllData?.sp) ?? getValidPhoto(fotoAllData?.body?.sp) ?? getValidPhoto(rawCpf.foto_sp) ?? getValidPhoto(rawCpf.fotos?.sp) ?? null;
  const cleanFotoMA = getValidPhoto(fotoAllData?.ma) ?? getValidPhoto(fotoAllData?.body?.ma) ?? getValidPhoto(rawCpf.foto_ma) ?? getValidPhoto(rawCpf.fotos?.ma) ?? null;
  const cleanFotoRO = getValidPhoto(fotoAllData?.ro) ?? getValidPhoto(fotoAllData?.body?.ro) ?? getValidPhoto(rawCpf.foto_ro) ?? getValidPhoto(rawCpf.fotos?.ro) ?? null;
  const cleanFotoCNH = getValidPhoto(rawCpf.foto_cnh) ?? getValidPhoto(rawCpf.cnh_foto) ?? null;
  const cleanFotoRG = getValidPhoto(rawCpf.foto_rg) ?? getValidPhoto(rawCpf.rg_foto) ?? null;

  const toArray = (v: any): any[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (Array.isArray(v.data)) return v.data;
    if (Array.isArray(v.body)) return v.body;
    if (typeof v === 'object') return [v];
    return [];
  };

  // Fusão e Desduplicação de Telefones
  const rawPhones = [
    ...toArray(telefones),
    ...toArray(rawCpf.phones),
    ...toArray(rawCpf.telefones),
    ...(rawCpf.phone ? [rawCpf.phone] : []),
    ...(rawCpf.celular ? [rawCpf.celular] : []),
  ];
  const uniquePhonesMap = new Map();
  rawPhones.forEach(p => {
    const num = typeof p === 'string' ? p : p?.numero || p?.phone || p?.telefone || p?.number;
    if (!num) return;
    const cleanNum = String(num).replace(/\D/g, '');
    if (cleanNum && !uniquePhonesMap.has(cleanNum)) {
      uniquePhonesMap.set(cleanNum, typeof p === 'object' ? p : { numero: String(num) });
    }
  });
  const mergedTelefones = Array.from(uniquePhonesMap.values());

  // Fusão e Desduplicação de Parentes
  const rawParentes = [
    ...toArray(parentes),
    ...toArray(rawCpf.parentes),
    ...toArray(rawCpf.relatives),
  ];
  const uniqueParentesMap = new Map();
  rawParentes.forEach(p => {
    const key = (p?.cpf || p?.CPF || p?.nome || p?.NOME || JSON.stringify(p));
    if (key && !uniqueParentesMap.has(key)) {
      uniqueParentesMap.set(key, p);
    }
  });
  const mergedParentes = Array.from(uniqueParentesMap.values());

  // Fusão e Desduplicação de Veículos
  const rawVeiculos = [
    ...toArray(veiculos),
    ...toArray(rawCpf.vehicles),
    ...toArray(rawCpf.veiculos),
  ];
  const uniqueVeiculosMap = new Map();
  rawVeiculos.forEach(v => {
    const placa = (v?.placa || v?.PLACA || v?.chassi || v?.renavam || JSON.stringify(v));
    if (placa && !uniqueVeiculosMap.has(placa)) {
      uniqueVeiculosMap.set(placa, v);
    }
  });
  const mergedVeiculos = Array.from(uniqueVeiculosMap.values());

  const fontesConsultadas = {
    receita_federal: !!(rawCpf.name || rawCpf.nome || rawCpf.cpf),
    foto_nacional: !!cleanFotoNacional,
    foto_sp: !!cleanFotoSP,
    foto_ma: !!cleanFotoMA,
    foto_ro: !!cleanFotoRO,
    telefones: mergedTelefones.length > 0,
    enderecos: Array.isArray(rawCpf.all_addresses || rawCpf.enderecos) && (rawCpf.all_addresses || rawCpf.enderecos).length > 0,
    parentes: mergedParentes.length > 0,
    score: !!(score?.data || score?.body || score || rawCpf.score),
    veiculos: mergedVeiculos.length > 0,
  };

  const perfil: any = {
    cpf_dados: rawCpf,
    foto: cleanFotoNacional,
    foto_sp: cleanFotoSP,
    foto_ma: cleanFotoMA,
    foto_ro: cleanFotoRO,
    foto_cnh: cleanFotoCNH,
    foto_rg: cleanFotoRG,
    fotos: {
      nacional: cleanFotoNacional,
      sp: cleanFotoSP,
      ma: cleanFotoMA,
      ro: cleanFotoRO,
      cnh: cleanFotoCNH,
      rg: cleanFotoRG,
      all: fotoAllData?.data ?? fotoAllData?.body ?? fotoAllData ?? null,
    },
    parentes: mergedParentes.length > 0 ? mergedParentes : (rawCpf.parentes ?? null),
    vizinhos: null,
    score: score?.data ?? score?.body ?? score ?? rawCpf.score ?? null,

    profissionais: profissionais?.data ?? profissionais?.body ?? profissionais ?? rawCpf.profissionais ?? null,
    telefones: mergedTelefones.length > 0 ? mergedTelefones : (rawCpf.phones ?? rawCpf.telefones ?? null),
    veiculos: mergedVeiculos.length > 0 ? mergedVeiculos : (rawCpf.vehicles ?? rawCpf.veiculos ?? null),
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