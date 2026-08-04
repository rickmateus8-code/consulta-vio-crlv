import { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import ConsultasPlanModal from "@/components/ConsultasPlanModal";
import UnifiedProfileView from "@/components/UnifiedProfileView";
import { getPlanoStatus, comprarPlano } from "@/lib/snoopApi";
import * as SnoopAPI from "@/lib/snoopApi";
import { toast } from "sonner";
import {
  Search, X, Loader2, ChevronRight, Star, StarOff,
  User, Phone, Mail, MapPin, CreditCard, Camera, Car,
  FileText, Users, Home, Briefcase, Hash, Shield,
  AlertTriangle, Clock, CheckCircle2, RefreshCw,
  Eye, Calendar
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Field {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  hint?: string;
}

interface Module {
  id: string;
  label: string;
  description: string;
  icon: string;
  emoji: string;
  category: string;
  fields: Field[];
  apiCall: (params: any) => Promise<any>;
  dailyLimit?: number;
}

// ─── Módulos ─────────────────────────────────────────────────────────────────
const MODULES: Module[] = [
  // BÁSICAS
  {
    id: "cpf",
    label: "CPF Completo",
    description: "Dados completos por CPF",
    icon: "user",
    emoji: "🔍",
    category: "basicas",
    fields: [{ key: "cpf", label: "CPF", placeholder: "000.000.000-00", required: true, hint: "Apenas números ou formatado" }],
    apiCall: (p: any) => SnoopAPI.snoopCPF(p.cpf),
    dailyLimit: 1000,
  },
  {
    id: "nome",
    label: "Busca por Nome",
    description: "Pessoas por nome completo ou parcial",
    icon: "user",
    emoji: "👤",
    category: "basicas",
    fields: [
      { key: "nome", label: "Nome", placeholder: "Nome completo ou parcial", required: true },
      { key: "uf", label: "Estado (opcional)", placeholder: "SP, RJ, MG..." },
    ],
    apiCall: (p: any) => SnoopAPI.snoopNome(p.nome, p.uf),
    dailyLimit: 1000,
  },
  {
    id: "telefone",
    label: "Consulta Telefone",
    description: "Proprietário de um número de telefone",
    icon: "phone",
    emoji: "📞",
    category: "basicas",
    fields: [{ key: "telefone", label: "Telefone", placeholder: "11999999999", required: true, hint: "Com DDD, 11 dígitos" }],
    apiCall: (p: any) => SnoopAPI.snoopTelefone(p.telefone),
    dailyLimit: 500,
  },
  {
    id: "email",
    label: "Consulta Email",
    description: "Dados associados a um email",
    icon: "mail",
    emoji: "✉️",
    category: "basicas",
    fields: [{ key: "email", label: "Email", placeholder: "email@exemplo.com", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopEmail(p.email),
    dailyLimit: 500,
  },
  // DOCUMENTOS
  {
    id: "rg",
    label: "Consulta RG",
    description: "Dados por documento de identidade",
    icon: "card",
    emoji: "🪪",
    category: "documentos",
    fields: [{ key: "rg", label: "RG", placeholder: "123456789", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopRG(p.rg),
    dailyLimit: 500,
  },
  {
    id: "titulo",
    label: "Título de Eleitor",
    description: "Dados por título eleitoral",
    icon: "file",
    emoji: "🗳️",
    category: "documentos",
    fields: [{ key: "titulo", label: "Título de Eleitor", placeholder: "000000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopTitulo(p.titulo),
    dailyLimit: 500,
  },
  {
    id: "pis",
    label: "Consulta PIS/PASEP",
    description: "Dados por PIS ou PASEP",
    icon: "file",
    emoji: "📄",
    category: "documentos",
    fields: [{ key: "pis", label: "PIS/PASEP", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopPIS(p.pis),
    dailyLimit: 500,
  },
  {
    id: "nis",
    label: "Consulta NIS",
    description: "Número de Identificação Social",
    icon: "file",
    emoji: "🆔",
    category: "documentos",
    fields: [{ key: "nis", label: "NIS", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopNIS(p.nis),
    dailyLimit: 500,
  },
  // LOCALIZAÇÃO
  {
    id: "cep",
    label: "Consulta CEP",
    description: "Moradores por CEP (CPF, nome, endereço)",
    icon: "map",
    emoji: "📍",
    category: "localizacao",
    fields: [{ key: "cep", label: "CEP", placeholder: "01234567", required: true, hint: "Apenas números, 8 dígitos" }],
    apiCall: (p: any) => SnoopAPI.snoopCEP(p.cep),
    dailyLimit: 500,
  },
  {
    id: "cep2",
    label: "CEP → Emails",
    description: "Emails de moradores por CEP",
    icon: "mail",
    emoji: "📮",
    category: "localizacao",
    fields: [{ key: "cep", label: "CEP", placeholder: "01234567", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopCEP2Emails(p.cep),
    dailyLimit: 500,
  },
  {
    id: "cep3",
    label: "CEP → Telefones",
    description: "Telefones de moradores por CEP",
    icon: "phone",
    emoji: "☎️",
    category: "localizacao",
    fields: [{ key: "cep", label: "CEP", placeholder: "01234567", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopCEP3Telefones(p.cep),
    dailyLimit: 500,
  },
  {
    id: "cep4",
    label: "CEP + Nome",
    description: "Moradores por CEP e nome",
    icon: "map",
    emoji: "🗺️",
    category: "localizacao",
    fields: [
      { key: "cep", label: "CEP", placeholder: "01234567", required: true },
      { key: "nome", label: "Nome (opcional)", placeholder: "Fulano de Tal" },
    ],
    apiCall: (p: any) => SnoopAPI.snoopCEP4(p.cep, p.nome),
    dailyLimit: 500,
  },
  {
    id: "endereco",
    label: "Busca por Endereço",
    description: "Pessoas por endereço (UF obrigatório)",
    icon: "home",
    emoji: "🏠",
    category: "localizacao",
    fields: [
      { key: "uf", label: "Estado", placeholder: "SP", required: true },
      { key: "logradouro", label: "Rua / Logradouro", placeholder: "Rua Exemplo", required: true },
      { key: "cidade", label: "Cidade (opcional)", placeholder: "São Paulo" },
    ],
    apiCall: (p: any) => SnoopAPI.snoopEndereco(p.uf, p.logradouro, p.cidade),
    dailyLimit: 500,
  },
  {
    id: "estado",
    label: "Busca por Estado",
    description: "Pessoas por UF (CPF, nome, cidade)",
    icon: "map",
    emoji: "🗾",
    category: "localizacao",
    fields: [{ key: "uf", label: "Estado (UF)", placeholder: "SP", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopEstado(p.uf),
    dailyLimit: 100,
  },
  // RELAÇÕES
  {
    id: "parentes",
    label: "Consulta Parentes",
    description: "Parentes de uma pessoa por CPF",
    icon: "users",
    emoji: "👨‍👩‍👧",
    category: "relacoes",
    fields: [{ key: "cpf", label: "CPF", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopParentes(p.cpf),
    dailyLimit: 500,
  },
  {
    id: "vizinhos",
    label: "Consulta Vizinhos",
    description: "Pessoas no mesmo endereço",
    icon: "home",
    emoji: "🏘️",
    category: "relacoes",
    fields: [{ key: "cpf", label: "CPF", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopVizinhos(p.cpf),
    dailyLimit: 500,
  },
  // BUSCA AVANÇADA NOME
  {
    id: "nome2",
    label: "Nome (Base 2)",
    description: "Busca alternativa por nome (segunda base)",
    icon: "user",
    emoji: "🔎",
    category: "nome_avancado",
    fields: [{ key: "nome", label: "Nome", placeholder: "Nome completo", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopNome2(p.nome),
    dailyLimit: 500,
  },
  {
    id: "nome3",
    label: "Nome + CPF Parcial",
    description: "Nome com primeiros dígitos do CPF",
    icon: "user",
    emoji: "🔗",
    category: "nome_avancado",
    fields: [
      { key: "nome", label: "Nome", placeholder: "Nome (mín. 3 chars)", required: true },
      { key: "cpf", label: "Início do CPF (5+ dígitos)", placeholder: "60235", hint: "Modo 1: primeiros dígitos" },
      { key: "cpf_meio", label: "6 dígitos do meio", placeholder: "350049", hint: "Modo 2: dígitos centrais" },
    ],
    apiCall: (p: any) => SnoopAPI.snoopNome3(p.nome, p.cpf, p.cpf_meio),
    dailyLimit: 500,
  },
  {
    id: "nome4",
    label: "Nome + Cidade",
    description: "Nome e cidade (ambos obrigatórios)",
    icon: "user",
    emoji: "📌",
    category: "nome_avancado",
    fields: [
      { key: "nome", label: "Nome", placeholder: "Nome (mín. 4 chars)", required: true },
      { key: "cidade", label: "Cidade", placeholder: "São Paulo", required: true },
    ],
    apiCall: (p: any) => SnoopAPI.snoopNome4(p.nome, p.cidade),
    dailyLimit: 500,
  },
  {
    id: "nome5",
    label: "Nome + Nascimento",
    description: "Nome e ano de nascimento",
    icon: "user",
    emoji: "🎂",
    category: "nome_avancado",
    fields: [
      { key: "nome", label: "Nome", placeholder: "Nome (mín. 3 chars)", required: true },
      { key: "ano", label: "Ano de Nascimento", placeholder: "1985", required: true },
    ],
    apiCall: (p: any) => SnoopAPI.snoopNome5(p.nome, p.ano),
    dailyLimit: 500,
  },
  // FINANCEIRO
  {
    id: "score",
    label: "Score de Crédito",
    description: "Score e análise de crédito por CPF",
    icon: "chart",
    emoji: "📊",
    category: "financeiro",
    fields: [{ key: "cpf", label: "CPF", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopScore(p.cpf),
    dailyLimit: 500,
  },
  {
    id: "renda",
    label: "Faixa de Renda",
    description: "Pessoas por faixa de renda estimada",
    icon: "chart",
    emoji: "💰",
    category: "financeiro",
    fields: [
      { key: "min", label: "Renda Mínima (R$)", placeholder: "1000", hint: "Padrão: 1000" },
      { key: "max", label: "Renda Máxima (R$)", placeholder: "50000", hint: "Padrão: 50000" },
    ],
    apiCall: (p: any) => SnoopAPI.snoopRenda(p.min ? +p.min : undefined, p.max ? +p.max : undefined),
    dailyLimit: 100,
  },
  {
    id: "cbo",
    label: "Busca por CBO",
    description: "Pessoas por Classificação Brasileira de Ocupações",
    icon: "briefcase",
    emoji: "👷",
    category: "financeiro",
    fields: [{ key: "cbo", label: "Código CBO", placeholder: "2231", required: true, hint: "Mínimo 4 dígitos" }],
    apiCall: (p: any) => SnoopAPI.snoopCBO(p.cbo),
    dailyLimit: 500,
  },
  {
    id: "profissao",
    label: "Busca por Profissão",
    description: "Pessoas por código de profissão (alias CBO)",
    icon: "briefcase",
    emoji: "🧑‍💼",
    category: "financeiro",
    fields: [{ key: "profissao", label: "Código de Profissão", placeholder: "2231", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopProfissao(p.profissao),
    dailyLimit: 500,
  },
  {
    id: "bin",
    label: "BIN de Cartão",
    description: "Informações de BIN de cartão de crédito",
    icon: "card",
    emoji: "💳",
    category: "financeiro",
    fields: [{ key: "bin", label: "BIN (6 dígitos)", placeholder: "123456", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopBIN(p.bin),
    dailyLimit: 500,
  },
  {
    id: "banco",
    label: "Informações de Banco",
    description: "Dados de banco por código",
    icon: "card",
    emoji: "🏦",
    category: "financeiro",
    fields: [{ key: "codigo", label: "Código do Banco", placeholder: "001", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopBanco(p.codigo),
    dailyLimit: 500,
  },
  // FOTOS
  {
    id: "foto",
    label: "Foto Nacional",
    description: "Foto oficial por CPF (base nacional)",
    icon: "camera",
    emoji: "📷",
    category: "fotos",
    fields: [{ key: "cpf", label: "CPF", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopFoto(p.cpf),
    dailyLimit: 100,
  },
  {
    id: "foto-sp",
    label: "Fotos São Paulo",
    description: "Foto por CPF — base São Paulo",
    icon: "camera",
    emoji: "🏙️",
    category: "fotos",
    fields: [{ key: "cpf", label: "CPF", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopFotoSP(p.cpf),
    dailyLimit: 50,
  },
  {
    id: "foto-ma",
    label: "Fotos Maranhão",
    description: "Foto por CPF — base Maranhão",
    icon: "camera",
    emoji: "📸",
    category: "fotos",
    fields: [{ key: "cpf", label: "CPF", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopFotoMA(p.cpf),
    dailyLimit: 500,
  },
  {
    id: "foto-ro",
    label: "Fotos Rondônia",
    description: "Foto por CPF — base Rondônia",
    icon: "camera",
    emoji: "📸",
    category: "fotos",
    fields: [{ key: "cpf", label: "CPF", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopFotoRO(p.cpf),
    dailyLimit: 500,
  },
  {
    id: "foto-all",
    label: "Todas as Fotos",
    description: "Todas as fotos disponíveis por CPF",
    icon: "camera",
    emoji: "🖼️",
    category: "fotos",
    fields: [{ key: "cpf", label: "CPF", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopFotoAll(p.cpf),
    dailyLimit: 100,
  },
  // CONTATO / TELEFONE
  {
    id: "telefone-full",
    label: "Telefone Completo",
    description: "Dados completos de um telefone",
    icon: "phone",
    emoji: "📱",
    category: "contato",
    fields: [{ key: "phone", label: "Telefone com DDD", placeholder: "11999999999", required: true, hint: "Mínimo 10 dígitos" }],
    apiCall: (p: any) => SnoopAPI.snoopTelefoneFull(p.phone),
    dailyLimit: 500,
  },
  {
    id: "telefone-ddd",
    label: "Telefones por DDD",
    description: "Lista de telefones por código DDD",
    icon: "phone",
    emoji: "📞",
    category: "contato",
    fields: [{ key: "ddd", label: "DDD", placeholder: "11", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopTelefoneDDD(p.ddd),
    dailyLimit: 500,
  },
  {
    id: "telefone-cpf",
    label: "Telefones de CPF",
    description: "Todos os telefones vinculados a um CPF",
    icon: "phone",
    emoji: "🔗",
    category: "contato",
    fields: [{ key: "cpf", label: "CPF", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopTelefoneCPF(p.cpf),
    dailyLimit: 500,
  },
  {
    id: "operadora",
    label: "Consulta Operadora",
    description: "Operadora de um número de telefone",
    icon: "phone",
    emoji: "📡",
    category: "contato",
    fields: [{ key: "telefone", label: "Telefone com DDD", placeholder: "11999999999", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopOperadora(p.telefone),
    dailyLimit: 500,
  },
  // VEÍCULOS
  {
    id: "placa",
    label: "Consulta Placa",
    description: "Dados do veículo por placa",
    icon: "car",
    emoji: "🚗",
    category: "veiculos",
    fields: [{ key: "placa", label: "Placa", placeholder: "ABC1234 ou ABC1D23", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopPlaca(p.placa),
    dailyLimit: 500,
  },
  {
    id: "veiculos-jbr",
    label: "Veículos por CPF",
    description: "Veículos vinculados a um CPF",
    icon: "car",
    emoji: "🚙",
    category: "veiculos",
    fields: [{ key: "cpf", label: "CPF", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopVeiculosJBR(p.cpf),
    dailyLimit: 500,
  },
  // OUTROS
  {
    id: "geo",
    label: "Geolocalização",
    description: "Dados de geolocalização por CPF",
    icon: "map",
    emoji: "🌍",
    category: "outros",
    fields: [{ key: "cpf", label: "CPF", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopGeo(p.cpf),
    dailyLimit: 500,
  },
  {
    id: "profissionais",
    label: "Dados Profissionais",
    description: "Informações profissionais por CPF",
    icon: "briefcase",
    emoji: "👔",
    category: "outros",
    fields: [{ key: "cpf", label: "CPF", placeholder: "00000000000", required: true }],
    apiCall: (p: any) => SnoopAPI.snoopProfissionais(p.cpf),
    dailyLimit: 500,
  },
  {
    id: "random",
    label: "Dado Aleatório",
    description: "Retorna um registro aleatório da base",
    icon: "hash",
    emoji: "🎲",
    category: "outros",
    fields: [],
    apiCall: () => SnoopAPI.snoopRandom(),
    dailyLimit: 100,
  },
];

// ─── Categorias ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "basicas", label: "Consultas Básicas", emoji: "🔍", description: "CPF, Nome, Telefone, Email" },
  { id: "documentos", label: "Documentos", emoji: "📋", description: "RG, Título, PIS, NIS" },
  { id: "localizacao", label: "Localização", emoji: "📍", description: "CEP, Endereço, Estado" },
  { id: "relacoes", label: "Relações", emoji: "👨‍👩‍👧", description: "Parentes, Vizinhos" },
  { id: "nome_avancado", label: "Busca Avançada por Nome", emoji: "🔎", description: "Nome + CPF, Cidade, Nascimento" },
  { id: "financeiro", label: "Financeiro", emoji: "💰", description: "Score, Renda, CBO, BIN" },
  { id: "fotos", label: "Fotos", emoji: "📷", description: "Fotos por CPF (SP, MA, RO, Nacional)" },
  { id: "contato", label: "Telefone & Contato", emoji: "📞", description: "DDD, Operadora, CPF-Telefone" },
  { id: "veiculos", label: "Veículos", emoji: "🚗", description: "Placa, Veículos por CPF" },
  { id: "outros", label: "Outros", emoji: "⚙️", description: "Geo, Profissionais, Aleatório" },
];

// ─── Componente: Card de Módulo ───────────────────────────────────────────────
function ModuleCard({
  module,
  isFavorite,
  onToggleFavorite,
  onOpen,
}: {
  module: Module;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onOpen: (module: Module) => void;
}) {
  return (
    <div
      onClick={() => onOpen(module)}
      className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl"
      style={{
        background: "linear-gradient(135deg, #5b21b6 0%, #4c1d95 60%, #3730a3 100%)",
        border: "1px solid rgba(139,92,246,0.4)",
        minHeight: "120px",
      }}
    >
      {/* Diagonal stripes overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 2px, transparent 2px, transparent 12px)",
        }}
      />

      {/* Favorite button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(module.id); }}
        className="absolute top-2 right-2 p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 hover:bg-white/20 z-10"
      >
        {isFavorite
          ? <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          : <StarOff className="w-3.5 h-3.5 text-white/60" />
        }
      </button>

      <div className="relative p-4 flex items-start gap-3 h-full">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
          style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" }}
        >
          {module.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-black text-white text-sm uppercase tracking-wide leading-tight">
            {module.label}
          </h3>
          <p className="text-violet-200 text-xs mt-0.5 leading-snug opacity-80">
            {module.description}
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="px-4 py-1.5 flex items-center gap-1.5"
        style={{ background: "rgba(0,0,0,0.25)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
        <span className="text-xs text-emerald-300 font-medium">
          0/{module.dailyLimit ?? 500} consultas hoje
        </span>
      </div>
    </div>
  );
}

// ─── Componente: Modal de Consulta ────────────────────────────────────────────
function ConsultaModal({
  module,
  onClose,
}: {
  module: Module | null;
  onClose: () => void;
}) {
  const [params, setParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (module) { setParams({}); setResult(null); setError(null); }
  }, [module]);

  if (!module) return null;

  const handleConsultar = async () => {
    // Validate required fields
    const missing = module.fields.filter(f => f.required && !params[f.key]?.trim());
    if (missing.length > 0) {
      toast.error(`Preencha: ${missing.map(f => f.label).join(", ")}`);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let data: any;
      if (module.id === "cpf" && params.cpf) {
        data = await SnoopAPI.snoopPerfilCPF(params.cpf);
      } else {
        data = await module.apiCall(params);
      }
      setResult(data);
    } catch (e: any) {
      if (e.code === "PLANO_INATIVO") {
        setError("Plano inativo. Ative um plano para realizar consultas.");
      } else {
        setError(e.message || "Erro na consulta.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => { setParams({}); setResult(null); setError(null); };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col my-auto"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          border: "1px solid rgba(139,92,246,0.4)",
          maxHeight: "92vh",
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #3730a3 0%, #4c1d95 100%)", borderBottom: "1px solid rgba(139,92,246,0.3)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            {module.emoji}
          </div>
          <div className="flex-1">
            <h2 className="font-black text-white text-lg">{module.label}</h2>
            <p className="text-violet-300 text-xs">{module.description}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Fields */}
          <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-violet-500/20">
            {module.fields.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-2">Este módulo não requer parâmetros.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {module.fields.map((field) => (
                  <div key={field.key} className={module.fields.length === 1 ? "md:col-span-2" : ""}>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {field.label}{field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <input
                      type={field.type || "text"}
                      placeholder={field.placeholder}
                      value={params[field.key] || ""}
                      onChange={(e) => setParams(prev => ({ ...prev, [field.key]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") handleConsultar(); }}
                      className="w-full px-4 py-2.5 rounded-xl text-white text-sm outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(139,92,246,0.3)",
                      }}
                      onFocus={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.8)")}
                      onBlur={(e) => (e.target.style.borderColor = "rgba(139,92,246,0.3)")}
                    />
                    {field.hint && <p className="text-[11px] text-slate-500 mt-1">{field.hint}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                Limpar
              </button>
              <button
                onClick={handleConsultar}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs text-white transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                {loading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Consultando...</>
                ) : (
                  <><Search className="w-3.5 h-3.5" /> Consultar</>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl flex items-start gap-2 bg-red-950/40 border border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Result: UnifiedProfileView vs Raw JSON */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-semibold">Resultado da Consulta</span>
                </div>
              </div>

              {result.perfil || result.cpf_dados || result.data?.nome || result.data?.NOME ? (
                <UnifiedProfileView data={result.perfil || result.data || result} />
              ) : (
                <pre
                  className="rounded-xl p-4 text-xs overflow-auto max-h-96"
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(139,92,246,0.2)",
                    color: "#a5f3fc",
                    fontFamily: "Monaco, Consolas, monospace",
                  }}
                >
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Consultas() {
  const { user, updateBalance } = useAuth();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planStatus, setPlanStatus] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("consultas_favorites") || "[]"); } catch { return []; }
  });
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Load plan status
  useEffect(() => {
    getPlanoStatus()
      .then((data) => {
        setPlanStatus(data);
        if (!data.plan) setShowPlanModal(true);
      })
      .catch(() => setPlanStatus({ plan: null }))
      .finally(() => setPlanLoading(false));
  }, []);

  const handlePlanActivated = useCallback(async () => {
    const data = await getPlanoStatus();
    setPlanStatus(data);
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem("consultas_favorites", JSON.stringify(next));
      return next;
    });
  };

  const openModule = (module: Module) => {
    if (!planStatus?.plan) { setShowPlanModal(true); return; }
    setActiveModule(module);
  };

  // Filter modules
  const filteredModules = useMemo(() => {
    let mods = MODULES;
    if (search.trim()) {
      const q = search.toLowerCase();
      mods = mods.filter(m => m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
    }
    if (activeCategory) {
      mods = mods.filter(m => m.category === activeCategory);
    }
    return mods;
  }, [search, activeCategory]);

  const favoriteModules = MODULES.filter(m => favorites.includes(m.id));

  // Plan status badge
  const planExpiresAt = planStatus?.plan?.expires_at
    ? new Date(planStatus.plan.expires_at)
    : null;
  const planIsActive = planExpiresAt && planExpiresAt > new Date();

  return (
    <DashboardLayout>
      <div className="min-h-screen" style={{ background: "#0f172a" }}>
        {/* Header */}
        <div
          className="px-6 py-6"
          style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", borderBottom: "1px solid rgba(139,92,246,0.3)" }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                  >
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-2xl font-black text-white">Consultar Dados</h1>
                </div>
                <p className="text-slate-400 text-sm ml-13">
                  Consulte informações navegando pelas categorias disponíveis para encontrar os dados desejados.
                </p>
              </div>

              {/* Plan status */}
              {planLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Verificando plano...
                </div>
              ) : planIsActive ? (
                <div
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(139,92,246,0.3)" }}
                >
                  <Clock className="w-4 h-4 text-violet-400" />
                  <div>
                    <p className="text-xs text-slate-400">Plano {planStatus.plan.plano}</p>
                    <p className="text-xs text-violet-300 font-semibold">
                      Expira {planExpiresAt!.toLocaleDateString("pt-BR")} às {planExpiresAt!.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="ml-2 px-3 py-1 rounded-lg text-xs font-semibold text-violet-200 hover:bg-violet-500/20 transition-all"
                  >
                    Renovar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                >
                  <Shield className="w-4 h-4" />
                  Ativar Plano de Consultas
                </button>
              )}
            </div>

            {/* Search + Category filter */}
            <div className="mt-5 flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar módulo de consulta..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(139,92,246,0.3)",
                  }}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setActiveCategory(null)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: !activeCategory ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.07)",
                    border: !activeCategory ? "1px solid rgba(124,58,237,0.8)" : "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                  }}
                >
                  Todos
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: activeCategory === cat.id ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.07)",
                      border: activeCategory === cat.id ? "1px solid rgba(124,58,237,0.8)" : "1px solid rgba(255,255,255,0.1)",
                      color: "white",
                    }}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
          {/* Favorites */}
          {favoriteModules.length > 0 && !search && !activeCategory && (
            <section>
              <div
                className="rounded-2xl p-6"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.3)" }}>
                      <Star className="w-4 h-4 text-yellow-400" />
                    </div>
                    <h2 className="font-bold text-white text-base">Mais Usados</h2>
                  </div>
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "rgba(124,58,237,0.5)" }}
                  >
                    {favoriteModules.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {favoriteModules.map(m => (
                    <ModuleCard
                      key={m.id}
                      module={m}
                      isFavorite={favorites.includes(m.id)}
                      onToggleFavorite={toggleFavorite}
                      onOpen={openModule}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Search results */}
          {search && (
            <section>
              <h2 className="text-white font-bold mb-4">
                {filteredModules.length} resultado(s) para "{search}"
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredModules.map(m => (
                  <ModuleCard key={m.id} module={m} isFavorite={favorites.includes(m.id)} onToggleFavorite={toggleFavorite} onOpen={openModule} />
                ))}
              </div>
              {filteredModules.length === 0 && (
                <div className="text-center py-16 text-slate-500">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum módulo encontrado</p>
                </div>
              )}
            </section>
          )}

          {/* Category filter results */}
          {!search && activeCategory && (
            <section>
              {(() => {
                const cat = CATEGORIES.find(c => c.id === activeCategory)!;
                return (
                  <>
                    <div
                      className="rounded-2xl p-6"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "rgba(124,58,237,0.3)" }}>
                            {cat.emoji}
                          </div>
                          <div>
                            <h2 className="font-bold text-white text-base">{cat.label}</h2>
                            <p className="text-slate-500 text-xs">{cat.description}</p>
                          </div>
                        </div>
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "rgba(124,58,237,0.5)" }}>
                          {filteredModules.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredModules.map(m => (
                          <ModuleCard key={m.id} module={m} isFavorite={favorites.includes(m.id)} onToggleFavorite={toggleFavorite} onOpen={openModule} />
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </section>
          )}

          {/* All categories */}
          {!search && !activeCategory && (
            <>
              {CATEGORIES.map((cat) => {
                const catModules = MODULES.filter(m => m.category === cat.id);
                if (catModules.length === 0) return null;
                return (
                  <section key={cat.id}>
                    <div
                      className="rounded-2xl p-6"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "rgba(124,58,237,0.3)" }}>
                            {cat.emoji}
                          </div>
                          <div>
                            <h2 className="font-bold text-white text-base">{cat.label}</h2>
                            <p className="text-slate-500 text-xs">{cat.description}</p>
                          </div>
                        </div>
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "rgba(124,58,237,0.5)" }}>
                          {catModules.length}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {catModules.map(m => (
                          <ModuleCard key={m.id} module={m} isFavorite={favorites.includes(m.id)} onToggleFavorite={toggleFavorite} onOpen={openModule} />
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <ConsultasPlanModal
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onPlanActivated={handlePlanActivated}
        userBalance={user?.balance ?? 0}
      />
      <ConsultaModal
        module={activeModule}
        onClose={() => setActiveModule(null)}
      />
    </DashboardLayout>
  );
}
