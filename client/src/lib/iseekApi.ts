/**
 * iseekApi.ts — Client para o provedor iSeek Pro via proxy seguro Cloudflare Functions
 * Todos os endpoints passam por /api/iseek/[endpoint] (server-side)
 */

const BASE = '/api/iseek';

async function request<T = any>(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<T> {
  let url = `${BASE}/${endpoint}`;
  const options: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };

  if (method === 'GET' && data) {
    const qs = Object.entries(data)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  } else if (method === 'POST' && data) {
    options.body = JSON.stringify(data);
  }

  const res = await fetch(url, options);
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { success: false, error: 'PARSE_ERROR', message: 'Resposta inválida ou vazia do servidor iSeek Pro.' };
  }

  if (!res.ok || json.success === false) {
    const errorMsg = json.message || json.error || (typeof json.details === 'string' ? json.details : json.details?.message) || 'Erro na consulta iSeek Pro';
    throw Object.assign(new Error(errorMsg), {
      status: res.status,
      code: json.error,
      provider: 'iseek',
      details: json.details,
    });
  }
  return json;
}

export const iseekConsultasRestantes = () =>
  request('modulos/1/consultas-restantes', 'GET');

export const iseekCPF = (cpf: string) =>
  request('modulos/1/consultar', 'POST', { cpf });

export const iseekRG = (rg: string) =>
  request('modulos/rg', 'GET', { rg });

export const iseekCEP = (cep: string, numero?: string) =>
  request('modulos/cep', 'GET', { cep, numero });

export const iseekEmail = (email: string) =>
  request('modulos/email', 'GET', { email });

export const iseekTelefone = (telefone: string) =>
  request('modulos/telefone', 'GET', { telefone });

export const iseekNome = (params: { nome: string; cidade?: string; uf?: string; nascimento?: string }) =>
  request('modulos/nome', 'GET', params);
