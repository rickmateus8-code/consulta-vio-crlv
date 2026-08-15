import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import ConsultasPlanModal from "@/components/ConsultasPlanModal";
import UnifiedProfileView, { isValidCPF } from "@/components/UnifiedProfileView";
import { getPlanoStatus } from "@/lib/snoopApi";
import * as SnoopAPI from "@/lib/snoopApi";
import { toast } from "sonner";
import masterBuscasLogo from "@/assets/master_buscas_logo.png";
import {
  mapConsultaError,
  type ConsultaErrorDetails,
  type ConsultasPlanStatus,
  type ConsultationHistoryItem,
  type ConsultationHistoryResponse,
} from "@/lib/consultas/types";
import { ConsultasHeaderMobile } from "@/components/consultas/ConsultasHeaderMobile";
import { ConsultasSidebar } from "@/components/consultas/ConsultasSidebar";
import { ModulesGrid, CategoryFilterChips } from "@/components/consultas/ModulesGrid";
import { ConsultasHistoryView } from "@/components/consultas/ConsultasHistoryView";
import { ConsultasTabs } from "@/components/consultas/ConsultasTabs";
import { ConsultaErrorPanel } from "@/components/consultas/ConsultaErrorPanel";
import { RadarLoadingAnimation } from "@/components/consultas/RadarLoadingAnimation";








import {
  Search, X, Loader2, Star, StarOff, Radar,
  User, Phone, Mail, MapPin, CreditCard, Camera, Car,
  FileText, Users, Home, Briefcase, Hash, Shield,
  AlertTriangle, Clock, CheckCircle2, ArrowLeft, LogOut, RefreshCw, Eye, LayoutGrid, History, Moon, Sun, ChevronLeft
} from "lucide-react";

// ─── Formatadores e Máscaras de Entrada ────────────────────────────────────────
export function formatCPF(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function formatCEP(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function formatTelefone(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatPlaca(v: string) {
  const clean = v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 7);
  if (clean.length > 3 && /^[A-Z]{3}\d{4}$/.test(clean)) {
    return clean.slice(0, 3) + "-" + clean.slice(3);
  }
  return clean;
}

export function evaluateInputValidation(input: string, tabId: string): { status: "valid" | "invalid" | null; label: string } {
  if (!input.trim()) return { status: null, label: "" };
  const val = input.trim();
  const clean = val.replace(/\D/g, "");

  if (tabId === "cpf" || tabId === "parentes" || tabId === "score" || tabId === "foto" || tabId === "enriquecimento" || tabId === "vizinhos") {
    if (clean.length < 11) return { status: "invalid", label: "Incompleto" };
    return isValidCPF(clean) ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  }
  if (tabId === "cep") return clean.length === 8 ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  if (tabId === "telefone" || tabId === "operadora") return clean.length >= 10 && clean.length <= 11 ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  if (tabId === "placa") return /^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z0-9]\d{2}$/i.test(val) ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  if (tabId === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  if (tabId === "rg") return val.length >= 4 ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  if (tabId === "nome") return val.length >= 3 ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  if (tabId === "banco") return clean.length >= 1 ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  if (tabId === "titulo" || tabId === "pis") return clean.length >= 9 ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  if (tabId === "endereco") return val.includes(";") ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Formato UF;Rua" };

  return { status: "valid", label: "Válido" };
}

// ─── Sub-Abas Principais de Consulta ──────────────────────────────────────────
const MAIN_TABS = [
  { id: "cpf", label: "CPF", placeholder: "Ex: 123.456.789-00", emoji: "🪪", headerTitle: "Master Buscas Complete", headerDesc: "Consulte informações unificadas completas por CPF." },
  { id: "rg", label: "RG", placeholder: "Ex: 123456789", emoji: "📄", headerTitle: "Consulta de RG", headerDesc: "Realize a consulta e visualize dados cadastrais vinculados ao Registro Geral." },
  { id: "cep", label: "CEP", placeholder: "Ex: 01234-567", emoji: "📍", headerTitle: "Consulta de CEP", headerDesc: "Consulte endereços e moradores cadastrados por CEP." },
  { id: "email", label: "Email", placeholder: "Ex: email@exemplo.com", emoji: "✉️", headerTitle: "Consulta de E-mail", headerDesc: "Consulte registros e vínculos associados ao endereço de e-mail." },
  { id: "telefone", label: "Telefone", placeholder: "Ex: (11) 99999-9999", emoji: "📞", headerTitle: "Consulta de Telefone", headerDesc: "Proprietário e histórico de linhas telefônicas com DDD." },
  { id: "nome", label: "Nome", placeholder: "Ex: MARIA CAROLINA DA SILVA", emoji: "👤", headerTitle: "Busca por Nome", headerDesc: "Pesquise por nome completo ou parcial para obter pessoas vinculadas." },
  { id: "placa", label: "Placa", placeholder: "Ex: FVV5A52 ou ABC1234", emoji: "🚗", headerTitle: "Consulta de Placa", headerDesc: "Realize a consulta e visualize dados da placa, chassi, motor e renavam." },
  { id: "parentes", label: "Parentes", placeholder: "Ex: 123.456.789-00", emoji: "👨‍👩‍👧", headerTitle: "Consulta de Parentes", headerDesc: "Árvore e lista de vínculos familiares por CPF." },
  { id: "vizinhos", label: "Vizinhos", placeholder: "Ex: 123.456.789-00", emoji: "👥", headerTitle: "Consulta de Vizinhos", headerDesc: "Busque os vizinhos e moradores próximos associados ao CPF informado." },
  { id: "score", label: "Score", placeholder: "Ex: 123.456.789-00", emoji: "📊", headerTitle: "Score de Crédito", headerDesc: "Análise de pontuação e perfil Serasa Mosaic por CPF." },
  { id: "foto", label: "Fotos", placeholder: "Ex: 123.456.789-00", emoji: "📷", headerTitle: "Fotos Nacionais", headerDesc: "Galeria de fotos oficiais cadastradas por CPF." },
  { id: "endereco", label: "Endereço", placeholder: "Ex: SP;Paulista (UF;Rua)", emoji: "🏠", headerTitle: "Busca por Endereço", headerDesc: "Digite UF e Logradouro separados por ponto e vírgula para buscar moradores." },
  { id: "operadora", label: "Operadora", placeholder: "Ex: (11) 99999-9999", emoji: "📶", headerTitle: "Consulta de Operadora", headerDesc: "Identifique a operadora celular atual e o status do número de telefone." },
  { id: "banco", label: "Bancos", placeholder: "Ex: 001", emoji: "🏦", headerTitle: "Consulta de Bancos", headerDesc: "Consulte a instituição bancária oficial a partir de seu código COMPE." },
  { id: "titulo", label: "Título Eleitor", placeholder: "Ex: 123456789012", emoji: "🗳️", headerTitle: "Título de Eleitor", headerDesc: "Consulte a situação cadastral do Título de Eleitor." },
  { id: "pis", label: "PIS/NIS", placeholder: "Ex: 12345678901", emoji: "💳", headerTitle: "Consulta PIS / NIS", headerDesc: "Consulte o cadastro do PIS/PASEP e vínculos do trabalhador." },
];

interface Module {
  id: string;
  label: string;
  description: string;
  emoji: string;
  category: string;
  dailyLimit?: number;
}

const MODULES: Module[] = [
  { id: "cpf", label: "Master Buscas Complete", description: "Dados completos unificados por CPF", emoji: "🔍", category: "mais_usados", dailyLimit: 1000 },
  { id: "nome", label: "Busca por Nome", description: "Busca de pessoas por nome completo ou parcial", emoji: "👤", category: "mais_usados", dailyLimit: 1000 },
  { id: "telefone", label: "Consulta Telefone", description: "Proprietário de telefone com DDD", emoji: "📞", category: "mais_usados", dailyLimit: 500 },
  { id: "email", label: "Consulta Email", description: "Dados cadastrais por e-mail", emoji: "✉️", category: "utilitarios", dailyLimit: 500 },
  { id: "rg", label: "Consulta RG", description: "Consulta por Registro Geral", emoji: "🪪", category: "condutores", dailyLimit: 500 },
  { id: "cep", label: "Consulta CEP", description: "Moradores e endereços por CEP", emoji: "📍", category: "utilitarios", dailyLimit: 500 },
  { id: "placa", label: "Consulta Placa", description: "Dados completos do veículo por placa", emoji: "🚗", category: "veiculares", dailyLimit: 500 },
  { id: "endereco", label: "Busca por Endereço", description: "Moradores por logradouro e UF (formato UF;Rua)", emoji: "🏠", category: "utilitarios", dailyLimit: 500 },
  { id: "vizinhos", label: "Consulta Vizinhos", description: "Vizinhos e moradores próximos por CPF", emoji: "👥", category: "mais_usados", dailyLimit: 500 },
  { id: "operadora", label: "Consulta Operadora", description: "Descubra a operadora de um celular", emoji: "📶", category: "utilitarios", dailyLimit: 500 },
  { id: "banco", label: "Consulta Bancos", description: "Código e dados de compensação de bancos", emoji: "🏦", category: "financeiro", dailyLimit: 500 },
  { id: "titulo", label: "Título de Eleitor", description: "Consulta cadastral do Título por número", emoji: "🗳️", category: "condutores", dailyLimit: 500 },
  { id: "pis", label: "Consulta PIS / NIS", description: "PIS/NIS e vínculos de trabalho", emoji: "💳", category: "financeiro", dailyLimit: 500 },
  { id: "parentes", label: "Consulta Parentes", description: "Árvore de parentes vinculados por CPF", emoji: "👨‍👩‍👧", category: "mais_usados", dailyLimit: 500 },
  { id: "score", label: "Score de Crédito", description: "Análise de crédito e Serasa por CPF", emoji: "📊", category: "financeiro", dailyLimit: 500 },
  { id: "foto", label: "Fotos Nacionais", description: "Fotos oficiais cadastradas por CPF", emoji: "📷", category: "fotos", dailyLimit: 100 },
];

const CATEGORY_FILTERS = [
  { id: "todos", label: "TODOS", count: 16, emoji: "🎛️" },
  { id: "mais_usados", label: "MAIS USADOS", count: 5, emoji: "💧" },
  { id: "utilitarios", label: "UTILITÁRIOS", count: 4, emoji: "🔍" },
  { id: "condutores", label: "DOCUMENTOS", count: 2, emoji: "👤" },
  { id: "veiculares", label: "VEICULARES", count: 1, emoji: "🚗" },
  { id: "financeiro", label: "FINANCEIRO", count: 3, emoji: "💰" },
  { id: "fotos", label: "FOTOS", count: 1, emoji: "📷" },
];


export default function Consultas() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planStatus, setPlanStatus] = useState<ConsultasPlanStatus | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Submenu Lateral Esquerdo ("dashboard" | "modulos" | "historico")
  const [viewMode, setViewMode] = useState<"dashboard" | "modulos" | "historico">("dashboard");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("todos");

  // Histórico de Consultas
  const [historyList, setHistoryList] = useState<ConsultationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Estado da busca e formulário de módulo selecionado (Estilo Imagem 02)
  const [activeTabId, setActiveTabId] = useState("cpf");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [quickInput, setQuickInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<ConsultaErrorDetails | null>(null);
  const activeRequestIdRef = useRef<number>(0);





  // Carregar status do plano e uso real em 24h
  const fetchStatus = useCallback(() => {
    getPlanoStatus()
      .then((data) => {
        setPlanStatus(data);
        const freeDocsArr = (() => {
          if (!user?.free_documents) return [];
          if (Array.isArray(user.free_documents)) return user.free_documents;
          try { return JSON.parse(user.free_documents); } catch { return []; }
        })();
        const permsObj = (() => {
          if (!user?.permissions) return { editaveis: [], ferramentas: [] };
          if (typeof user.permissions === "object") return user.permissions;
          try { return JSON.parse(user.permissions); } catch { return { editaveis: [], ferramentas: [] }; }
        })();
        const toolsArr = Array.isArray(permsObj.ferramentas) ? permsObj.ferramentas : [];

        const isFree = data.is_free || data.plan?.is_free || user?.role === "admin" ||
          freeDocsArr.includes("consultas") || toolsArr.includes("consultas");
        if (!data.plan && !isFree) setShowPlanModal(true);
      })
      .catch(() => setPlanStatus({ plan: null }))
      .finally(() => setPlanLoading(false));
  }, [user]);

  // Carregar histórico
  const fetchHistory = useCallback(() => {
    setHistoryLoading(true);
    fetch("/api/consultas-historico", { credentials: "include" })
      .then(async (r) => {
        const text = await r.text();
        const emptyFallback: ConsultationHistoryResponse = { history: [] };
        if (!text || text.trim().startsWith("<")) return emptyFallback;
        try {
          const parsed: ConsultationHistoryResponse = JSON.parse(text);
          return parsed;
        } catch {
          return emptyFallback;
        }
      })
      .then((d) => setHistoryList(d.history || []))
      .catch(() => setHistoryList([]))
      .finally(() => setHistoryLoading(false));
  }, []);


  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (viewMode === "historico") fetchHistory();
  }, [viewMode, fetchHistory]);

  // Invalidação de requisições pendentes na desmontagem do componente
  useEffect(() => {
    return () => {
      activeRequestIdRef.current++;
    };
  }, []);


  const handlePlanActivated = useCallback(async () => {
    fetchStatus();
  }, [fetchStatus]);

  // Formatador automático por tipo de aba
  const handleInputChange = (val: string) => {
    let formatted = val;
    if (activeTabId === "cpf" || activeTabId === "parentes" || activeTabId === "score" || activeTabId === "foto" || activeTabId === "enriquecimento" || activeTabId === "vizinhos") {
      formatted = formatCPF(val);
    } else if (activeTabId === "cep") {
      formatted = formatCEP(val);
    } else if (activeTabId === "telefone" || activeTabId === "operadora") {
      formatted = formatTelefone(val);
    } else if (activeTabId === "placa") {
      formatted = formatPlaca(val);
    } else if (activeTabId === "rg" || activeTabId === "banco" || activeTabId === "titulo" || activeTabId === "pis") {
      formatted = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    } else if (activeTabId === "nome") {
      formatted = val.toUpperCase();
    } else if (activeTabId === "email") {
      formatted = val.toLowerCase().trim();
    } else if (activeTabId === "endereco") {
      formatted = val;
    }
    setQuickInput(formatted);
  };

  // Executar busca rápida com bloqueio de double-submit, tratamento tipado de erros e descarte de respostas obsoletas (race protection)
  const handleQuickSearch = async () => {
    if (loading) return;

    if (!quickInput.trim()) {
      toast.error("Digite o valor para consultar.");
      return;
    }

    const validation = evaluateInputValidation(quickInput, activeTabId);
    if (validation.status === "invalid") {
      toast.error(`Valor inválido para o campo ${activeTabId.toUpperCase()}.`);
      return;
    }

    const freeDocsArr = (() => {
      if (!user?.free_documents) return [];
      if (Array.isArray(user.free_documents)) return user.free_documents;
      try { return JSON.parse(user.free_documents); } catch { return []; }
    })();
    const permsObj = (() => {
      if (!user?.permissions) return { editaveis: [], ferramentas: [] };
      if (typeof user.permissions === "object") return user.permissions;
      try { return JSON.parse(user.permissions); } catch { return { editaveis: [], ferramentas: [] }; }
    })();
    const toolsArr = Array.isArray(permsObj.ferramentas) ? permsObj.ferramentas : [];

    const isFreeAccess = planStatus?.is_free || planStatus?.plan?.is_free || user?.role === "admin" ||
      freeDocsArr.includes("consultas") || toolsArr.includes("consultas");
    if (!planStatus?.plan && !isFreeAccess) {
      setShowPlanModal(true);
      return;
    }

    const requestId = ++activeRequestIdRef.current;
    setLoading(true);
    setErrorDetails(null);
    setResult(null);

    const val = quickInput.trim();
    const cleanVal = val.replace(/\D/g, "");

    const executeSnoop = async () => {
      if (activeTabId === "placa") return await SnoopAPI.snoopPlaca(val.replace(/[^a-zA-Z0-9]/g, ""));
      if (activeTabId === "cpf" || activeTabId === "enriquecimento" || activeTabId === "foto") return await SnoopAPI.snoopPerfilCPF(cleanVal || val);
      if (activeTabId === "parentes") return await SnoopAPI.snoopParentes(cleanVal || val);
      if (activeTabId === "vizinhos") return await SnoopAPI.snoopVizinhos(cleanVal || val);
      if (activeTabId === "score") return await SnoopAPI.snoopScore(cleanVal || val);
      if (activeTabId === "rg") return await SnoopAPI.snoopRG(val);
      if (activeTabId === "cep") return await SnoopAPI.snoopCEP(cleanVal || val);
      if (activeTabId === "email") return await SnoopAPI.snoopEmail(val);
      if (activeTabId === "telefone") {
        try {
          return await SnoopAPI.snoopTelefoneFull(cleanVal || val);
        } catch {
          return await SnoopAPI.snoopTelefone(cleanVal || val);
        }
      }

      if (activeTabId === "operadora") return await SnoopAPI.snoopOperadora(cleanVal || val);
      if (activeTabId === "banco") return await SnoopAPI.snoopBanco(val);
      if (activeTabId === "titulo") return await SnoopAPI.snoopTitulo(val);
      if (activeTabId === "pis") return await SnoopAPI.snoopPIS(val);
      if (activeTabId === "endereco") {
        const parts = val.split(";");
        const uf = parts[0].trim().toUpperCase();
        const logradouro = parts[1]?.trim() || "";
        return await SnoopAPI.snoopEndereco(uf, logradouro);
      }
      if (activeTabId === "nome") {
        const sanitizedNome = val.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
        return await SnoopAPI.snoopNome(sanitizedNome);
      }
      return await SnoopAPI.snoopPerfilCPF(cleanVal || val);
    };

    try {
      const data = await executeSnoop();
      if (requestId !== activeRequestIdRef.current) return;
      setResult(data);
      fetchStatus();
    } catch (e: unknown) {
      if (requestId !== activeRequestIdRef.current) return;
      const mapped = mapConsultaError(e);
      setErrorDetails(mapped);
      if (mapped.type === "LIMIT_ERROR") {
        setShowPlanModal(true);
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Selecionar pessoa da lista por nome com descarte de requisição obsoleta
  const handleSelectPersonFromList = (cpf: string) => {
    if (loading) return;
    const requestId = ++activeRequestIdRef.current;
    setViewMode("dashboard");
    setQuickInput(formatCPF(cpf));
    setActiveTabId("cpf");
    setLoading(true);
    setErrorDetails(null);
    setResult(null);
    SnoopAPI.snoopPerfilCPF(cpf)
      .then((data) => {
        if (requestId !== activeRequestIdRef.current) return;
        setResult(data);
        fetchStatus();
      })
      .catch((e: unknown) => {
        if (requestId !== activeRequestIdRef.current) return;
        const mapped = mapConsultaError(e);
        setErrorDetails(mapped);
        if (mapped.type === "LIMIT_ERROR") {
          setShowPlanModal(true);
        }
      })
      .finally(() => {
        if (requestId === activeRequestIdRef.current) {
          setLoading(false);
        }
      });
  };


  // Selecionar um módulo no grid (Ativa Visualização Dedicada do Módulo - Imagem 02)
  const handleSelectModule = (modId: string) => {
    activeRequestIdRef.current++;
    setViewMode("dashboard");
    setSelectedModuleId(modId);
    setActiveTabId(modId);
    setQuickInput("");
    setResult(null);
    setErrorDetails(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };



  const currentTab = MAIN_TABS.find(t => t.id === activeTabId) || MAIN_TABS[0];
  const planIsActive = (planStatus?.plan?.expires_at && new Date(planStatus.plan.expires_at) > new Date()) || user?.role === "admin";
  const validation = evaluateInputValidation(quickInput, activeTabId);

  const usage24h = planStatus?.usage_24h || 0;
  const usageRestantes = Math.max(0, 1000 - usage24h);
  const usageByModulo = planStatus?.usage_by_modulo || {};

  // Filtragem de Módulos por Categoria Selecionada no Dashboard
  const filteredModules = useMemo(() => {
    if (activeCategoryFilter === "todos") return MODULES;
    return MODULES.filter(m => m.category === activeCategoryFilter);
  }, [activeCategoryFilter]);

  return (
    <div className="fixed inset-0 z-50 w-full h-screen bg-[#070a19] text-white flex flex-col md:flex-row overflow-hidden font-sans select-text">
      {/* ─── MOBILE HEADER & SUBMENU (APENAS DISPOSITIVOS MÓVEIS < md) ─────────────────── */}
      <ConsultasHeaderMobile
        viewMode={viewMode}
        usageRestantes={usageRestantes}
        onSelectViewMode={setViewMode}
        onLogout={() => setLocation("/dashboard")}
      />

      {/* ─── SIDEBAR ESQUERDA DESKTOP (OCULTA NO MOBILE VIA hidden md:flex) ─────────────────── */}
      <ConsultasSidebar
        viewMode={viewMode}
        onSelectViewMode={setViewMode}
        onLogout={() => setLocation("/dashboard")}
      />


      {/* ─── ÁREA DE CONTEÚDO PRINCIPAL (DIREITA) ──────────────────────────────── */}
      <main className="flex-1 h-full overflow-y-auto p-3.5 md:p-6 space-y-4 md:space-y-6 bg-[#070a19]">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">

          {/* VISÃO 1: DASHBOARD DE BUSCA UNIFICADA OU MÓDULO INDIVIDUAL */}
          {(viewMode === "dashboard" || result) && (
            <>
              {/* CARD SEJA BEM-VINDO DA IMAGEM 01 (QUANDO NENHUM MÓDULO ESTIVER SELECIONADO DIRETO E NENHUM RESULTADO) */}
              {!selectedModuleId && !result && (
                <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-r from-[#170e3b] via-[#1c1348] to-[#120a2e] border border-violet-500/30 shadow-2xl space-y-4 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-950/90 border border-violet-500/40 p-1.5 flex items-center justify-center shadow-inner overflow-hidden">
                          <img src={masterBuscasLogo} alt="Master Buscas Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                            Seja bem-vindo, <span className="text-violet-400">{user?.username || "Usuário"}</span>
                          </h2>
                          <p className="text-xs text-violet-300 font-medium">DocMaster OSINT Intelligence System v3.0</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-300 font-medium pt-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-violet-400" />
                          <span>Responsável pelo seu acesso é: <strong className="text-white">Suporte DocMaster</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-400" />
                          <span>
                            Data de vencimento:{" "}
                            <strong className="text-white">
                              {planStatus?.plan?.expires_at
                                ? new Date(planStatus.plan.expires_at).toLocaleString("pt-BR")
                                : "25/10/2026 14:37"}
                            </strong>
                          </span>
                          <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                            Seu acesso expira em {planStatus?.plan?.expires_at ? Math.max(1, Math.ceil((new Date(planStatus.plan.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 71} DIAS
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* LADO DIREITO COM ESTATÍSTICAS DE CONSULTA HOJE */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0a0d24]/90 p-4 rounded-2xl border border-violet-500/30">
                      <div className="text-center sm:text-left">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block">CONSULTAS HOJE</span>
                        <span className="text-white font-black text-lg">{usage24h} / 1000</span>
                      </div>
                      <div className="hidden sm:block h-8 w-px bg-violet-500/20" />
                      <div className="text-center sm:text-left">
                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block">RESTANTES</span>
                        <span className="text-emerald-400 font-black text-lg">{usageRestantes} restantes</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD DE CONSULTA COM FORMULÁRIO DEDICADO - ESTILO IMAGEM 02 (OU PESQUISA SELECIONADA) */}
              <div className="rounded-3xl p-5 md:p-7 bg-[#0f112e]/95 border border-violet-500/30 shadow-2xl space-y-6">
                <div className="rounded-2xl p-5 bg-gradient-to-r from-[#211652] to-[#170e3c] border border-violet-500/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950/90 border border-violet-500/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
                      {currentTab.emoji}
                    </div>
                    <div>
                      <h2 className="text-lg md:text-xl font-black text-white tracking-tight">{currentTab.headerTitle}</h2>
                      <p className="text-xs text-violet-200/90 mt-0.5">{currentTab.headerDesc}</p>
                    </div>
                  </div>

                  {selectedModuleId && (
                    <button
                      onClick={() => { setSelectedModuleId(null); setResult(null); setError(null); }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-violet-500/30 flex items-center gap-1.5 transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" /> Voltar aos Módulos
                    </button>
                  )}
                </div>

                {/* PAINEL DE CONSULTAS HOJE & RESTANTES (EXATAMENTE COMO IMAGEM 02) */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-6 px-8 py-3 rounded-2xl bg-[#090b1e]/90 border border-violet-500/30 text-xs shadow-inner">
                    <Clock className="w-5 h-5 text-violet-400" />
                    <div className="text-center">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">CONSULTAS HOJE</span>
                      <span className="text-white font-black text-base">{usage24h} / 1000</span>
                    </div>
                    <div className="h-6 w-px bg-violet-500/20" />
                    <div className="text-center">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">RESTANTES</span>
                      <span className="text-emerald-400 font-black text-base">{usageRestantes} restantes</span>
                    </div>
                  </div>
                </div>

                {/* CHIPS SELETORAS DE TIPO DE PESQUISA (IMAGEM 02: [CPF] [RG] [CEP] [Email] [Telefone] [Nome] ...) */}
                <ConsultasTabs
                  tabs={MAIN_TABS}
                  activeTabId={activeTabId}
                  onSelectTab={(tabId) => {
                    activeRequestIdRef.current++;
                    setActiveTabId(tabId);
                    setQuickInput("");
                    setResult(null);
                    setErrorDetails(null);
                  }}
                />

                {/* FORMULÁRIO DE ENTRADA (IMAGEM 02) */}
                <div className="space-y-4 pt-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={currentTab.placeholder}
                      value={quickInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleQuickSearch(); }}
                      className="w-full px-5 py-4 rounded-2xl bg-[#090b1f] border border-violet-500/40 text-white text-xs md:text-sm outline-none focus:border-violet-400 transition-all font-mono select-text shadow-inner pr-24"
                    />
                    {validation.status && (
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                        validation.status === "valid" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" : "bg-red-950 text-red-400 border border-red-500/30"
                      }`}>
                        {validation.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => {
                        activeRequestIdRef.current++;
                        setQuickInput("");
                        setResult(null);
                        setErrorDetails(null);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 text-xs font-bold transition-all"
                    >
                      Limpar
                    </button>



                    <button
                      onClick={handleQuickSearch}
                      disabled={loading}
                      className="px-8 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Consultar
                    </button>
                  </div>
                </div>
              </div>


              {/* ANIMAÇÃO RADAR INTELLIGENCE DE CARREGAMENTO */}
              {loading && <RadarLoadingAnimation />}


              {/* FILTRAR POR CATEGORIA (MODELO IMAGEM 1 CENTRADO) */}
              {!result && (
                <CategoryFilterChips
                  categoryFilters={CATEGORY_FILTERS}
                  activeCategoryFilter={activeCategoryFilter}
                  onSelectCategoryFilter={setActiveCategoryFilter}
                />
              )}

              {/* PAINEL DE ERRO SE HOUVER (INTEGRADO AO ERROR MODEL MAPPER) */}
              {errorDetails && <ConsultaErrorPanel errorDetails={errorDetails} />}


              {/* EXIBIÇÃO DE RESULTADO UNIFICADO COMPLETO */}
              {result && (
                <div className="rounded-2xl p-6 bg-slate-900/90 border border-violet-500/30 shadow-2xl space-y-6">
                  <UnifiedProfileView
                    data={result}
                    onSelectPerson={handleSelectPersonFromList}
                    onClose={() => setResult(null)}
                  />
                </div>
              )}

              {/* GRADE DE MÓDULOS FILTRADA DO DASHBOARD (MODELO IMAGEM 1) */}
              {!result && (
                <ModulesGrid
                  modules={filteredModules}
                  usageByModulo={usageByModulo}
                  onSelectModule={handleSelectModule}
                  variant="dashboard"
                />
              )}
            </>
          )}

          {/* VISÃO 2: GRADE COMPLETA DE MÓDULOS */}
          {viewMode === "modulos" && !result && (
            <ModulesGrid
              modules={MODULES}
              usageByModulo={usageByModulo}
              onSelectModule={handleSelectModule}
              variant="full"
            />
          )}


          {/* VISÃO 3: HISTÓRICO DE CONSULTAS */}
          {viewMode === "historico" && (
            <ConsultasHistoryView
              historyList={historyList}
              historyLoading={historyLoading}
              onRefresh={fetchHistory}
            />
          )}

        </div>
      </main>

      {/* Modal de Compra de Planos */}
      <ConsultasPlanModal
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onPlanActivated={handlePlanActivated}
        userBalance={user?.balance || 0}
      />
    </div>
  );
}
