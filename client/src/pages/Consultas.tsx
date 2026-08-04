import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import ConsultasPlanModal from "@/components/ConsultasPlanModal";
import UnifiedProfileView from "@/components/UnifiedProfileView";
import { getPlanoStatus } from "@/lib/snoopApi";
import * as SnoopAPI from "@/lib/snoopApi";
import { toast } from "sonner";
import {
  Search, X, Loader2, Star, StarOff,
  User, Phone, Mail, MapPin, CreditCard, Camera, Car,
  FileText, Users, Home, Briefcase, Hash, Shield,
  AlertTriangle, Clock, CheckCircle2, ArrowLeft, LogOut, RefreshCw, Eye
} from "lucide-react";

// ─── Validador Rigoroso de CPF (Módulo 11) ──────────────────────────────────
export function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;

  return true;
}

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

// Validation status evaluator
export function evaluateInputValidation(input: string, tabId: string): { status: "valid" | "invalid" | null; label: string } {
  if (!input.trim()) return { status: null, label: "" };
  const val = input.trim();
  const clean = val.replace(/\D/g, "");

  if (tabId === "cpf" || tabId === "parentes" || tabId === "score" || tabId === "foto" || tabId === "enriquecimento") {
    if (clean.length < 11) return { status: "invalid", label: "Incompleto" };
    return isValidCPF(clean) ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  }

  if (tabId === "cep") {
    return clean.length === 8 ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  }

  if (tabId === "telefone") {
    return clean.length >= 10 && clean.length <= 11 ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  }

  if (tabId === "placa") {
    const isPlaca = /^[A-Z]{3}-?\d{4}$|^[A-Z]{3}\d[A-Z0-9]\d{2}$/i.test(val);
    return isPlaca ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  }

  if (tabId === "email") {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    return isEmail ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  }

  if (tabId === "rg") {
    return val.length >= 4 ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  }

  if (tabId === "nome") {
    return val.length >= 3 ? { status: "valid", label: "Válido" } : { status: "invalid", label: "Inválido" };
  }

  return { status: "valid", label: "Válido" };
}

// ─── Sub-Abas Principais de Consulta ──────────────────────────────────────────
const MAIN_TABS = [
  { id: "cpf", label: "CPF", placeholder: "Ex: 123.456.789-00", emoji: "🪪" },
  { id: "nome", label: "Nome", placeholder: "Ex: MARIA CAROLINA DA SILVA", emoji: "👤" },
  { id: "telefone", label: "Telefone", placeholder: "Ex: (11) 99999-9999", emoji: "📞" },
  { id: "email", label: "Email", placeholder: "Ex: email@exemplo.com", emoji: "✉️" },
  { id: "rg", label: "RG", placeholder: "Ex: 123456789", emoji: "📄" },
  { id: "cep", label: "CEP", placeholder: "Ex: 01234-567", emoji: "📍" },
  { id: "placa", label: "Placa", placeholder: "Ex: ABC-1234 ou ABC1D23", emoji: "🚗" },
  { id: "parentes", label: "Parentes", placeholder: "Ex: 123.456.789-00", emoji: "👨‍👩‍👧" },
  { id: "score", label: "Score", placeholder: "Ex: 123.456.789-00", emoji: "📊" },
  { id: "foto", label: "Fotos", placeholder: "Ex: 123.456.789-00", emoji: "📷" },
  { id: "enriquecimento", label: "Enriquecimento", placeholder: "Ex: 123.456.789-00", emoji: "⚡" },
];

// ─── Módulos Principais por Categoria ─────────────────────────────────────────
interface Module {
  id: string;
  label: string;
  description: string;
  emoji: string;
  category: string;
  dailyLimit?: number;
}

const MODULES: Module[] = [
  { id: "cpf", label: "CPF Completo", description: "Dados completos unificados por CPF", emoji: "🔍", category: "basicas", dailyLimit: 1000 },
  { id: "nome", label: "Busca por Nome", description: "Busca de pessoas por nome completo ou parcial", emoji: "👤", category: "basicas", dailyLimit: 1000 },
  { id: "telefone", label: "Consulta Telefone", description: "Proprietário de telefone com DDD", emoji: "📞", category: "basicas", dailyLimit: 500 },
  { id: "email", label: "Consulta Email", description: "Dados cadastrais por e-mail", emoji: "✉️", category: "basicas", dailyLimit: 500 },
  { id: "rg", label: "Consulta RG", description: "Consulta por Registro Geral", emoji: "🪪", category: "documentos", dailyLimit: 500 },
  { id: "cep", label: "Consulta CEP", description: "Moradores e endereços por CEP", emoji: "📍", category: "localizacao", dailyLimit: 500 },
  { id: "placa", label: "Consulta Placa", description: "Dados do veículo por placa", emoji: "🚗", category: "veiculos", dailyLimit: 500 },
  { id: "parentes", label: "Consulta Parentes", description: "Árvore de parentes vinculados por CPF", emoji: "👨‍👩‍👧", category: "relacoes", dailyLimit: 500 },
  { id: "score", label: "Score de Crédito", description: "Análise de crédito e Serasa por CPF", emoji: "📊", category: "financeiro", dailyLimit: 500 },
  { id: "foto", label: "Fotos Nacionais", description: "Fotos oficiais cadastradas por CPF", emoji: "📷", category: "fotos", dailyLimit: 100 },
];

const CATEGORIES = [
  { id: "basicas", label: "Consultas Básicas", emoji: "🔍" },
  { id: "documentos", label: "Documentos", emoji: "📋" },
  { id: "localizacao", label: "Localização", emoji: "📍" },
  { id: "relacoes", label: "Relações", emoji: "👨‍👩‍👧" },
  { id: "financeiro", label: "Financeiro", emoji: "💰" },
  { id: "veiculos", label: "Veículos", emoji: "🚗" },
  { id: "fotos", label: "Fotos", emoji: "📷" },
];

export default function Consultas() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planStatus, setPlanStatus] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Estado da aba ativa
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

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handlePlanActivated = useCallback(async () => {
    fetchStatus();
  }, [fetchStatus]);

  // Formatador automático por tipo de aba
  const handleInputChange = (val: string) => {
    let formatted = val;
    if (activeTabId === "cpf" || activeTabId === "parentes" || activeTabId === "score" || activeTabId === "foto" || activeTabId === "enriquecimento") {
      formatted = formatCPF(val);
    } else if (activeTabId === "cep") {
      formatted = formatCEP(val);
    } else if (activeTabId === "telefone") {
      formatted = formatTelefone(val);
    } else if (activeTabId === "placa") {
      formatted = formatPlaca(val);
    } else if (activeTabId === "rg") {
      formatted = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    } else if (activeTabId === "nome") {
      formatted = val.toUpperCase();
    } else if (activeTabId === "email") {
      formatted = val.toLowerCase().trim();
    }
    setQuickInput(formatted);
  };

  // Executar busca rápida da barra superior
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
      if (cleanVal.length === 11 || activeTabId === "cpf" || activeTabId === "enriquecimento" || activeTabId === "foto" || activeTabId === "parentes" || activeTabId === "score") {
        data = await SnoopAPI.snoopPerfilCPF(cleanVal || val);
      } else if (activeTabId === "rg") {
        data = await SnoopAPI.snoopRG(val);
      } else if (activeTabId === "cep") {
        data = await SnoopAPI.snoopCEP(cleanVal || val);
      } else if (activeTabId === "email") {
        data = await SnoopAPI.snoopEmail(val);
      } else if (activeTabId === "telefone") {
        data = await SnoopAPI.snoopTelefoneFull(cleanVal || val);
      } else if (activeTabId === "nome") {
        data = await SnoopAPI.snoopNome(val);
      } else if (activeTabId === "placa") {
        data = await SnoopAPI.snoopPlaca(val.replace(/[^a-zA-Z0-9]/g, ""));
      } else {
        data = await SnoopAPI.snoopPerfilCPF(cleanVal || val);
      }
      setResult(data);
      // Atualizar contagem real de uso nas ultimas 24h
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
    setActiveTabId(modId);
    setQuickInput("");
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentTab = MAIN_TABS.find(t => t.id === activeTabId) || MAIN_TABS[0];
  const planIsActive = (planStatus?.plan?.expires_at && new Date(planStatus.plan.expires_at) > new Date()) || user?.role === "admin";
  const validation = evaluateInputValidation(quickInput, activeTabId);

  // Contadores reais de uso em 24h retornados do backend
  const usage24h = planStatus?.usage_24h || 0;
  const usageRestantes = Math.max(0, 1000 - usage24h);
  const usageByModulo = planStatus?.usage_by_modulo || {};

  return (
    <div className="fixed inset-0 z-50 w-full h-screen bg-[#0a0e27] text-white flex flex-col overflow-hidden font-sans">
      {/* HEADER PRINCIPAL TELA CHEIA */}
      <header className="px-6 py-4 bg-[#0f172a] border-b border-violet-500/20 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              iSeek Complete <span className="text-xs px-2 py-0.5 rounded bg-violet-900/60 text-violet-300 font-normal">v2.0</span>
            </h1>
            <p className="text-xs text-slate-400">Plataforma Unificada de Inteligência e Consultas de Dados</p>
          </div>
        </div>

        {/* Botoes de Acao Superior */}
        <div className="flex items-center gap-3">
          {planIsActive ? (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-950/80 border border-violet-500/30 text-xs">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300">Plano Ativo</span>
            </div>
          ) : (
            <button
              onClick={() => setShowPlanModal(true)}
              className="px-4 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all shadow-lg flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" /> Ativar Plano
            </button>
          )}

          <button
            onClick={() => setLocation("/dashboard")}
            className="px-4 py-2 rounded-xl font-bold text-xs bg-violet-900/40 hover:bg-violet-800/60 border border-violet-500/30 text-violet-200 transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair ↳
          </button>
        </div>
      </header>

      {/* BODY DE TELA CHEIA */}
      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* BARRA SUPERIOR DE CONSULTA COM ABAS */}
          <div className="rounded-2xl p-6 bg-slate-900/90 border border-violet-500/30 shadow-2xl space-y-5">
            {/* Header + Contador Real 24h */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-950 flex items-center justify-center border border-violet-500/30">
                  <Search className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">iSeek Complete</h2>
                  <p className="text-xs text-slate-400">Consulte informações navegando pelas categorias disponíveis para encontrar os dados desejados.</p>
                </div>
              </div>

              {/* Contador REAL de consultas (reset 24h) */}
              <div className="flex items-center gap-4 px-5 py-2.5 rounded-xl bg-slate-950/80 border border-violet-500/20 text-xs">
                <Clock className="w-4 h-4 text-violet-400" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Consultas Hoje (24h)</span>
                  <span className="text-white font-bold text-sm">{usage24h} / 1000</span>
                </div>
                <div className="h-6 w-px bg-violet-500/20" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Restantes</span>
                  <span className="text-emerald-400 font-bold text-sm">{usageRestantes} restantes</span>
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
                        ? "bg-violet-600 text-white border border-violet-400 shadow-lg shadow-violet-600/30"
                        : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent"
                    }`}
                  >
                    <span>{tab.emoji}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Input Formatado e Indicador Válido/Inválido Real */}
            <div className="flex gap-3 items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={currentTab.placeholder}
                  value={quickInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleQuickSearch(); }}
                  className="w-full px-4 py-3.5 rounded-xl bg-slate-950/80 border border-violet-500/30 text-white text-sm outline-none focus:border-violet-500 transition-all font-mono"
                />
                {validation.status && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                    validation.status === "valid" ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {validation.label}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setQuickInput(""); setResult(null); setError(null); }}
                className="px-5 py-3.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 text-xs font-bold transition-all"
              >
                Limpar
              </button>
              <button
                onClick={handleQuickSearch}
                disabled={loading}
                className="px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Consultar
              </button>
            </div>
          </div>

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

          {/* MÓDULOS POR CATEGORIA (Com contagem real por modulo) */}
          {!result && (
            <div className="space-y-8 pt-4">
              {CATEGORIES.map((cat) => {
                const catMods = MODULES.filter(m => m.category === cat.id);
                if (catMods.length === 0) return null;
                return (
                  <div key={cat.id} className="rounded-2xl p-6 bg-slate-900/60 border border-violet-500/20 space-y-4">
                    <div className="flex items-center gap-2 font-bold text-white text-sm">
                      <span className="text-lg">{cat.emoji}</span>
                      <span>{cat.label}</span>
                      <span className="ml-auto text-xs font-bold text-violet-400 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-500/30">
                        {catMods.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {catMods.map((mod) => {
                        const modCount = usageByModulo[mod.id] || 0;
                        return (
                          <div
                            key={mod.id}
                            onClick={() => handleSelectModule(mod.id)}
                            className="group relative p-4 rounded-xl bg-gradient-to-br from-violet-900/60 to-indigo-950/80 border border-violet-500/30 hover:border-violet-400 hover:scale-[1.03] transition-all cursor-pointer shadow-lg min-h-[110px] flex flex-col justify-between"
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
                            <div className="pt-2 flex items-center gap-1 text-[10px] text-emerald-400 font-semibold border-t border-white/5">
                              <CheckCircle2 className="w-3 h-3" />
                              {modCount}/{mod.dailyLimit || 500} consultas hoje
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
