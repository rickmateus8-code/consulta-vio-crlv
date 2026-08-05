import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import ConsultasPlanModal from "@/components/ConsultasPlanModal";
import UnifiedProfileView, { isValidCPF } from "@/components/UnifiedProfileView";
import { getPlanoStatus } from "@/lib/snoopApi";
import * as SnoopAPI from "@/lib/snoopApi";
import { toast } from "sonner";
import {
  Search, X, Loader2, Star, StarOff,
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
  { id: "todos", label: "TODOS", count: 77, emoji: "🎛️" },
  { id: "mais_usados", label: "MAIS USADOS", count: 12, emoji: "💧" },
  { id: "utilitarios", label: "UTILITÁRIOS", count: 15, emoji: "🔍" },
  { id: "condutores", label: "CONDUTORES", count: 7, emoji: "👤" },
  { id: "veiculares", label: "VEICULARES", count: 8, emoji: "🚗" },
  { id: "crlv", label: "CRLV", count: 5, emoji: "📄" },
  { id: "hospitalar", label: "HOSPITALAR", count: 3, emoji: "🏥" },
  { id: "cnpj", label: "CNPJ", count: 3, emoji: "🏢" },
  { id: "beneficios", label: "BENEFÍCIOS", count: 6, emoji: "🎁" },
  { id: "cnh", label: "CNH", count: 7, emoji: "💳" },
  { id: "fotos", label: "FOTOS", count: 11, emoji: "📷" },
  { id: "financeiro", label: "FINANCEIRO", count: 4, emoji: "💰" },
  { id: "geradores", label: "GERADORES", count: 5, emoji: "⚡" },
];

export default function Consultas() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planStatus, setPlanStatus] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Submenu Lateral Esquerdo ("dashboard" | "modulos" | "historico")
  const [viewMode, setViewMode] = useState<"dashboard" | "modulos" | "historico">("dashboard");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("todos");

  // Histórico de Consultas
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Estado da busca
  const [activeTabId, setActiveTabId] = useState("cpf");
  const [quickInput, setQuickInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Carregar status do plano e uso real em 24h
  const fetchStatus = useCallback(() => {
    getPlanoStatus()
      .then((data) => {
        setPlanStatus(data);
        if (!data.plan && user?.role !== "admin") setShowPlanModal(true);
      })
      .catch(() => setPlanStatus({ plan: null }))
      .finally(() => setPlanLoading(false));
  }, [user]);

  // Carregar histórico
  const fetchHistory = useCallback(() => {
    setHistoryLoading(true);
    fetch("/api/consultas-historico", { credentials: "include" })
      .then((r) => r.json())
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

  // Executar busca rápida
  const handleQuickSearch = async () => {
    if (!quickInput.trim()) {
      toast.error("Digite o valor para consultar.");
      return;
    }

    const validation = evaluateInputValidation(quickInput, activeTabId);
    if (validation.status === "invalid") {
      toast.error(`Valor inválido para o campo ${activeTabId.toUpperCase()}.`);
      return;
    }

    if (!planStatus?.plan && user?.role !== "admin") {
      setShowPlanModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const val = quickInput.trim();
    const cleanVal = val.replace(/\D/g, "");

    try {
      let data: any;
      if (activeTabId === "placa") {
        data = await SnoopAPI.snoopPlaca(val.replace(/[^a-zA-Z0-9]/g, ""));
      } else if (activeTabId === "cpf" || activeTabId === "enriquecimento" || activeTabId === "foto") {
        data = await SnoopAPI.snoopPerfilCPF(cleanVal || val);
      } else if (activeTabId === "parentes") {
        data = await SnoopAPI.snoopParentes(cleanVal || val);
      } else if (activeTabId === "vizinhos") {
        data = await SnoopAPI.snoopVizinhos(cleanVal || val);
      } else if (activeTabId === "score") {
        data = await SnoopAPI.snoopScore(cleanVal || val);
      } else if (activeTabId === "rg") {
        data = await SnoopAPI.snoopRG(val);
      } else if (activeTabId === "cep") {
        data = await SnoopAPI.snoopCEP(cleanVal || val);
      } else if (activeTabId === "email") {
        data = await SnoopAPI.snoopEmail(val);
      } else if (activeTabId === "telefone") {
        data = await SnoopAPI.snoopTelefoneFull(cleanVal || val);
      } else if (activeTabId === "operadora") {
        data = await SnoopAPI.snoopOperadora(cleanVal || val);
      } else if (activeTabId === "banco") {
        data = await SnoopAPI.snoopBanco(val);
      } else if (activeTabId === "titulo") {
        data = await SnoopAPI.snoopTitulo(val);
      } else if (activeTabId === "pis") {
        data = await SnoopAPI.snoopPIS(val);
      } else if (activeTabId === "endereco") {
        const parts = val.split(";");
        const uf = parts[0].trim().toUpperCase();
        const logradouro = parts[1].trim();
        data = await SnoopAPI.snoopEndereco(uf, logradouro);
      } else if (activeTabId === "nome") {
        const sanitizedNome = val.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
        data = await SnoopAPI.snoopNome(sanitizedNome);
      } else {
        data = await SnoopAPI.snoopPerfilCPF(cleanVal || val);
      }
      setResult(data);
      fetchStatus();
    } catch (e: any) {
      if (e.code === "PLANO_INATIVO") {
        setError("Você precisa de um plano ativo para realizar consultas.");
        setShowPlanModal(true);
      } else {
        setError(e.message || "Não foi possível retornar os dados para esta consulta.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Selecionar pessoa da lista por nome
  const handleSelectPersonFromList = (cpf: string) => {
    setViewMode("dashboard");
    setQuickInput(formatCPF(cpf));
    setActiveTabId("cpf");
    setLoading(true);
    setError(null);
    setResult(null);
    SnoopAPI.snoopPerfilCPF(cpf)
      .then((data) => {
        setResult(data);
        fetchStatus();
      })
      .catch((e) => setError(e.message || "Erro ao consultar CPF"))
      .finally(() => setLoading(false));
  };

  // Selecionar um módulo no grid
  const handleSelectModule = (modId: string) => {
    setViewMode("dashboard");
    setActiveTabId(modId);
    setQuickInput("");
    setResult(null);
    setError(null);
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
    <div className="fixed inset-0 z-50 w-full h-screen bg-[#070a19] text-white flex overflow-hidden font-sans select-text">
      {/* ─── SIDEBAR ESQUERDA COMPATÍVEL COM IMAGENS ANEXADAS ─────────────────── */}
      <aside className="w-64 bg-[#0c0f2a] border-r border-violet-500/20 flex flex-col justify-between p-4 flex-shrink-0">
        <div className="space-y-6">
          {/* Logo Topo */}
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Search className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-base text-white tracking-tight">Master Buscas</span>
            </div>
            <button className="text-slate-500 hover:text-white text-xs">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Submenu de Navegação Esquerdo */}
          <nav className="space-y-1 pt-4">
            <button
              onClick={() => setViewMode("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                viewMode === "dashboard"
                  ? "bg-violet-600/90 text-white shadow-lg shadow-violet-600/30 border border-violet-400/40"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setViewMode("modulos")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                viewMode === "modulos"
                  ? "bg-violet-600/90 text-white shadow-lg shadow-violet-600/30 border border-violet-400/40"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Módulos</span>
            </button>

            <button
              onClick={() => setViewMode("historico")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                viewMode === "historico"
                  ? "bg-violet-600/90 text-white shadow-lg shadow-violet-600/30 border border-violet-400/40"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico</span>
            </button>
          </nav>
        </div>

        {/* Rodapé da Sidebar: Modo e Sair */}
        <div className="space-y-3 pt-4 border-t border-violet-500/10">
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 rounded-xl bg-slate-900/50">
            <Moon className="w-4 h-4 text-violet-400" />
            <span>Modo Escuro</span>
          </div>

          <button
            onClick={() => setLocation("/dashboard")}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair ↳
          </button>
        </div>
      </aside>

      {/* ─── ÁREA DE CONTEÚDO PRINCIPAL (DIREITA) ──────────────────────────────── */}
      <main className="flex-1 h-screen overflow-y-auto p-6 space-y-6 bg-[#070a19]">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* VISÃO 1: DASHBOARD DE BUSCA UNIFICADA */}
          {(viewMode === "dashboard" || result) && (
            <>
              {/* CARD DE CABEÇALHO ROXO (MODELO IMAGEM 1 & 2) */}
              <div className="rounded-2xl p-6 bg-gradient-to-r from-purple-800 to-violet-900 border border-violet-500/30 shadow-2xl space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-950/80 border border-violet-500/30 flex items-center justify-center shadow-inner">
                      <Search className="w-6 h-6 text-violet-300" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white tracking-tight">{currentTab.headerTitle}</h2>
                      <p className="text-xs text-purple-200 mt-0.5">{currentTab.headerDesc}</p>
                    </div>
                  </div>

                  {/* BANNER DE USO 24H (0 / 1000 | 1000 restantes) */}
                  <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-[#0d0f26]/90 border border-violet-500/30 text-xs shadow-inner">
                    <Clock className="w-5 h-5 text-violet-400" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">CONSULTAS HOJE</span>
                      <span className="text-white font-black text-base">{usage24h} / 1000</span>
                    </div>
                    <div className="h-8 w-px bg-violet-500/20" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">RESTANTES</span>
                      <span className="text-emerald-400 font-black text-base">{usageRestantes} restantes</span>
                    </div>
                  </div>
                </div>

                {/* Sub-Abas ([CPF] [RG] [CEP] [Email] [Telefone] [Nome] [Placa] [Parentes] [Score] [Fotos]) */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {MAIN_TABS.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTabId(tab.id);
                          setQuickInput("");
                          setResult(null);
                          setError(null);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${
                          isActive
                            ? "bg-violet-600 text-white border border-violet-300 shadow-lg shadow-violet-600/40"
                            : "bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-900 border border-violet-500/20"
                        }`}
                      >
                        <span>{tab.emoji}</span>
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Input de Busca com Válido/Inválido + Botões */}
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={currentTab.placeholder}
                      value={quickInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleQuickSearch(); }}
                      className="w-full px-5 py-4 rounded-xl bg-slate-950/90 border border-violet-500/40 text-white text-sm outline-none focus:border-violet-400 transition-all font-mono select-text shadow-inner"
                    />
                    {validation.status && (
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold px-2.5 py-0.5 rounded ${
                        validation.status === "valid" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" : "bg-red-950 text-red-400 border border-red-500/30"
                      }`}>
                        {validation.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => { setQuickInput(""); setResult(null); setError(null); }}
                      className="px-5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 text-xs font-bold transition-all"
                    >
                      Limpar
                    </button>
                    <button
                      onClick={handleQuickSearch}
                      disabled={loading}
                      className="px-8 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Consultar
                    </button>
                  </div>
                </div>
              </div>

              {/* FILTRAR POR CATEGORIA (MODELO IMAGEM 1 CENTRADO) */}
              {!result && (
                <div className="rounded-2xl p-6 bg-[#0c0f2a]/90 border border-violet-500/20 space-y-4 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    FILTRAR POR CATEGORIA
                  </span>
                  <div className="flex flex-wrap justify-center gap-2.5">
                    {CATEGORY_FILTERS.map((cat) => {
                      const isActive = activeCategoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategoryFilter(cat.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${
                            isActive
                              ? "bg-violet-600 text-white border-violet-400 shadow-lg shadow-violet-600/30"
                              : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border-violet-500/20"
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-white/10 text-[10px] font-bold">
                            {cat.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PAINEL DE ERRO SE HOUVER */}
              {error && (
                <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 flex items-center gap-3 text-red-300 text-sm">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

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
                <div className="rounded-2xl p-6 bg-[#0c0f2a]/90 border border-violet-500/20 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Car className="w-5 h-5 text-violet-400" />
                      <span>Módulos ({filteredModules.length})</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredModules.map((mod) => {
                      const modCount = usageByModulo[mod.id] || 0;
                      return (
                        <div
                          key={mod.id}
                          onClick={() => handleSelectModule(mod.id)}
                          className="group relative p-5 rounded-2xl bg-gradient-to-br from-violet-900/60 to-indigo-950/80 border border-violet-500/30 hover:border-violet-400 hover:scale-[1.03] transition-all cursor-pointer shadow-xl min-h-[120px] flex flex-col justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl flex-shrink-0">
                              {mod.emoji}
                            </div>
                            <div>
                              <h3 className="font-black text-white text-xs uppercase tracking-wide">{mod.label}</h3>
                              <p className="text-violet-200 text-[11px] mt-0.5 line-clamp-2">{mod.description}</p>
                            </div>
                          </div>
                          <div className="pt-3 flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold border-t border-white/5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {modCount}/{mod.dailyLimit || 500} consultas hoje
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* VISÃO 2: GRADE COMPLETA DE MÓDULOS */}
          {viewMode === "modulos" && !result && (
            <div className="space-y-8">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-950/80 to-indigo-950/80 border border-violet-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white">Módulos de Consulta</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Selecione um módulo abaixo para realizar pesquisas direcionadas.</p>
                </div>
                <span className="text-xs font-bold text-violet-300 bg-violet-900/80 px-3 py-1.5 rounded-xl border border-violet-500/40">
                  {MODULES.length} Módulos Disponíveis
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {MODULES.map((mod) => {
                  const modCount = usageByModulo[mod.id] || 0;
                  return (
                    <div
                      key={mod.id}
                      onClick={() => handleSelectModule(mod.id)}
                      className="group relative p-5 rounded-2xl bg-gradient-to-br from-violet-900/60 to-indigo-950/80 border border-violet-500/30 hover:border-violet-400 hover:scale-[1.03] transition-all cursor-pointer shadow-xl min-h-[120px] flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl flex-shrink-0">
                          {mod.emoji}
                        </div>
                        <div>
                          <h3 className="font-black text-white text-xs uppercase tracking-wide">{mod.label}</h3>
                          <p className="text-violet-200 text-[11px] mt-0.5 line-clamp-2">{mod.description}</p>
                        </div>
                      </div>
                      <div className="pt-3 flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold border-t border-white/5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {modCount}/{mod.dailyLimit || 500} consultas hoje
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISÃO 3: HISTÓRICO DE CONSULTAS */}
          {viewMode === "historico" && (
            <div className="rounded-2xl p-6 bg-slate-900/90 border border-violet-500/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-violet-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-violet-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">Histórico de Consultas</h3>
                    <p className="text-xs text-slate-400">Consultas executadas recentemente pelo seu usuário</p>
                  </div>
                </div>
                <button
                  onClick={fetchHistory}
                  disabled={historyLoading}
                  className="px-3.5 py-2 rounded-xl bg-violet-900/40 hover:bg-violet-800 text-violet-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} /> Atualizar
                </button>
              </div>

              {historyLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" /> Carregando histórico...
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nenhuma consulta realizada nas últimas horas.
                </div>
              ) : (
                <div className="divide-y divide-violet-500/10">
                  {historyList.map((item: any, i: number) => (
                    <div key={i} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-950 flex items-center justify-center font-bold text-violet-300">
                          #{item.id}
                        </div>
                        <div>
                          <p className="font-bold text-white uppercase">{item.modulo}</p>
                          <p className="text-slate-400 text-[11px]">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                        Sucesso
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
