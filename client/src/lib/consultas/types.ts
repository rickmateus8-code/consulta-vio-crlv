/**
 * DocMaster — Definições de Tipos e Interfaces para Módulo de Consultas
 * Estritamente tipado (ZERO `any` novo), desacoplando a resposta bruta (RAW) da UI (ViewModel).
 */

export type ConsultaErrorType =
  | 'NO_RESULTS'
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'LIMIT_ERROR'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'INVALID_RESPONSE';

export interface ConsultaErrorDetails {
  type: ConsultaErrorType;
  title: string;
  message: string;
}

export function mapConsultaError(err: unknown): ConsultaErrorDetails {
  if (!err) {
    return {
      type: 'SERVER_ERROR',
      title: 'Serviço Indisponível',
      message: 'O serviço de consultas está temporariamente indisponível.',
    };
  }

  const errObj = (typeof err === 'object' && err !== null ? err : {}) as Record<string, unknown>;
  const code = String(errObj.error || errObj.code || '').toUpperCase();
  const msg = String(errObj.message || (typeof err === 'string' ? err : ''));

  if (code === 'PLANO_INATIVO' || code === 'LIMIT_EXCEEDED') {
    return {
      type: 'LIMIT_ERROR',
      title: 'Limite de Plano',
      message: 'Você precisa de um plano ativo com saldo para realizar novas consultas.',
    };
  }
  if (code === 'UNAUTHENTICATED' || code === 'NAO_AUTENTICADO' || msg.includes('autenticado')) {
    return {
      type: 'AUTH_ERROR',
      title: 'Sessão Expirada',
      message: 'Sua sessão de acesso expirou. Faça login para continuar.',
    };
  }
  if (code === 'VALIDATION_ERROR' || code === 'INVALID_INPUT' || msg.toLowerCase().includes('invalido') || msg.toLowerCase().includes('inválido')) {
    return {
      type: 'VALIDATION_ERROR',
      title: 'Dados Inválidos',
      message: 'Verifique os dados informados e tente novamente.',
    };
  }
  if (code === 'DADOS_NAO_ENCONTRADOS' || code === 'NO_DATA') {

    return {
      type: 'NO_RESULTS',
      title: 'Nenhum Registro Localizado',
      message: 'Nenhum registro localizado para os parâmetros informados.',
    };
  }
  if (code === 'PARSE_ERROR' || msg.includes('Unexpected token')) {
    return {
      type: 'INVALID_RESPONSE',
      title: 'Resposta Inválida',
      message: 'A resposta recebida do servidor não pôde ser processada.',
    };
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return {
      type: 'NETWORK_ERROR',
      title: 'Falha de Conexão',
      message: 'Não foi possível conectar ao serviço de consulta. Verifique sua conexão.',
    };
  }

  return {
    type: 'SERVER_ERROR',
    title: 'Erro no Serviço',
    message: msg || 'Não foi possível retornar os dados para esta consulta.',
  };
}

export interface TelefoneItem {
  numero: string;
  tipo?: string;
  fonte?: string;
}

export interface EnderecoItem {
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  tipo?: string;
}

export interface ParenteItem {
  nome: string;
  cpf?: string;
  vinculo?: string;
}

export interface VeiculoItem {
  placa?: string;
  modelo?: string;
  marca?: string;
  ano?: string;
  cor?: string;
}

export interface VacinaItem {
  nome: string;
  dose: string;
  fabricante: string;
  lote: string;
  dataAplicacao: string;
  local: string;
}

export interface BeneficioItem {
  programa: string;
  parcelasCount: number;
  ultimoValor?: string;
  nisFavorecido?: string;
}

export interface SerasaMosaicInfo {
  codMosaic?: string;
  descricaoMosaic?: string;
  descMosaicSecundario?: string;
}

export interface PoderAquisitivoInfo {
  poderAquisitivo?: string;
  faixaRenda?: string;
  rendaEstimada?: string;
}

export interface ConsultaViewModel {
  cpf: string;
  nome: string;
  nascimento?: string;
  idadeStr?: string;
  signoStr?: string;
  sexo?: string;
  mae?: string;
  pai?: string;
  naturalidade?: string;
  statusReceita: string;
  rg?: string;
  cnh?: string;
  tituloEleitor?: string;
  pisNis?: string;
  renda?: string;
  scoreVal?: string | number;
  profissao?: string;
  isDeceased: boolean;
  isCpfIrregular: boolean;
  enderecoPrincipal: string;
  enderecos: EnderecoItem[];
  telefones: TelefoneItem[];
  parentes: ParenteItem[];
  veiculos: VeiculoItem[];
  vacinas: VacinaItem[];
  beneficios: BeneficioItem[];
  serasaMosaic: SerasaMosaicInfo;
  poderAquisitivo: PoderAquisitivoInfo;
  emails: string[];
  fotos: { label: string; url: string }[];
  isCache: boolean;
  totalRecordsFound: number;
  isFullyEmpty: boolean;
}

export interface ModuleParamConfig {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'cpf' | 'cnpj' | 'phone' | 'email' | 'plate';
  mask?: string;
  maxLength?: number;
}

export interface ModuleConfig {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: string;
  params: ModuleParamConfig[];
  creditsCost: number;
}

export interface ConsultasPlanItem {
  id?: string | number;
  user_id?: number;
  plano?: string;
  valor?: number;
  is_free?: boolean;
  expires_at?: string;
}

export interface ConsultasPlanStatus {
  success?: boolean;
  is_free?: boolean;
  plan?: ConsultasPlanItem | null;
  expired_plan?: ConsultasPlanItem | null;
  is_expired?: boolean;
  balance?: number;
  usage_24h?: number;
  usage_by_modulo?: Record<string, number>;
  error?: string;
}

export interface ConsultationHistoryItem {
  id: number;
  modulo: string;
  created_at: string;
}

export interface ConsultationHistoryResponse {
  success?: boolean;
  history?: ConsultationHistoryItem[];
  error?: string;
}
