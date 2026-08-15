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
