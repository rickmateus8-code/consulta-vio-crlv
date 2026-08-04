/**
 * snoopApi.ts — Client para a SnoopIntelligence API via proxy seguro
 * Todos os endpoints passam por /api/snoop/[endpoint] (server-side)
 */

const BASE = '/api/snoop';

async function get<T = any>(endpoint: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${BASE}/${endpoint}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.message || data.error || 'Erro na consulta'), { status: res.status, code: data.error });
  return data;
}

// ── Consultas Básicas ────────────────────────────────────────────────────────
export const snoopCPF = (cpf: string) =>
  get('generic/cpf', { cpf });

export const snoopNome = (nome: string, uf?: string) =>
  get('nome', { nome, uf });

export const snoopTelefone = (telefone: string) =>
  get('telefone', { telefone });

// ── Documentos ───────────────────────────────────────────────────────────────
export const snoopRG = (rg: string) =>
  get('rg', { rg });

export const snoopTitulo = (titulo: string) =>
  get('titulo', { titulo });

export const snoopPIS = (pis: string) =>
  get('pis', { pis });

export const snoopNIS = (nis: string) =>
  get('nis', { nis });

// ── Relações ─────────────────────────────────────────────────────────────────
export const snoopParentes = (cpf: string) =>
  get('parentes', { cpf });

export const snoopVizinhos = (cpf: string) =>
  get('vizinhos', { cpf });

// ── Localização ──────────────────────────────────────────────────────────────
export const snoopCEP = (cep: string) =>
  get('cep', { cep });

export const snoopCEP2Emails = (cep: string) =>
  get('cep2', { cep });

export const snoopCEP3Telefones = (cep: string) =>
  get('cep3', { cep });

export const snoopCEP4 = (cep: string, nome?: string, limit?: number) =>
  get('cep4', { cep, nome, limit });

export const snoopEndereco = (uf: string, logradouro: string, cidade?: string, limit?: number) =>
  get('endereco', { uf, logradouro, cidade, limit });

export const snoopEstado = (uf: string) =>
  get('estado', { uf });

// ── Busca por Nome (Variantes) ───────────────────────────────────────────────
export const snoopNome2 = (nome: string) =>
  get('nome2', { nome });

export const snoopNome3 = (nome: string, cpf?: string, cpf_meio?: string, limit?: number) =>
  get('nome3', { nome, cpf, cpf_meio, limit });

export const snoopNome4 = (nome: string, cidade: string, limit?: number) =>
  get('nome4', { nome, cidade, limit });

export const snoopNome5 = (nome: string, ano: string, limit?: number) =>
  get('nome5', { nome, ano, limit });

// ── Contato ──────────────────────────────────────────────────────────────────
export const snoopEmail = (email: string) =>
  get('email', { email });

export const snoopTelefoneDDD = (ddd: string) =>
  get('telefone/ddd', { ddd });

export const snoopTelefoneFull = (phone: string) =>
  get('telefone/full', { phone });

export const snoopTelefoneCPF = (cpf: string) =>
  get('telefone/cpf', { cpf });

// ── Financeiro ───────────────────────────────────────────────────────────────
export const snoopScore = (cpf: string) =>
  get('score', { cpf });

export const snoopRenda = (min?: number, max?: number, limit?: number) =>
  get('renda', { min, max, limit });

export const snoopCBO = (cbo: string) =>
  get('cbo', { cbo });

export const snoopProfissao = (profissao: string) =>
  get('profissao', { profissao });

export const snoopBIN = (bin: string) =>
  get('bin', { bin });

export const snoopBanco = (codigo: string) =>
  get('banco', { codigo });

// ── Fotos ────────────────────────────────────────────────────────────────────
export const snoopFoto = (cpf: string) =>
  get('foto', { cpf });

export const snoopFotoSP = (cpf: string) =>
  get('foto-sp', { cpf });

export const snoopFotoMA = (cpf: string) =>
  get('foto-ma', { cpf });

export const snoopFotoRO = (cpf: string) =>
  get('foto-ro', { cpf });

export const snoopFotoAll = (cpf: string) =>
  get('foto-all', { cpf });

// ── Veículos & Outros ────────────────────────────────────────────────────────
export const snoopPlaca = (placa: string) =>
  get('placa', { placa });

export const snoopOperadora = (telefone: string) =>
  get('operadora', { telefone });

export const snoopRandom = () =>
  get('random');

export const snoopProfissionais = (cpf: string) =>
  get('profissionais', { cpf });

export const snoopVeiculosJBR = (cpf: string) =>
  get('veiculos-jbr', { cpf });

export const snoopGeo = (cpf: string) =>
  get('geo', { cpf });

export const snoopPerfilCPF = (cpf: string) =>
  get('perfil-cpf', { cpf });

// ── Planos ───────────────────────────────────────────────────────────────────
export const getPlanoStatus = () =>
  fetch('/api/consultas-plano', { credentials: 'include' }).then(r => r.json());

export const comprarPlano = (plano: 'diario' | 'semanal' | 'mensal') =>
  fetch('/api/consultas-plano', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plano }),
  }).then(r => r.json());
