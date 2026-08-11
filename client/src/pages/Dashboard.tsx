import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import NovoDocumentoModal from "@/components/NovoDocumentoModal";
import RecarregaModal from "@/components/RecarregaModal";
import ExtratoModal from "@/components/ExtratoModal";
import ReferralModal from "@/components/ReferralModal";
import ModelosEmissaoModal from "@/components/ModelosEmissaoModal";
import PatentCard from "@/components/PatentCard";
import RenewModal from "@/components/RenewModal";
import DocumentViewerModal from "@/components/DocumentViewerModal";
import {
  FileText, Car, Anchor, FlaskConical, GraduationCap,
  Wallet, TrendingUp, BarChart3, ChevronRight, Plus,
  Clock, CheckCircle, Bell, Download, Trash2, Pill, Pencil, QrCode,
  Copy, X, Send, RefreshCw, Search, Save, Smartphone, AlertTriangle, Gift, Users, Loader2, Settings,
  Eye, Trash, Receipt, Camera, Award
} from "lucide-react";
import AttestationActionButtons from "@/components/AttestationActionButtons";
import { downloadAttestationPdf, fetchLatestAttestationRecord, buildAttestationData } from "@/lib/attestationActions";
import { toast } from "sonner";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import CertificadoFGVDocument from "@/components/CertificadoFGVDocument";
import AttestationDocument from "@/components/AttestationDocument";
import { usePDFExport, generatePDFFilename } from "@/lib/pdfExport";

const quickActionsRaw = [
  { key: "atestado", icon: FileText, label: "Novo Atestado", desc: "Emitir atestado médico", path: "/atestadocria", color: "yellow" },
  { key: "cnh", icon: Car, label: "Nova CNH", desc: "Emitir CNH digital", path: "/cnhcria", color: "amber" },
  { key: "crlv", icon: Car, label: "Novo CRLV", desc: "Emitir CRLV veicular", path: "/crlvcria", color: "emerald" },
  { key: "cha", icon: Anchor, label: "Nova CHA", desc: "Emitir CHA náutica", path: "/chacria", color: "cyan" },
  { key: "toxicologico", icon: FlaskConical, label: "Toxicológico", desc: "Emitir laudo toxicológico", path: "/toxicria", color: "emerald" },
  { key: "historico-sp", icon: GraduationCap, label: "Histórico SP", desc: "Emitir histórico escolar SP", path: "/historico-sp", color: "green" },
  { key: "historico-uninter", icon: GraduationCap, label: "Histórico UNINTER", desc: "Emitir histórico UNINTER", path: "/historicocria", color: "indigo" },
  { key: "receita", icon: Pill, label: "Dr. Consulta", desc: "Emitir receituário médico", path: "/receitacria", color: "violet" },
  { key: "peticao-stj", icon: FileText, label: "STJ Petição", desc: "Emitir petição jurídica STJ", path: "/peticaocria", color: "indigo" },
  { key: "bot-adv", icon: Search, label: "Bot Adv", desc: "Consulta Judicial Inteligente", path: "/bot-adv", color: "blue" },
  { key: "consultas", icon: Search, label: "Master Buscas", desc: "Pesquisa cadastral completa", path: "/consultas", color: "violet" },
  { key: "fgv", icon: Award, label: "Certificado FGV", desc: "Emitir certificado FGV", path: "/certificado-fgv", color: "blue" },
];

const colorMap: Record<string, { bg: string; text: string; iconBg: string; badge: string }> = {
  yellow:  { bg: "bg-yellow-50 dark:bg-yellow-900/10",  text: "text-yellow-600 dark:text-yellow-400",  iconBg: "bg-yellow-100 dark:bg-yellow-900/30", badge: "bg-yellow-500" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-900/10",    text: "text-amber-600 dark:text-amber-400",    iconBg: "bg-amber-100 dark:bg-amber-900/30",   badge: "bg-amber-500" },
  cyan:    { bg: "bg-cyan-50 dark:bg-cyan-900/10",      text: "text-cyan-600 dark:text-cyan-400",      iconBg: "bg-cyan-100 dark:bg-cyan-900/30",     badge: "bg-cyan-500" },
  purple:  { bg: "bg-purple-50 dark:bg-purple-900/10",  text: "text-purple-600 dark:text-purple-400",  iconBg: "bg-purple-100 dark:bg-purple-900/30", badge: "bg-purple-500" },
  green:   { bg: "bg-green-50 dark:bg-green-900/10",    text: "text-green-600 dark:text-green-400",    iconBg: "bg-green-100 dark:bg-green-900/30",   badge: "bg-green-500" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-900/10",  text: "text-indigo-600 dark:text-indigo-400",  iconBg: "bg-indigo-100 dark:bg-indigo-900/30", badge: "bg-indigo-500" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/10",text: "text-emerald-600 dark:text-emerald-400",iconBg: "bg-emerald-100 dark:bg-emerald-900/30",badge: "bg-emerald-500" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-900/10",  text: "text-violet-600 dark:text-violet-400",  iconBg: "bg-violet-100 dark:bg-violet-900/30",  badge: "bg-violet-500" },
  blue:    { bg: "bg-blue-50 dark:bg-blue-900/10",    text: "text-blue-600 dark:text-blue-400",    iconBg: "bg-blue-100 dark:bg-blue-900/30",   badge: "bg-blue-500" },
};

const INITIAL_HISTORY_TABS = [
  { key: "atestado", label: "Atestado", icon: FileText, color: "yellow" },
  { key: "cnh", label: "CNH", icon: Car, color: "amber" },
  { key: "crlv", label: "CRLV", icon: Car, color: "emerald" },
  { key: "cha", label: "CHA", icon: Anchor, color: "cyan" },
  { key: "toxicologico", label: "Toxicológico", icon: FlaskConical, color: "emerald" },
  { key: "historico-sp", label: "Histórico SP", icon: GraduationCap, color: "green" },
  { key: "historico-uninter", label: "UNINTER", icon: GraduationCap, color: "indigo" },
  { key: "fgv", label: "Certificado FGV", icon: Award, color: "blue" },
  { key: "peticao-stj", label: "Petição STJ", icon: FileText, color: "indigo" },
  { key: "receita", label: "Receitas", icon: Pill, color: "violet" },
];

const TAB_LABELS: Record<string, string> = {
  atestado: "Atestado",
  cnh: "CNH",
  crlv: "CRLV",
  cha: "CHA",
  toxicologico: "Toxicológico",
  "historico-sp": "Histórico SP",
  "historico-uninter": "UNINTER",
  fgv: "Certificado FGV",
  "peticao-stj": "Petição STJ",
  receita: "Receita",
};

interface DocRecord {
  id: string;
  seq_id?: number;
  type: string;
  paciente?: string;
  nome?: string;
  cpf?: string;
  created_at: string;
  expires_at?: string;
  status: string;
  codigo_qr?: string;
  codigo_validacao?: string;
  data_emissao?: string;
  data?: any;
}

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("atestado");
  const [historyTabs, setHistoryTabs] = useState(INITIAL_HISTORY_TABS);
  const [history, setHistory] = useState<DocRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [showNovoDocModal, setShowNovoDocModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showRecarregaModal, setShowRecarregaModal] = useState(false);
  const [showExtratoModal, setShowExtratoModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showModelsModal, setShowModelsModal] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Additional states for history management
  const [viewAtestado, setViewAtestado] = useState<DocRecord | null>(null);
  const [downloadingAtestadoId, setDownloadingAtestadoId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showRenewModal, setShowRenewModal] = useState<DocRecord | null>(null);
  const parseDocData = (doc: DocRecord) => {
    let parsed: any = {};
    try { 
      parsed = typeof doc.data === "string" ? JSON.parse(doc.data) : (doc.data || {}); 
    } catch {}
    return parsed;
  };

  const getDocRetentionDays = (type: string): number => {
    if (type === "cnh") return 90;
    if (type === "peticao-stj" || type === "peticaocria") return 3;
    return 30;
  };

  const filteredHistory = history.filter(doc => {
    // Excluir automaticamente documentos expirados do frontend
    const defaultDays = getDocRetentionDays(doc.type);
    const rawExpires = doc.expires_at || (doc.created_at ? new Date(new Date(doc.created_at).getTime() + defaultDays * 24 * 60 * 60 * 1000).toISOString() : "");
    if (rawExpires) {
      const daysRemaining = getDaysRemaining(rawExpires);
      if (daysRemaining !== null && daysRemaining < 0) {
        return false; // VENCIDO -> Não exibir no painel
      }
    }

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();
    const parsed = parseDocData(doc);
    
    const paciente = String(doc.paciente || "").toLowerCase();
    const nome = String(doc.nome || "").toLowerCase();
    const cpf = String(doc.cpf || parsed.cpf || parsed.cpf_paciente || "").toLowerCase();
    
    const parsedNome = String(parsed.nome || parsed.nome_aluno || parsed.nome_paciente || "").toLowerCase();
    const docId = String(doc.id || "").toLowerCase();
    const codigoQR = String(doc.codigo_qr || doc.codigo_validacao || "").toLowerCase();
    const parsedCurso = String(parsed.curso || "").toLowerCase();
    
    return (
      paciente.includes(term) ||
      nome.includes(term) ||
      cpf.includes(term) ||
      parsedNome.includes(term) ||
      docId.includes(term) ||
      codigoQR.includes(term) ||
      parsedCurso.includes(term)
    );
  });

  const handleRenew = (doc: DocRecord) => {
    setShowRenewModal(doc);
  };

  const handleWhatsAppHistory = (doc: DocRecord) => {
    const parsed = parseDocData(doc);
    const codigoQR = doc.codigo_qr || doc.codigo_validacao || doc.id?.slice(0, 8);
    const domain = doc.type === 'cnh' ? 'carteira-digital-transito-vio.digital' : 'validaratestado.digital';
    const link = `https://${domain}/v/${codigoQR}`;
    const texto = encodeURIComponent(
      `*DocMaster - ${doc.type === 'cnh' ? 'CNH Digital' : 'CHA Náutica'}*\n\nOlá! Segue seu documento gerado pelo DocMaster.\n\nNome: ${doc.nome || parsed.nome || doc.paciente || '—'}\nCPF: ${doc.cpf || parsed.cpf || '—'}\n\nAcesse o documento: ${link}\n\n_Documento gerado por DocMaster_`
    );
    window.open(`https://wa.me/?text=${texto}`, "_blank");
  };

  const getEditPath = (doc: DocRecord) => {
    const type = doc?.type || (activeTab === "receita" ? "receita" : "atestado");
    if (type === "atestado") return `/atestado/editar/${doc.id}`;
    if (type === "cnh") return `/cnh/editar/${doc.id}`;
    if (type === "cha") return `/cha/editar/${doc.id}`;
    if (type === "crlv" || type === "crlvcria") return `/crlv/editar/${doc.id}`;
    if (type === "receita") return `/receita/editar/${doc.id}`;
    if (type === "historico-uninter" || type === "historicocria") return `/historicocria/editar/${doc.id}`;
    if (type === "historico-sp") return `/historico-sp`;
    if (type === "toxicria" || type === "toxicologico" || type === "laudocria") return `/toxicria/editar/${doc.id}`;
    if (type === "peticao-stj" || type === "peticaocria") return `/peticaocria/editar/${doc.id}`;
    if (type === "fgv") return `/certificado-fgv/editar/${doc.id}`;
    return `/atestado/editar/${doc.id}`;
  };

  useEffect(() => {
    refresh();
    loadStats();
    loadNotifications();
    loadLoyalty();
  }, [refresh]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) return dateStr.slice(0, 10);
      if (dateStr.includes("-") && dateStr.length >= 10) {
        const [y, m, d] = dateStr.slice(0, 10).split("-");
        return `${d}/${m}/${y}`;
      }
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch { return dateStr; }
  };

  const getDaysRemaining = (dateStr: string) => {
    if (!dateStr) return null;
    try {
      let d: Date;
      if (/^\d{2}\/\d{2}\/\d{4}/.test(dateStr)) {
        const [day, month, year] = dateStr.split("/");
        d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        d = new Date(dateStr);
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      d.setHours(0, 0, 0, 0);
      const diff = d.getTime() - today.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    } catch { return null; }
  };

  const loadStats = async () => {
    try {
      const res = await fetch("/api/attestations?stats=1", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      }
    } catch {}
  };

  const loadLoyalty = async () => {
    try {
      const res = await fetch("/api/referral", { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setLoyaltyData(json.loyalty);
      }
    } catch {}
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.notifications) setNotifications(data.notifications.slice(0, 3));
      }
    } catch {}
  };

  const loadHistory = async (type: string) => {
    setHistoryLoading(true);
    try {
      const endpoint = type === "atestado" ? `/api/attestations?limit=50` : type === "receita" ? `/api/receitas?limit=50` : `/api/documents/${type}?limit=50`;
      const res = await fetch(endpoint, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.data || data.attestations || data.documents || []);
      }
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(activeTab);
  }, [activeTab]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      let endpoint = `/api/documents/${id}`;
      if (activeTab === "atestado") endpoint = `/api/attestations/${id}`;
      else if (activeTab === "receita") endpoint = `/api/receitas/${id}`;
      
      const res = await fetch(endpoint, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setHistory(prev => prev.filter(d => d.id !== id));
        setConfirmDeleteId(null);
        toast.success("Documento excluído com sucesso!");
      } else {
        toast.error("Erro ao excluir documento.");
      }
    } catch {
      toast.error("Erro ao excluir documento.");
    } finally {
      setDeletingId(null);
    }
  };

  const openViewAtestado = async (doc: DocRecord) => {
    if (doc.type === "atestado") {
      try {
        const latestDoc = await fetchLatestAttestationRecord(doc);
        setHistory((prev) => prev.map((item) => (item.id === latestDoc.id ? latestDoc : item)));
        setViewAtestado(latestDoc);
      } catch {
        setViewAtestado(doc);
      }
    } else {
      setViewAtestado(doc);
    }
  };

  const handleDirectDownloadAtestado = async (doc: DocRecord) => {
    setDownloadingAtestadoId(doc.id);
    try {
      const latestDoc = await downloadAttestationPdf(doc);
      setHistory((prev) => prev.map((item) => (item.id === latestDoc.id ? latestDoc : item)));
      toast.success("PDF baixado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setDownloadingAtestadoId(null);
    }
  };

  const { exportPDF, exporting: isExportingGeneric } = usePDFExport();

  const handleDirectDownloadGeneric = async (doc: DocRecord) => {
    setDownloadingAtestadoId(doc.id);
    try {
      const latestDoc = await fetchLatestAttestationRecord(doc);
      const parsed = typeof latestDoc.data === "string" ? JSON.parse(latestDoc.data) : (latestDoc.data || {});
      
      if (doc.type === "fgv") {
        const container = document.createElement("div");
        container.style.cssText = "position:fixed;left:-9999px;top:0;width:1123px;background:white;";
        document.body.appendChild(container);
        
        const root = createRoot(container);
        await new Promise<void>((resolve) => {
          root.render(createElement(CertificadoFGVDocument, { data: parsed }));
          setTimeout(resolve, 1200);
        });
        
        await exportPDF(container.firstElementChild as HTMLElement, {
          filename: generatePDFFilename(parsed.nome_aluno || "certificado", "fgv"),
          docType: "fgv",
          orientation: "l",
          scale: 2,
        });
        
        root.unmount();
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      } else {
        const latestDocVal = await downloadAttestationPdf(latestDoc);
        setHistory((prev) => prev.map((item) => (item.id === latestDocVal.id ? latestDocVal : item)));
      }
      toast.success("PDF baixado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setDownloadingAtestadoId(null);
    }
  };

  const perms = (() => {
    if (!user?.permissions) return { editaveis: [], ferramentas: [] };
    if (typeof user.permissions === "object") return user.permissions;
    try {
      return JSON.parse(user.permissions);
    } catch {
      return { editaveis: [], ferramentas: [] };
    }
  })();
  const allowedEditables = Array.isArray(perms.editaveis) ? perms.editaveis : [];
  const allowedTools = Array.isArray(perms.ferramentas) ? perms.ferramentas : [];

  const freeDocs = (() => {
    if (!user?.free_documents) return [];
    if (Array.isArray(user.free_documents)) return user.free_documents;
    try {
      return JSON.parse(user.free_documents);
    } catch {
      return [];
    }
  })();

  const isToolAllowed = (key: string) => {
    if (user?.role === "admin") return true;
    if (freeDocs.includes(key) || (key === "consultas" && freeDocs.includes("consultas"))) return true;
    if (["bot-adv", "peticao-stj", "consultas"].includes(key)) {
      return allowedTools.includes(key) || freeDocs.includes(key);
    }
    if (key === "toxicria") return allowedEditables.includes("toxicologico") || freeDocs.includes("toxicologico");
    if (key === "crlv" || key === "crlvcria") return allowedEditables.includes("crlv") || allowedEditables.includes("cnh") || freeDocs.includes("crlv") || true;
    return allowedEditables.includes(key) || freeDocs.includes(key);
  };

  const filteredQuickActions = quickActionsRaw.filter(action => isToolAllowed(action.key));
  const hasAnyPermission = user?.role === "admin" || filteredQuickActions.length > 0 || freeDocs.length > 0 || allowedEditables.length > 0 || allowedTools.length > 0;
  const hasEmissions = Object.values(stats).some(val => typeof val === 'number' && val > 0);

const intelligentStats = [
    { key: "atestado", icon: FileText, label: "Atestados", color: "blue" },
    { key: "cnh", icon: Car, label: "CNHs", color: "blue" },
    { key: "cha", icon: Anchor, label: "CHAs", color: "blue" },
    { key: "toxicologico", icon: FlaskConical, label: "Toxicológico", color: "blue" },
    { key: "receita", icon: Pill, label: "Receitas", color: "blue" },
    { key: "historico-sp", icon: GraduationCap, label: "Histórico SP", color: "blue" },
    { key: "historico-uninter", icon: GraduationCap, label: "UNINTER", color: "blue" },
  ].map(s => ({ ...s, value: stats[s.key] ?? 0 }))
   .sort((a, b) => b.value - a.value)
   .slice(0, 4);

  return (
    <DashboardLayout>
      <div className="p-7 max-w-7xl mx-auto">
        {/* Banner de Boas-vindas */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
              {getGreeting()}, {user?.displayName || user?.username}!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base font-medium max-w-2xl">
              Bem-vindo ao maior e melhor painel da atualidade — <span className="text-blue-600 font-bold">DocMaster</span>
            </p>
            {hasAnyPermission && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => setShowNovoDocModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Novo Documento
                </button>
                <button onClick={() => setShowModelsModal(true)} className="bg-white text-blue-600 border border-blue-100 hover:bg-blue-50 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95">
                  <Camera className="w-4 h-4" /> Modelos de Emissão
                </button>
                <button onClick={() => setShowReferralModal(true)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95">
                  <Gift className="w-4 h-4" /> Indique e Ganhe
                </button>
              </div>
            )}
            {!hasAnyPermission && user?.role !== "admin" && (
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-2xl">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Aguardando Liberação do Administrador
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">Sua conta está ativa, mas você ainda não possui ferramentas liberadas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Patent Card */}
        {loyaltyData && <PatentCard loyalty={loyaltyData} />}

        {/* Sua Rede de Indicações (Resumo) */}
        {loyaltyData && (
          <div className="mb-8 p-6 bg-emerald-50/50 dark:bg-emerald-900/5 rounded-[2rem] border border-emerald-100/50 dark:border-emerald-800/30 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                   <Gift size={24} />
                </div>
                <div>
                   <h3 className="text-sm font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-tight m-0">Sua Rede de Indicações</h3>
                   <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 font-bold uppercase tracking-widest mt-1">Ganhe 10% de todas as recargas da sua rede</p>
                </div>
             </div>
             <div className="flex items-center gap-6">
                <div className="text-center">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Ganhos</p>
                   <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">R$ {Number(loyaltyData.totalEarnings || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="w-px h-8 bg-emerald-200 dark:bg-emerald-800/50" />
                <button 
                  onClick={() => setShowReferralModal(true)}
                  className="bg-white dark:bg-slate-900 border-2 border-emerald-500 text-emerald-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all active:scale-95 flex items-center gap-2"
                >
                  <Users size={14} /> Minha Rede
                </button>
             </div>
          </div>
        )}

        {/* Resumo Financeiro Rapido */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-900/20 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
               <Wallet size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-blue-100 text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-80">Saldo Disponível</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums mb-1">
                R$ {((user?.balance || 0) / 100).toFixed(2).replace('.', ',')}
              </h2>
              <div className="flex items-center gap-2 mt-4">
                <div className="px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Conta Ativa
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10">
              <button 
                onClick={() => {
                  const event = new CustomEvent("docmaster:open-recarrega-modal");
                  window.dispatchEvent(event);
                }}
                className="bg-white text-blue-700 hover:bg-blue-50 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
              >
                <Plus className="w-4 h-4" /> Recarregar
              </button>
              <button 
                onClick={() => setShowExtratoModal(true)}
                className="bg-blue-800/40 hover:bg-blue-800/60 backdrop-blur-md text-white border border-white/10 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Receipt className="w-4 h-4" /> Ver Extrato
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {hasEmissions && (
          <div className="mb-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">Estatísticas</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {intelligentStats.map((s, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm group hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center ${colorMap[s.color].iconBg}`}>
                    <s.icon className={`w-6 h-6 ${colorMap[s.color].text}`} />
                  </div>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{s.label}</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white mt-1 group-hover:text-blue-600 transition-colors tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {hasEmissions && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h2 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">Histórico de Emissões</h2>
              </div>
              <div className="relative w-full sm:w-80">
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="Pesquisar nome, CPF ou código..." 
                  className="w-full pl-10 pr-9 py-2.5 text-[11px] font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm transition-all uppercase"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <Search size={14} />
                </div>
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm("")} 
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
              <div className="flex border-b border-gray-100 dark:border-gray-800 overflow-x-auto no-scrollbar">
                {historyTabs.filter(t => isToolAllowed(t.key)).map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === tab.key ? "border-blue-600 text-blue-600 bg-blue-50/30" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {historyLoading ? (
                  <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>
                ) : history.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                    <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhuma {TAB_LABELS[activeTab] || activeTab} emitida ainda</h3>
                    <button onClick={() => setLocation(quickActionsRaw.find(a => a.key === activeTab)?.path || "/dashboard")} className="mt-4 px-4 py-2 bg-blue-600 text-white text-[10px] font-black rounded-lg uppercase">Emitir Documento</button>
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-pulse" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhum resultado encontrado para "{searchTerm}"</h3>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Tente buscar por outro termo</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Documento / Nome</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">CPF / Registro</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Criado Em</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Validade no Painel</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {filteredHistory.map(doc => {
                          const parsed = parseDocData(doc);
                          const cpf = doc.cpf || parsed.cpf || parsed.cpf_paciente || "—";
                          const codigoQR = doc.codigo_qr || doc.codigo_validacao || (doc.id && doc.id.includes("-") ? doc.id.slice(0, 8) : "—");

                          let docTitle = "Documento";
                          if (doc.type === "fgv") {
                            docTitle = `Certificado FGV - ${parsed.nome_aluno || "—"}`;
                          } else if (doc.type === "historico-uninter") {
                            docTitle = `Histórico UNINTER - ${parsed.nome_aluno || parsed.nome || "—"}`;
                          } else if (doc.type === "historico-sp") {
                            docTitle = `Histórico SP - ${parsed.nome || "—"}`;
                          } else if (doc.type === "peticao-stj") {
                            docTitle = `Petição STJ - ${parsed.nome_parte || parsed.nome || "—"}`;
                          } else if (doc.type === "crlv" || doc.type === "crlvcria") {
                            docTitle = `CRLV Digital - ${parsed.proprietario_nome || doc.nome || "—"}`;
                          } else if (doc.type === "atestado") {
                            docTitle = `Atestado Médico - ${doc.paciente || doc.nome || parsed.nome_paciente || "—"}`;
                          } else if (doc.type === "receita") {
                            docTitle = `Receituário Médico - ${doc.paciente || doc.nome || parsed.nome_paciente || "—"}`;
                          } else if (doc.type === "cnh") {
                            docTitle = `CNH Digital - ${doc.nome || parsed.nome || "—"}`;
                          } else if (doc.type === "cha") {
                            docTitle = `CHA Náutica - ${doc.nome || parsed.nome || "—"}`;
                          } else {
                            const typeStr = doc.type ? String(doc.type).toUpperCase() : "";
                            const patientStr = doc.paciente || doc.nome || parsed.nome || "—";
                            docTitle = typeStr ? `${typeStr} - ${patientStr}` : patientStr;
                          }

                          const defaultDays = doc.type === "cnh" ? 90 : (doc.type === "peticao-stj" || doc.type === "peticaocria") ? 3 : 30;
                          const rawExpires = doc.expires_at || (doc.created_at ? new Date(new Date(doc.created_at).getTime() + defaultDays * 24 * 60 * 60 * 1000).toISOString() : "");
                          const validadePainel = rawExpires || "—";
                          const daysRemaining = getDaysRemaining(validadePainel);
                          const isExpired = daysRemaining !== null && daysRemaining < 0;
                          const isNearExp = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 15;

                          return (
                            <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors border-b border-gray-100 dark:border-gray-800/50">
                              <td className="px-6 py-5">
                                <div className="flex flex-col">
                                  <span className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-tight">{docTitle}</span>
                                  {codigoQR && codigoQR !== "—" && (
                                    <span 
                                      onClick={() => {
                                        navigator.clipboard.writeText(codigoQR);
                                        toast.success("Código copiado!");
                                      }}
                                      className="text-[10px] text-blue-600 font-mono font-bold uppercase mt-0.5 cursor-pointer hover:underline"
                                      title="Clique para copiar código"
                                    >
                                      Código: {codigoQR}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <span className="text-[11px] font-black text-gray-600 dark:text-gray-400 font-mono tracking-tighter">{cpf}</span>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-black text-gray-700 dark:text-gray-300">
                                    {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">
                                    {new Date(doc.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${isExpired ? "bg-red-500 animate-pulse" : isNearExp ? "bg-amber-500" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"}`} />
                                    <span className={`text-[11px] font-black uppercase ${isExpired ? "text-red-600" : isNearExp ? "text-amber-600" : "text-emerald-600 dark:text-emerald-400"}`}>
                                      {formatDate(validadePainel)}
                                    </span>
                                  </div>
                                  {daysRemaining !== null && (
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isExpired ? "text-red-500" : isNearExp ? "text-amber-500" : "text-gray-400"}`}>
                                      {isExpired ? "EXPIRADO" : isNearExp ? `EXPIRA EM ${daysRemaining} DIAS` : `${daysRemaining} DIAS RESTANTES`}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex justify-end scale-90 origin-right">
                                  <AttestationActionButtons
                                    onRenew={() => handleRenew(doc)}
                                    onView={() => openViewAtestado(doc)}
                                    onDownload={doc.type === "atestado" ? () => handleDirectDownloadAtestado(doc) : () => handleDirectDownloadGeneric(doc)}
                                    isDownloading={downloadingAtestadoId === doc.id}
                                    onEdit={() => setLocation(getEditPath(doc))}
                                    onWhatsApp={() => handleWhatsAppHistory(doc)}
                                    onDelete={() => setConfirmDeleteId(doc.id)}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Access */}
        {hasAnyPermission && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">Acesso Rápido</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredQuickActions.map((action, i) => (
                <button key={i} onClick={() => setLocation(action.path)} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left group">
                  <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${colorMap[action.color].iconBg}`}>
                    <action.icon className={`w-5 h-5 ${colorMap[action.color].text}`} />
                  </div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-blue-600 transition-colors">{action.label}</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase mt-1">{action.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <NovoDocumentoModal open={showNovoDocModal} onClose={() => setShowNovoDocModal(false)} userBalance={user?.balance || 0} username={user?.username || ""} />
      <RecarregaModal isOpen={showRecarregaModal} onClose={() => setShowRecarregaModal(false)} userName={user?.displayName || user?.username || ""} />
      <ExtratoModal isOpen={showExtratoModal} onClose={() => setShowExtratoModal(false)} />
      <ReferralModal isOpen={showReferralModal} onClose={() => setShowReferralModal(false)} />
      <ModelosEmissaoModal isOpen={showModelsModal} onClose={() => setShowModelsModal(false)} />

      {showRenewModal && (
        <RenewModal
          isOpen={!!showRenewModal}
          onClose={() => setShowRenewModal(null)}
          doc={showRenewModal}
          onRenewSuccess={() => {
            refresh();
            loadHistory(activeTab);
          }}
        />
      )}

      {/* ── VIEWER & DELETE MODALS ── */}
      {viewAtestado && (
        <DocumentViewerModal
          doc={viewAtestado}
          isDownloading={downloadingAtestadoId === viewAtestado.id}
          onClose={() => setViewAtestado(null)}
          onDownload={() => handleDirectDownloadAtestado(viewAtestado)}
          onEdit={() => {
            const path = getEditPath(viewAtestado);
            setViewAtestado(null);
            setLocation(path);
          }}
        />
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Excluir Documento?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                Esta ação é permanente e não poderá ser desfeita. Deseja continuar?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all">
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
                className="px-4 py-3 text-xs font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                {deletingId === confirmDeleteId ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
