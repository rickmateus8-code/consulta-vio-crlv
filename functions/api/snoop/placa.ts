/**
 * /api/snoop/placa — Agregação e Mapeamento Completo de Veículos por Placa (Snoop Intelligence v2)
 */
import type { Env } from '../../types';
import { insertConsultasPlano } from '../../utils/db';

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

  // Agregação paralela: consulta /placa, /veiculos/jbr e /generic/placa
  const [placaRes, jbrRes, genRes] = await Promise.all([
    snoopGet('placa', { placa: rawPlaca }, apiKey),
    snoopGet('veiculos/jbr', { placa: rawPlaca }, apiKey),
    snoopGet('generic/placa', { placa: rawPlaca }, apiKey),
  ]);

  const extractObj = (res: any) => {
    if (!res) return null;
    if (Array.isArray(res)) return res[0] || null;
    if (Array.isArray(res.data)) return res.data[0] || null;
    if (Array.isArray(res.body)) return res.body[0] || null;
    return res.body || res.data || res.result || res;
  };

  const pData = extractObj(placaRes);
  const jData = extractObj(jbrRes);
  const gData = extractObj(genRes);

  // Verificar se há dados reais do veículo
  const hasRealData = !!(
    pData?.brand || pData?.marca || pData?.marca_modelo || pData?.owner || pData?.proprietario || pData?.renavam || pData?.chassi || pData?.color || pData?.cor || pData?.placa ||
    jData?.marca_modelo || jData?.chassi || jData?.renavam || jData?.proprietario || jData?.placa ||
    gData?.marca_modelo || gData?.chassi || gData?.renavam || gData?.proprietario || gData?.placa
  );

  if (!hasRealData) {
    return new Response(JSON.stringify({
      success: false,
      error: 'VEICULO_NAO_ENCONTRADO',
      message: `A placa ${rawPlaca} não foi localizada ou não possui registros cadastrados nas bases veiculares.`,
    }), { status: 404, headers: CORS });
  }

  // Formatar restrições
  let restricoesStr = "SEM RESTRIÇÕES";
  const rawRestr = pData?.restrictions || pData?.restricoes || jData?.restricoes || gData?.restricoes;
  if (typeof rawRestr === 'string' && rawRestr.trim()) {
    restricoesStr = rawRestr;
  } else if (typeof rawRestr === 'object' && rawRestr !== null) {
    const list = Object.entries(rawRestr)
      .filter(([, v]) => !!v)
      .map(([k, v]) => (typeof v === 'string' ? v : k.toUpperCase().replace(/_/g, ' ')));
    if (list.length > 0) restricoesStr = list.join(' | ');
  }

  const propNome = (typeof pData?.proprietario === 'object' ? pData?.proprietario?.nome : pData?.owner || pData?.proprietario || pData?.NOME_PROPRIETARIO) ||
                   (typeof jData?.proprietario === 'object' ? jData?.proprietario?.nome : jData?.proprietario) ||
                   (typeof gData?.proprietario === 'object' ? gData?.proprietario?.nome : gData?.proprietario) || "Não informado";

  const propCpf = (typeof pData?.proprietario === 'object' ? pData?.proprietario?.cpf_cnpj : pData?.owner_cpf || pData?.cpf || pData?.cpf_cnpj || pData?.CPF_PROPRIETARIO) ||
                  (typeof jData?.proprietario === 'object' ? jData?.proprietario?.cpf_cnpj : jData?.cpf_cnpj) ||
                  (typeof gData?.proprietario === 'object' ? gData?.proprietario?.cpf_cnpj : gData?.cpf_cnpj) || "Não informado";

  const marcaModelo = pData?.marca_modelo || pData?.brand || jData?.marca_modelo || gData?.marca_modelo || (pData?.marca ? `${pData.marca} ${pData.modelo || ''}` : "") || "Não informado";

  const merged = {
    placa: pData?.plate || pData?.placa || jData?.placa || gData?.placa || rawPlaca,
    placa_mercosul: pData?.placa_nova || jData?.placa_nova || pData?.placa_mercosul || gData?.placa_mercosul || rawPlaca,
    placa_antiga: pData?.placa_antiga || jData?.placa_antiga || gData?.placa_antiga || rawPlaca,
    chassi: pData?.chassi || pData?.chassis || jData?.chassi || gData?.chassi || "Não informado",
    renavam: pData?.renavam || jData?.renavam || gData?.renavam || "Não informado",
    motor: pData?.motor || pData?.engine || jData?.motor || gData?.motor || pData?.NUMERO_MOTOR || "Não informado",
    marca: pData?.brand || pData?.marca || jData?.marca || gData?.marca || "",
    modelo: pData?.model || pData?.modelo || jData?.modelo || gData?.modelo || "",
    marca_modelo: marcaModelo,
    ano_fabricacao: String(pData?.year_fab || pData?.ano_fabricacao || jData?.ano_fabricacao || gData?.ano_fabricacao || pData?.year_model || "Não informado"),
    ano_modelo: String(pData?.year_model || pData?.ano_modelo || jData?.ano_modelo || gData?.ano_modelo || pData?.year_fab || "Não informado"),
    cor: pData?.color || pData?.cor || jData?.cor || gData?.cor || "Não informado",
    combustivel: pData?.fuel || pData?.combustivel || jData?.combustivel || gData?.combustivel || "Não informado",
    uf: pData?.address?.state || pData?.uf || jData?.uf || gData?.uf || pData?.estado || "",
    municipio: pData?.address?.city || pData?.municipio || jData?.municipio || gData?.municipio || pData?.cidade || "",
    proprietario: {
      nome: propNome,
      cpf_cnpj: propCpf,
    },
    restricoes: restricoesStr,
    situacao_veiculo: pData?.situacao_veiculo || jData?.situacao_veiculo || gData?.situacao_veiculo || "EM CIRCULAÇÃO",
    situacao_chassi: pData?.situacao_chassi || jData?.situacao_chassi || gData?.situacao_chassi || "REGULAR",
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
