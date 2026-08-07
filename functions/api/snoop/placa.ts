/**
 * /api/snoop/placa — Agregação completa e unificada de veículos por Placa (Snoop Intelligence v2)
 */
import type { Env } from '../../types';

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
    'SELECT s.user_id, u.id, u.username, u.role, u.free_documents FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime(\'now\')'
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
  const hasActivePlan = await checkActivePlan(user, env);
  if (!hasActivePlan) {
    return new Response(JSON.stringify({ success: false, error: 'PLANO_INATIVO', message: 'Voce nao possui um plano de consultas ativo.' }), { status: 403, headers: CORS });
  }

  const apiKey = (env as any).SNOOP_API_KEY || "snp_dP3ynuQD-sTMH-CVmi-1kQh-yJNuqT7tMP3f";
  const url = new URL(request.url);
  const rawPlaca = (url.searchParams.get('placa') || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!rawPlaca || rawPlaca.length < 7) {
    return new Response(JSON.stringify({ success: false, error: 'Placa invalida' }), { status: 400, headers: CORS });
  }

  // Agregação paralela: consulta /placa e /veiculos/jbr
  const [placaRes, jbrRes] = await Promise.all([
    snoopGet('placa', { placa: rawPlaca }, apiKey),
    snoopGet('veiculos/jbr', { placa: rawPlaca }, apiKey),
  ]);

  const pData = placaRes?.data || placaRes?.body || (placaRes?.placa ? placaRes : null);
  const jData = jbrRes?.data || jbrRes?.body || (jbrRes?.placa ? jbrRes : null);

  if (!pData && !jData) {
    return new Response(JSON.stringify({
      success: false,
      error: 'VEICULO_NAO_ENCONTRADO',
      message: 'Nenhum veículo foi localizado para a placa informada.',
    }), { status: 404, headers: CORS });
  }

  const propNome = pData?.proprietario?.nome || pData?.proprietario || pData?.PROPRIETARIO || pData?.NOME_PROPRIETARIO || jData?.proprietario || "Não informado";
  const propCpf = pData?.proprietario?.cpf_cnpj || pData?.CPF_PROPRIETARIO || pData?.cpf_cnpj || jData?.cpf_cnpj || "Não informado";

  const merged = {
    placa: pData?.placa || jData?.placa || rawPlaca,
    placa_mercosul: pData?.placa_mercosul || jData?.placa_nova || pData?.placa_nova || pData?.placa || rawPlaca,
    placa_antiga: jData?.placa_antiga || pData?.placa_antiga || pData?.placa || rawPlaca,
    chassi: pData?.chassi || jData?.chassi || "Não informado",
    renavam: pData?.renavam || jData?.renavam || "Não informado",
    motor: pData?.motor || jData?.motor || pData?.NUMERO_MOTOR || jData?.NUMERO_MOTOR || "Não informado",
    marca: pData?.marca || jData?.marca || "",
    modelo: pData?.modelo || jData?.modelo || "",
    marca_modelo: pData?.marca_modelo || jData?.marca_modelo || (pData?.marca ? `${pData.marca} ${pData.modelo || ''}` : "") || "Não informado",
    ano_fabricacao: pData?.ano_fabricacao || jData?.ano_fabricacao || pData?.ano || jData?.ano_modelo || "Não informado",
    ano_modelo: pData?.ano_modelo || jData?.ano_modelo || pData?.ano || jData?.ano_fabricacao || "Não informado",
    cor: pData?.cor || jData?.cor || "Não informado",
    combustivel: pData?.combustivel || jData?.combustivel || "Não informado",
    uf: pData?.uf || jData?.uf || pData?.estado || "",
    municipio: pData?.municipio || jData?.municipio || pData?.cidade || "",
    proprietario: {
      nome: propNome,
      cpf_cnpj: propCpf,
    },
    restricoes: pData?.restricoes || pData?.RESTRIÇÃO || jData?.restricoes || "SEM RESTRIÇÕES",
    situacao_veiculo: pData?.situacao_veiculo || jData?.situacao_veiculo || "EM CIRCULAÇÃO",
    situacao_chassi: pData?.situacao_chassi || jData?.situacao_chassi || "REGULAR",
  };

  try {
    await env.DB.prepare('INSERT INTO consultas_logs (user_id, modulo) VALUES (?, ?)').bind(user.id, 'placa').run();
  } catch {}

  return new Response(JSON.stringify({
    success: true,
    data: merged,
  }), { headers: CORS });
};

export const onRequestOptions: PagesFunction<Env> = async () => new Response(null, { headers: CORS });
