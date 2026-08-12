import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import AttestationDocument from "@/components/AttestationDocument";
import StudioEngine from "@/components/StudioEngine";
import { toast } from "sonner";
import { triggerPermissionsUpdate } from "@/lib/permissions";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Settings, Plus, Minus, Shield,
  RefreshCw, DollarSign, Trash2, ToggleLeft, ToggleRight,
  Bell, AlertTriangle, CheckCircle, Info, FileText,
  Activity, Database, Search, Eye, EyeOff, X, Save, Layout,
  Download, Pencil, Wifi, WifiOff, Monitor, Globe, Anchor,
  CreditCard, AlertCircle, Filter, Gift, Percent, Wallet,
  Link, Copy, Calendar, Trash, Lock, UserPlus, Clock, User, TrendingUp,
  Car, FlaskConical, GraduationCap, Pill, Wand2
} from "lucide-react";

type Tab = "users" | "tools" | "studio" | "pricing" | "notices" | "logs" | "emissions" | "monitoring" | "referral" | "settings" | "database";

interface EmissionRow {
  id: string;
  user_id: string;
  username?: string;
  paciente?: string;
  nome?: string;
  type: string;
  status: string;
  codigo_qr?: string;
  created_at: string;
  table_source?: string;
  data?: any;
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  role: string;
  balance: number;
  is_active: number;
  created_at: string;
  profile_photo?: string;
  cashback_percentage?: number | null;
  referral_percentage?: number | null;
  free_documents?: string[];
}

interface PricingRow {
  document_type: string;
  display_name: string;
  price: number;
  is_active?: boolean;
}

interface LogRow {
  id: string;
  user_id?: string;
  username?: string;
  action: string;
  category?: string;
  severity?: string;
  details?: string;
  target_type?: string;
  target_id?: string;
  created_at: string;
}

interface NoticeRow {
  id?: number;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  is_active: number;
  created_at?: string;
}

interface PresenceRow {
  user_id: string;
  username: string;
  email?: string;
  role?: string;
  balance?: number;
  profile_photo?: string;
  current_page: string;
  current_action: string;
  last_seen: string;
  is_online: number;
  first_seen?: string;
  session_started_at?: string;
  current_page_started_at?: string;
  total_session_seconds?: number;
  current_page_duration_seconds?: number;
  timeline?: Array<{
    id: string;
    page_path: string;
    action: string;
    started_at: string;
    ended_at?: string | null;
    duration_seconds: number;
  }>;
  page_totals?: Array<{
    page: string;
    duration_seconds: number;
  }>;
}

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "users", label: "Usuários", icon: Users },
  { key: "tools", label: "Ferramentas (Módulos)", icon: Shield },
  { key: "monitoring", label: "Monitoramento", icon: Monitor },
  { key: "pricing", label: "Preços", icon: DollarSign },
  { key: "notices", label: "Avisos", icon: Bell },
  { key: "logs", label: "Logs", icon: Activity },
  { key: "emissions", label: "Emissões", icon: FileText },
  { key: "referral", label: "Indicações", icon: Gift },
  { key: "settings", label: "Configurações", icon: Settings },
];

const NOTICE_TYPES = [
  { value: "info", label: "Informação", icon: Info },
  { value: "warning", label: "Aviso", icon: AlertTriangle },
  { value: "error", label: "Urgente", icon: AlertTriangle },
  { value: "success", label: "Sucesso", icon: CheckCircle },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  consultas: "Master Buscas (/consultas)",
  atestado: "Atestado Médico",
  receita: "Receituário Médico",
  cnh: "CNH Digital",
  crlv: "CRLV Digital",
  crlvcria: "CRLV Digital",
  cha: "CHA Náutica",
  toxicologico: "Exame Toxicológico",
  toxicria: "Toxicológico Sodré",
  laudocria: "Laudo Sodré",
  "historico-sp": "Histórico Escolar SP",
  "historico-uninter": "Histórico UNINTER",
  historicocria: "Histórico UNINTER",
  "peticao-stj": "Petição STJ",
  peticaocria: "Petição STJ",
  fgv: "Certificado FGV",
  "diploma-uninter": "Diploma UNINTER",
};

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/atestado": "Emitindo Atestado",
  "/atestadocria": "Emitindo Atestado",
  "/cnh": "Emitindo CNH",
  "/cnhcria": "Emitindo CNH",
  "/cha": "Emitindo CHA",
  "/chacria": "Emitindo CHA",
  "/toxicologico": "Emitindo Toxicológico",
  "/toxicologicocria": "Emitindo Toxicológico",
  "/receita": "Emitindo Receita",
  "/receitacria": "Emitindo Receita",
  "/historico-sp": "Emitindo Histórico SP",
  "/historicocria": "Emitindo Histórico UNINTER",
  "/admin": "Painel Admin",
  "/configuracoes": "Configurações",
  "/extrato": "Extrato",
  "/recargas": "Recargas",
};

const LOG_CATEGORIES = [
  { value: "all", label: "Todos", icon: Activity },
  { value: "admin", label: "Admin", icon: Shield },
  { value: "payment", label: "Saldo", icon: CreditCard },
  { value: "error", label: "Erros", icon: AlertCircle },
  { value: "system", label: "Sistema", icon: Monitor },
];

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("users");

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [balanceModalUser, setBalanceModalUser] = useState<UserRow | null>(null);
  const [balanceModalValue, setBalanceModalValue] = useState("");
  const [balanceModalType, setBalanceModalType] = useState<"credit" | "debit">("credit");
  const [savingBalance, setSavingBalance] = useState(false);
  const [aclSelectedUser, setAclSelectedUser] = useState<any>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any>({ editaveis: [], ferramentas: [] });
  const [userFreeDocs, setUserFreeDocs] = useState<string[]>([]);

  // Modal de Concessão Manual de Tempo / Plano para /consultas
  const [grantPlanModalUser, setGrantPlanModalUser] = useState<UserRow | null>(null);
  const [grantPlanMode, setGrantPlanMode] = useState<"free" | "plan" | "revoke">("plan");
  const [grantPlanDuration, setGrantPlanDuration] = useState<string>("1_mes");
  const [grantPlanCustomDays, setGrantPlanCustomDays] = useState<number>(30);
  const [grantPlanCustomDate, setGrantPlanCustomDate] = useState<string>("");
  const [savingGrantPlan, setSavingGrantPlan] = useState<boolean>(false);

  const handleGrantPlan = async () => {
    if (!grantPlanModalUser) return;
    setSavingGrantPlan(true);
    try {
      let customExpiresAt = null;
      if (grantPlanDuration === "custom" && grantPlanCustomDate) {
        customExpiresAt = new Date(grantPlanCustomDate + "T23:59:59").toISOString();
      }

      const res = await fetch("/api/admin/grant-consultas-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: grantPlanModalUser.id,
          mode: grantPlanMode,
          duration: grantPlanDuration,
          custom_days: grantPlanCustomDays,
          custom_expires_at: customExpiresAt
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Plano atualizado com sucesso!");
        triggerPermissionsUpdate();
        if (typeof (window as any).fetchUsers === 'function') (window as any).fetchUsers();
        window.location.reload();
        setGrantPlanModalUser(null);
      } else {
        toast.error(data.error || "Erro ao atualizar plano");
      }
    } catch (err: any) {
      toast.error(`Falha: ${err.message || "Erro de conexão"}`);
    } finally {
      setSavingGrantPlan(false);
    }
  };

  const handleOpenPermissions = (user: any) => {
    setAclSelectedUser(user);
    setUserPermissions(user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : { editaveis: [], ferramentas: [] });
    setUserFreeDocs(user.free_documents || []);
    setShowPermissionsModal(true);
  };

  const savePermissions = async () => {
    try {
      setLoading(true);
      // Sincronizar 'consultas' entre free_documents e permissions.ferramentas
      let nextFerramentas = Array.isArray(userPermissions.ferramentas) ? [...userPermissions.ferramentas] : [];
      const hasConsultasFree = userFreeDocs.includes("consultas");
      if (hasConsultasFree && !nextFerramentas.includes("consultas")) {
        nextFerramentas.push("consultas");
      } else if (!hasConsultasFree && nextFerramentas.includes("consultas")) {
        nextFerramentas = nextFerramentas.filter(t => t !== "consultas");
      }
      const updatedPermissions = { ...userPermissions, ferramentas: nextFerramentas };

      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          user_id: aclSelectedUser.id, 
          permissions: updatedPermissions,
          free_documents: userFreeDocs 
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Save permissions error:", errorText);
        throw new Error(`Erro HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        toast.success("Acessos liberados com sucesso!");
        triggerPermissionsUpdate();
        // Atualizar estado local com objetos PARSEADOS para paridade com o load inicial
        setUsers(prev => prev.map(u => u.id === aclSelectedUser.id ? { 
          ...u, 
          permissions: updatedPermissions,
          free_documents: userFreeDocs
        } : u));
        setShowPermissionsModal(false);
      } else {
        toast.error(data.error || "Erro ao salvar permissões.");
      }
    } catch (err: any) {
      console.error("Save permissions exception:", err);
      toast.error(`Falha ao salvar: ${err.message || "Erro de conexão"}`);
    } finally {
      setLoading(false);
    }
  };

  const selectAllDocs = (selected: boolean) => {
    const all = ["atestado", "cnh", "cha", "toxicologico", "toxicria", "laudocria", "receita", "historico-sp", "historicocria", "diploma-uninter"];
    setUserPermissions({ ...userPermissions, editaveis: selected ? all : [] });
  };

  const selectAllTools = (selected: boolean) => {
    const all = ["bot-adv", "peticao-stj", "consultas"];
    setUserPermissions({ ...userPermissions, ferramentas: selected ? all : [] });
    if (selected && !userFreeDocs.includes("consultas")) {
      setUserFreeDocs([...userFreeDocs, "consultas"]);
    } else if (!selected && userFreeDocs.includes("consultas")) {
      setUserFreeDocs(userFreeDocs.filter(s => s !== "consultas"));
    }
  };

  const toggleConsultasAccess = async (user: UserRow) => {
    const currentFree = Array.isArray(user.free_documents) ? user.free_documents : [];
    const hasConsultas = currentFree.includes("consultas");
    const newFree = hasConsultas
      ? currentFree.filter(s => s !== "consultas")
      : [...currentFree, "consultas"];

    const currentPerms = typeof user.permissions === 'object' && user.permissions !== null
      ? user.permissions
      : { editaveis: [], ferramentas: [] };
    const currentTools = Array.isArray(currentPerms.ferramentas) ? currentPerms.ferramentas : [];
    const newTools = hasConsultas
      ? currentTools.filter((t: string) => t !== "consultas")
      : [...currentTools, "consultas"];
    const newPerms = { ...currentPerms, ferramentas: newTools };

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: user.id, free_documents: newFree, permissions: newPerms }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          hasConsultas
            ? `Módulo /consultas alterado para MODO PAGO para ${user.username}`
            : `Acesso GRATUITO a /consultas liberado para ${user.username}!`
        );
        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, free_documents: newFree, permissions: newPerms } : u))
        );
      } else {
        toast.error(json.error || "Erro ao atualizar permissão");
      }
    } catch {
      toast.error("Erro de conexão");
    }
  };

  const toggleBulkConsultasAccess = async (makeFree: boolean) => {
    toast.info(`Atualizando permissão de consultas para ${users.length} usuários...`);
    for (const u of users) {
      if (u.role === "admin") continue;
      const currentFree = Array.isArray(u.free_documents) ? u.free_documents : [];
      const hasConsultas = currentFree.includes("consultas");
      
      const currentPerms = typeof u.permissions === 'object' && u.permissions !== null
        ? u.permissions
        : { editaveis: [], ferramentas: [] };
      const currentTools = Array.isArray(currentPerms.ferramentas) ? currentPerms.ferramentas : [];

      if (makeFree && !hasConsultas) {
        const newFree = [...currentFree, "consultas"];
        const newTools = [...currentTools, "consultas"];
        const newPerms = { ...currentPerms, ferramentas: newTools };
        await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ user_id: u.id, free_documents: newFree, permissions: newPerms }),
        }).catch(() => {});
      } else if (!makeFree && hasConsultas) {
        const newFree = currentFree.filter(s => s !== "consultas");
        const newTools = currentTools.filter((t: string) => t !== "consultas");
        const newPerms = { ...currentPerms, ferramentas: newTools };
        await fetch("/api/admin/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ user_id: u.id, free_documents: newFree, permissions: newPerms }),
        }).catch(() => {});
      }
    }
    fetchUsers();
    toast.success(
      makeFree
        ? `Acesso GRATUITO a /consultas liberado para todos os usuários!`
        : `Módulo /consultas definido para MODO PAGO para todos os usuários!`
    );
  };
  const [hardDeleteUser, setHardDeleteUser] = useState<UserRow | null>(null);
  const [hardDeleteConfirmChecked, setHardDeleteConfirmChecked] = useState(false);
  const [hardDeleteConfirmText, setHardDeleteConfirmText] = useState("");

  // Pricing
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});
  const [editingDisplayName, setEditingDisplayName] = useState<Record<string, string>>({});
  const [editingIsActive, setEditingIsActive] = useState<Record<string, boolean>>({});

  // Notices
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [newNotice, setNewNotice] = useState<NoticeRow>({
    title: "", message: "", type: "info", is_active: 1
  });

  // Logs
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logFilter, setLogFilter] = useState("");
  const [logCategory, setLogCategory] = useState("all");
  const [logCategories, setLogCategories] = useState<Record<string, number>>({});

  // Emissions
  const [emissions, setEmissions] = useState<EmissionRow[]>([]);
  const [emissionsFilter, setEmissionsFilter] = useState("");
  const [emissionsTypeFilter, setEmissionsTypeFilter] = useState("all");
  const [emissionsDateFrom, setEmissionsDateFrom] = useState("");
  const [emissionsDateTo, setEmissionsDateTo] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteSource, setConfirmDeleteSource] = useState<string>("");
  const [emissionPreview, setEmissionPreview] = useState<any>(null);
  const [emissionPreviewLoading, setEmissionPreviewLoading] = useState(false);

  // Monitoring / Presence
  const [presence, setPresence] = useState<PresenceRow[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [offlineCount, setOfflineCount] = useState(0);
  const [totalTracked, setTotalTracked] = useState(0);

  // Referral
  const [referralData, setReferralData] = useState<any>({});
  const [referralTab, setReferralTab] = useState<"overview" | "referrals" | "earnings" | "cashback" | "users">("overview");
  const [referralSettings, setReferralSettings] = useState({
    referral_percentage: 10, cashback_percentage: 5, referral_enabled: true, cashback_enabled: true
  });
  const [editUserRefId, setEditUserRefId] = useState<string | null>(null);
  const [editUserRefPct, setEditUserRefPct] = useState("");
  const [editUserCbPct, setEditUserCbPct] = useState("");
  // Cashback na aba de usuários
  const [cashbackEditId, setCashbackEditId] = useState<string | null>(null);
  const [cashbackEditValue, setCashbackEditValue] = useState("");

  // Log date filters
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");

  // Pricing save all
  const [pricingSaving, setPricingSaving] = useState(false);

  // Database
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteUserConfirm, setDeleteUserConfirm] = useState("");
  const [deleteTargetUserId, setDeleteTargetUserId] = useState<string | null>(null);
  const [deleteTargetUsername, setDeleteTargetUsername] = useState("");

  // Create user
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newBalance, setNewBalance] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  // Change password
  const [changePwUserId, setChangePwUserId] = useState<string | null>(null);
  const [changePwUsername, setChangePwUsername] = useState("");
  const [changePwValue, setChangePwValue] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // Settings
  const [settings, setSettings] = useState<Record<string, any>>({
    site_name: "DocMaster",
    support_whatsapp: "",
    max_documents_per_day: "100",
    auto_delete_days: "15",
    maintenance_mode: false,
    auto_delete_atestado: "15",
    auto_delete_receita: "15",
    auto_delete_cnh: "365",
    auto_delete_cha: "15",
    auto_delete_toxicologico: "15",
    auto_delete_historico: "90",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [cleanupPreview, setCleanupPreview] = useState<any>(null);
  const [cleanupRunning, setCleanupRunning] = useState(false);

  // Show passwords toggle
  const [showPasswords, setShowPasswords] = useState(false);

  // Manual Referral Link
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkReferrerId, setLinkReferrerId] = useState("");
  const [linkReferredId, setLinkReferredId] = useState("");
  const [linking, setLinking] = useState(false);

  const [loading, setLoading] = useState(false);

  // Financial (Gateway)
  const [gatewayFinancial, setGatewayFinancial] = useState<{ saldo_disponivel?: number; limite_diario?: number } | null>(null);
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning" | "info";
  }>({ open: false, title: "", message: "", onConfirm: () => {}, type: "info" });

   // ── Data Loaders ──────────────────────────────────────────────────────────
  const loadUsers = useCallback(async (withPasswords = false, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const url = withPasswords ? "/api/admin/users?show_passwords=1" : "/api/admin/users";
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        toast.error(`Erro ao carregar usuários: ${data.error || 'Acesso negado'}`);
      }
    } catch (err: any) {
      toast.error(`Erro ao carregar usuários: ${err?.message || 'Erro de conexão'}`);
    }
    finally { if (!silent) setLoading(false); }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(s => ({ ...s, ...data.settings }));
      }
    } catch { /* silently fail */ }
  }, []);

  const loadCleanupPreview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cleanup", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setCleanupPreview(data);
      }
    } catch {}
  }, []);

  const loadPricing = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pricing", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setPricing(data.pricing || []);
        const ep: Record<string, string> = {};
        const edn: Record<string, string> = {};
        const eia: Record<string, boolean> = {};
        (data.pricing || []).forEach((p: PricingRow) => {
          ep[p.document_type] = (p.price / 100).toFixed(2);
          edn[p.document_type] = p.display_name;
          eia[p.document_type] = p.is_active !== false;
        });
        setEditingPrice(ep);
        setEditingDisplayName(edn);
        setEditingIsActive(eia);
      }
    } catch { /* Silent fail in background */ }
  }, []);

  const loadFinancial = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/financial", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setGatewayFinancial(data.data);
      }
    } catch { /* Silent fail in background */ }
  }, []);

  const loadNotices = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications", { credentials: "include" });
      const data = await res.json();
      if (data.success) setNotices(data.notifications || []);
    } catch {}
  }, []);

  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let url = `/api/admin/system-logs?category=${logCategory}&limit=200`;
      if (logDateFrom) url += `&from=${logDateFrom}`;
      if (logDateTo) url += `&to=${logDateTo}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setLogCategories(data.categories || {});
      }
    } catch {
      try {
        const res = await fetch("/api/admin/logs", { credentials: "include" });
        const data = await res.json();
        if (data.success) setLogs(data.logs || []);
      } catch { toast.error("Erro ao carregar logs"); }
    }
    finally { if (!silent) setLoading(false); }
  }, [logCategory, logDateFrom, logDateTo]);

  const clearLogs = (clearType: string = "all") => {
    setConfirmModal({
      open: true,
      title: clearType === "payment" ? "Limpar Logs de Pagamento" : "Limpar Logs",
      message: clearType === "payment"
        ? "Tem certeza que deseja apagar todos os registros de transações e pagamentos? Esta ação é irreversível."
        : `Tem certeza que deseja limpar os logs (${clearType})? Esta ação não pode ser desfeita.`,
      type: "danger",
      onConfirm: async () => {
        setConfirmModal(m => ({ ...m, open: false }));
        try {
          const res = await fetch(`/api/admin/system-logs?clear=${clearType}`, { method: "DELETE", credentials: "include" });
          const data = await res.json();
          if (data.success) { 
            toast.success(clearType === "payment" ? "Logs de pagamento limpos com sucesso!" : "Logs limpos com sucesso!"); 
            if (tab === "logs") loadLogs();
            if (tab === "monitoring") loadPresence();
          }
          else toast.error(data.error || "Erro ao limpar logs");
        } catch { toast.error("Erro de conexão"); }
      },
    });
  };

  const handleUpdateDocValidity = async (emission: EmissionRow, daysToAdd: number, is2099 = false) => {
    let targetDate = new Date();
    if (is2099) {
      targetDate = new Date('2099-12-31T20:59:00.000Z');
    } else {
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
    const expiresIso = targetDate.toISOString();

    try {
      const res = await fetch("/api/admin/emissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: emission.id,
          table_source: emission.table_source || 'documents',
          expires_at: expiresIso,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Validade de ${emission.nome || 'documento'} alterada em tempo real!`, { duration: 2000 });
        loadEmissions();
      } else {
        toast.error(data.error || "Erro ao alterar validade.");
      }
    } catch {
      toast.error("Erro de conexão.");
    }
  };

  const loadReferral = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/referral?tab=${referralTab}`, { credentials: "include" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Erro ${res.status}: ${errData.error || "Falha ao carregar indicações"}`);
        return;
      }
      const data = await res.json();
      setReferralData(data);
      if (referralTab === "overview" && data.settings) {
        const s: any = {};
        for (const item of data.settings) s[item.key] = item.value;
        setReferralSettings({
          referral_percentage: parseFloat(s.referral_percentage || "10"),
          cashback_percentage: parseFloat(s.cashback_percentage || "5"),
          referral_enabled: s.referral_enabled === "true",
          cashback_enabled: s.cashback_enabled === "true",
        });
      }
    } catch (err: any) { toast.error(`Erro ao carregar indicações: ${err?.message || "Erro desconhecido"}`); }
    finally { setLoading(false); }
  }, [referralTab]);

  const saveReferralSettings = async () => {
    try {
      const res = await fetch("/api/admin/referral", {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ action: "update_global_settings", ...referralSettings }),
      });
      const data = await res.json();
      if (data.success) toast.success("Configurações de indicação salvas!");
      else toast.error(data.error || "Erro");
    } catch { toast.error("Erro de conexão"); }
  };

  const saveCashbackForUser = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/referral", {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          action: "update_user_settings", userId: String(userId),
          cashback_percentage: cashbackEditValue !== "" ? parseFloat(cashbackEditValue) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("% Cashback atualizado!");
        setCashbackEditId(null);
        setCashbackEditValue("");
        loadUsers(showPasswords);
      } else toast.error(data.error || "Erro");
    } catch { toast.error("Erro de conexão"); }
  };

  const saveUserRefSettings = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/referral", {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          action: "update_user_settings", userId,
          referral_percentage: editUserRefPct ? parseFloat(editUserRefPct) : null,
          cashback_percentage: editUserCbPct ? parseFloat(editUserCbPct) : null,
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success("% do usuário atualizado!"); setEditUserRefId(null); loadReferral(); }
      else toast.error(data.error || "Erro");
    } catch { toast.error("Erro de conexão"); }
  };

  const saveAllPrices = async () => {
    setPricingSaving(true);
    try {
      const prices = pricing.map(p => ({
        document_type: p.document_type,
        display_name: editingDisplayName[p.document_type] ?? p.display_name,
        price: Math.round(parseFloat(editingPrice[p.document_type] || "0") * 100),
        is_active: editingIsActive[p.document_type] !== false,
      }));
      const res = await fetch("/api/admin/pricing", {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ prices }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Todos os preços atualizados com sucesso!"); loadPricing(); }
      else toast.error(data.error || "Erro ao salvar preços");
    } catch { toast.error("Erro de conexão"); }
    finally { setPricingSaving(false); }
  };

  const loadEmissions = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = emissionsTypeFilter !== "all" ? `&type=${emissionsTypeFilter}` : "";
      const res = await fetch(`/api/admin/emissions?limit=500${typeParam}`, { credentials: "include" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Erro ${res.status}: ${errData.error || "Falha ao carregar emissões"}`);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setEmissions(data.emissions || []);
      } else {
        toast.error(data.error || "Erro ao carregar emissões");
      }
    } catch (err: any) {
      toast.error(`Erro ao carregar emissões: ${err?.message || "Erro desconhecido"}`);
    }
    finally { setLoading(false); }
  }, [emissionsTypeFilter]);

  const loadPresence = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/presence", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setPresence(data.presence || []);
        setOnlineCount(data.online_count || 0);
        setOfflineCount(data.offline_count || (data.presence || []).filter((p: any) => !p.is_online).length);
        setTotalTracked(data.total_users || (data.presence || []).length);
      }
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    if (tab === "users") loadUsers(showPasswords);
    if (tab === "pricing") loadPricing();
    if (tab === "notices") loadNotices();
    if (tab === "logs") loadLogs();
    if (tab === "emissions") loadEmissions();
    if (tab === "monitoring") loadPresence();
    if (tab === "referral") loadReferral();
    if (tab === "settings") {
      loadSettings();
      loadCleanupPreview();
    }
    loadFinancial();
  }, [tab, logCategory, logDateFrom, logDateTo, emissionsTypeFilter, referralTab, showPasswords, loadCleanupPreview, loadSettings, loadFinancial]);

  // Load presence count on mount and periodically
  useEffect(() => {
    loadPresence();
    loadFinancial();
    const interval = setInterval(() => {
      loadPresence();
      loadFinancial();
    }, 30000); // 30s
    return () => clearInterval(interval);
  }, [loadPresence, loadFinancial]);

  useEffect(() => {
    if (tab !== "users") return;
    const interval = setInterval(() => loadUsers(showPasswords, true), 10000);
    return () => clearInterval(interval);
  }, [tab, loadUsers, showPasswords]);

  // ── Users ──────────────────────────────────────────────────────────────────
  const adjustBalance = async (userId: string, amount: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: amount }),
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Saldo ${amount > 0 ? "adicionado" : "removido"} com sucesso`);
        loadUsers(showPasswords);
        refresh();
      } else {
        toast.error(data.error || "Erro ao ajustar saldo");
      }
    } catch (err: any) {
      toast.error("Erro ao conectar ao servidor");
    }
  };

  const submitBalanceAdjustment = async () => {
    if (!balanceModalUser) return;
    const parsedValue = parseFloat(balanceModalValue || "0");
    if (!(parsedValue > 0)) {
      toast.error("Informe um valor válido");
      return;
    }

    setSavingBalance(true);
    try {
      const delta = Math.round(parsedValue * 100) * (balanceModalType === "debit" ? -1 : 1);
      await adjustBalance(balanceModalUser.id, delta);
      setBalanceModalUser(null);
      setBalanceModalValue("");
      setBalanceModalType("credit");
    } finally {
      setSavingBalance(false);
    }
  };

  const toggleUserRole = async (u: UserRow) => {
    const nextRole = u.role === "admin" ? "user" : "admin";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: u.id, role: nextRole }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Perfil alterado para ${nextRole === "admin" ? "Administrador" : "Usuário"}`);
        loadUsers(showPasswords);
      } else {
        toast.error(data.error || "Erro ao alterar perfil");
      }
    } catch {
      toast.error("Erro de conexão");
    }
  };

  const linkManualReferral = async () => {
    if (!linkReferrerId || !linkReferredId) {
      toast.error("Selecione o indicador e o indicado");
      return;
    }
    setLinking(true);
    try {
      const res = await fetch("/api/admin/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "link_manual", 
          referrer_id: linkReferrerId, 
          referred_id: linkReferredId 
        }),
        credentials: "include"
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Vínculo de indicação criado com sucesso");
        setShowLinkModal(false);
        setLinkReferrerId("");
        setLinkReferredId("");
        if (tab === "referral") loadReferral();
      } else {
        toast.error(data.error || "Erro ao criar vínculo");
      }
    } catch (err: any) {
      toast.error("Erro ao conectar ao servidor");
    } finally {
      setLinking(false);
    }
  };

  const toggleUserActive = async (userId: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(current ? "Usuário desativado" : "Usuário ativado");
        loadUsers();
      }
    } catch { toast.error("Erro de conexão"); }
  };

  const deleteUser = async (user: UserRow) => {
    setHardDeleteUser(user);
    setHardDeleteConfirmChecked(false);
    setHardDeleteConfirmText("");
  };

  const openUserDetail = async (u: UserRow) => {
    setSelectedUser(u);
    setUserDetailOpen(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/history`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setUserHistory(data.history || []);
        setUserDetails(data.details || null);
      }
    } catch {
      setUserHistory([]);
      setUserDetails(null);
    }
  };

  // ── Create User ───────────────────────────────────────────────────────────────────────
  const createUser = async () => {
    if (!newUsername || !newPassword) { toast.error("Username e senha são obrigatórios"); return; }
    if (newPassword.length < 4) { toast.error("Senha deve ter no mínimo 4 caracteres"); return; }
    setCreatingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          display_name: newDisplayName || newUsername,
          email: newEmail,
          role: newRole,
          balance: newBalance ? Math.round(parseFloat(newBalance) * 100) : 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Usuário criado com sucesso!");
        setShowCreateUser(false);
        setNewUsername(""); setNewPassword(""); setNewDisplayName(""); setNewEmail(""); setNewRole("user"); setNewBalance("");
        loadUsers();
      } else {
        toast.error(data.error || "Erro ao criar usuário");
      }
    } catch { toast.error("Erro de conexão"); } finally { setCreatingUser(false); }
  };

  const changePassword = async () => {
    if (!changePwUserId || !changePwValue) { toast.error("Nova senha é obrigatória"); return; }
    if (changePwValue.length < 4) { toast.error("Senha deve ter no mínimo 4 caracteres"); return; }
    setChangingPw(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_id: changePwUserId, new_password: changePwValue }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Senha de ${changePwUsername} alterada com sucesso!`);
        setChangePwUserId(null); setChangePwUsername(""); setChangePwValue("");
        loadUsers(showPasswords, true);
      } else {
        toast.error(data.error || "Erro ao alterar senha");
      }
    } catch { toast.error("Erro de conexão"); } finally { setChangingPw(false); }
  };

  // ── Pricing & Auto-Save Engine ────────────────────────────────────────────────────────────
  const priceDebounceRef = useRef<Record<string, any>>({});

  const savePriceAuto = async (docType: string, valStr: string) => {
    const priceReais = parseFloat(valStr || "0");
    if (isNaN(priceReais) || priceReais < 0) return;
    const price = Math.round(priceReais * 100);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          document_type: docType,
          display_name: editingDisplayName[docType] ?? pricing.find(p => p.document_type === docType)?.display_name,
          price,
          is_active: editingIsActive[docType] !== false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Preço de ${DOC_TYPE_LABELS[docType] || docType} salvo em tempo real!`, { duration: 1500 });
        loadPricing();
      }
    } catch {}
  };

  const savePrice = async (docType: string) => {
    const priceReais = parseFloat(editingPrice[docType] || "0");
    if (isNaN(priceReais) || priceReais < 0) { toast.error("Preço inválido"); return; }
    await savePriceAuto(docType, editingPrice[docType]);
  };

  const toggleUserPermission = async (user: UserRow, docKey: string) => {
    const currentFree = Array.isArray(user.free_documents) ? [...user.free_documents] : [];
    const currentPerms = typeof user.permissions === 'object' && user.permissions !== null
      ? { ...user.permissions }
      : { editaveis: [], ferramentas: [] };
    
    let currentEditaveis = Array.isArray(currentPerms.editaveis) ? [...currentPerms.editaveis] : [];
    let currentFerramentas = Array.isArray(currentPerms.ferramentas) ? [...currentPerms.ferramentas] : [];

    const isCurrentlyFree = currentFree.includes(docKey);
    const isCurrentlyEdit = currentEditaveis.includes(docKey);
    const isCurrentlyTool = currentFerramentas.includes(docKey);

    const hasAccess = isCurrentlyFree || isCurrentlyEdit || isCurrentlyTool;

    let nextFree = currentFree;
    let nextEditaveis = currentEditaveis;
    let nextFerramentas = currentFerramentas;

    if (hasAccess) {
      nextFree = nextFree.filter(k => k !== docKey);
      nextEditaveis = nextEditaveis.filter(k => k !== docKey);
      nextFerramentas = nextFerramentas.filter(k => k !== docKey);
    } else {
      if (docKey === "consultas") {
        if (!nextFerramentas.includes("consultas")) nextFerramentas.push("consultas");
        if (!nextFree.includes("consultas")) nextFree.push("consultas");
      } else if (["bot-adv", "peticao-stj"].includes(docKey)) {
        if (!nextFerramentas.includes(docKey)) nextFerramentas.push(docKey);
      } else {
        if (!nextEditaveis.includes(docKey)) nextEditaveis.push(docKey);
      }
    }

    const updatedPermissions = { editaveis: nextEditaveis, ferramentas: nextFerramentas };

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          user_id: user.id,
          permissions: updatedPermissions,
          free_documents: nextFree,
        }),
      });
      if (res.ok) {
        triggerPermissionsUpdate();
        toast.success(hasAccess ? `Acesso a ${DOC_TYPE_LABELS[docKey] || docKey} revogado em tempo real!` : `Acesso a ${DOC_TYPE_LABELS[docKey] || docKey} liberado em tempo real!`, { duration: 2000 });
        loadUsers(showPasswords, true);
      }
    } catch {
      toast.error("Erro ao salvar permissão.");
    }
  };

  const initDefaultPricing = async () => {
    const defaults = [
      { document_type: "atestado", display_name: "Atestado Médico", price: 500 },
      { document_type: "cnh", display_name: "CNH Digital", price: 800 },
      { document_type: "cha", display_name: "CHA Náutica", price: 600 },
      { document_type: "toxicologico", display_name: "Toxicológico", price: 700 },
      { document_type: "historico-sp", display_name: "Histórico SP", price: 600 },
      { document_type: "historico-uninter", display_name: "Histórico UNINTER", price: 600 },
    ];
    try {
      for (const item of defaults) {
        await fetch("/api/admin/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(item),
        });
      }
      toast.success("Preços padrão configurados!");
      loadPricing();
    } catch { toast.error("Erro ao configurar preços"); }
  };

  // ── Notices ────────────────────────────────────────────────────────────────
  const createNotice = async () => {
    if (!newNotice.title || !newNotice.message) {
      toast.error("Preencha título e mensagem");
      return;
    }
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newNotice),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Aviso criado!");
        setNewNotice({ title: "", message: "", type: "info", is_active: 1 });
        loadNotices();
      }
    } catch { toast.error("Erro de conexão"); }
  };

  const toggleNotice = async (id: number, current: number) => {
    try {
      const res = await fetch(`/api/admin/notifications/${id}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(current ? "Aviso desativado" : "Aviso ativado");
        loadNotices();
      }
    } catch { toast.error("Erro de conexão"); }
  };

  const deleteNotice = async (id: number) => {
    setConfirmModal({
      open: true,
      title: "Excluir Aviso",
      message: "Tem certeza que deseja excluir este aviso?",
      type: "warning",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/notifications/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          const data = await res.json();
          if (data.success) {
            toast.success("Aviso excluído!");
            loadNotices();
          }
        } catch { toast.error("Erro de conexão"); }
        setConfirmModal(m => ({ ...m, open: false }));
      },
    });
  };

  // ── Emissions Actions ─────────────────────────────────────────────────────
  const deleteEmission = async (id: string, source: string, hard = false) => {
    setConfirmModal({
      open: true,
      title: hard ? "Excluir Permanentemente" : "Cancelar Documento",
      message: hard
        ? "Esta ação é IRREVERSÍVEL. O documento será excluído permanentemente do banco de dados."
        : "O documento será marcado como cancelado. Deseja continuar?",
      type: hard ? "danger" : "warning",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/emissions/${id}?source=${source}&hard=${hard}`, {
            method: "DELETE",
            credentials: "include",
          });
          const data = await res.json();
          if (data.success) {
            toast.success(hard ? "Documento excluído permanentemente!" : "Documento cancelado!");
            loadEmissions();
          } else {
            toast.error(data.error || "Erro ao excluir");
          }
        } catch { toast.error("Erro de conexão"); }
        setConfirmModal(m => ({ ...m, open: false }));
      },
    });
  };

  const openEmissionPreview = async (emission: EmissionRow) => {
    setEmissionPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/emissions/${emission.id}?source=${emission.table_source || "documents"}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setEmissionPreview({ ...data, emission });
      } else {
        toast.error(data.error || "Erro ao carregar documento");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setEmissionPreviewLoading(false);
    }
  };

  const editEmission = (e: EmissionRow) => {
    const docType = e.type || "atestado";
    const editRoutes: Record<string, string> = {
      atestado: `/atestado/editar/${e.id}?admin=1`,
      receita: `/receita/editar/${e.id}?admin=1`,
      cnh: `/cnh/editar/${e.id}?admin=1`,
      cha: `/cha/editar/${e.id}?admin=1`,
      crlv: `/crlv/editar/${e.id}?admin=1`,
      crlvcria: `/crlv/editar/${e.id}?admin=1`,
      toxicologico: `/toxicria/editar/${e.id}?admin=1`,
      toxicria: `/toxicria/editar/${e.id}?admin=1`,
      laudocria: `/toxicria/editar/${e.id}?admin=1`,
      "historico-sp": `/historico-sp`,
      "historico-uninter": `/historicocria/editar/${e.id}?admin=1`,
      historicocria: `/historicocria/editar/${e.id}?admin=1`,
      "peticao-stj": `/peticaocria/editar/${e.id}?admin=1`,
      peticaocria: `/peticaocria/editar/${e.id}?admin=1`,
      fgv: `/certificado-fgv/editar/${e.id}?admin=1`,
    };
    const route = editRoutes[docType] || `/atestado/editar/${e.id}?admin=1`;
    setLocation(route);
  };

  const runCleanupNow = async () => {
    setCleanupRunning(true);
    try {
      const res = await fetch("/api/admin/cleanup", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Limpeza concluída");
        loadCleanupPreview();
        loadEmissions();
      } else {
        toast.error(data.error || "Erro ao executar limpeza");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setCleanupRunning(false);
    }
  };

  const saveSettingsPayload = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Configurações salvas com sucesso!");
        loadSettings();
        loadCleanupPreview();
      } else {
        toast.error(data.error || "Erro ao salvar configurações");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSettingsSaving(false);
    }
  };

  // ── Database ───────────────────────────────────────────────────────────────
  const deleteUserData = async () => {
    if (!deleteTargetUserId) return;
    if (deleteUserConfirm !== deleteTargetUsername) {
      toast.error("Nome de usuário não confere. Digite exatamente o nome para confirmar.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${deleteTargetUserId}/delete-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Dados do usuário excluídos!");
        setDeleteTargetUserId(null);
        setDeleteTargetUsername("");
        setDeleteUserConfirm("");
        loadUsers();
      } else {
        toast.error(data.error || "Erro ao excluir dados");
      }
    } catch { toast.error("Erro de conexão"); }
  };

  const deleteAllData = async () => {
    if (deleteConfirm !== "EXCLUIR TUDO") {
      toast.error('Digite "EXCLUIR TUDO" para confirmar');
      return;
    }
    try {
      const res = await fetch("/api/admin/delete-all-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ confirm: true, confirmation_text: "EXCLUIR TUDO" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Todos os dados excluídos!");
        setDeleteConfirm("");
      } else {
        toast.error(data.error || "Erro ao excluir dados");
      }
    } catch { toast.error("Erro de conexão"); }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatDateTime = (d: string) => {
    if (!d) return "—";
    try {
      const date = new Date(d);
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-800 dark:text-gray-200">{date.toLocaleDateString("pt-BR")}</span>
          <span className="text-[10px] text-gray-400">{date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      );
    } catch { return d; }
  };

  const formatDateShort = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    try {
      const date = new Date(d);
      return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  const timeAgo = (d: string) => {
    if (!d) return "—";
    const now = Date.now();
    const then = new Date(d).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return `${diff}s atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    return `${Math.floor(diff / 86400)}d atrás`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "0s";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    if (minutes > 0) return `${minutes}min ${secs}s`;
    return `${secs}s`;
  };

  const buildAttestationPreviewData = (payload: any) => ({
    id: payload.id,
    paciente: payload.paciente || "",
    sexo: payload.sexo || "F",
    nascimento: payload.nascimento || "",
    cpf: payload.cpf || "",
    cns: payload.cns || "",
    tipoDoc: payload.tipo_doc || payload.tipoDoc || "CPF",
    nomeMae: payload.nome_mae || payload.nomeMae || "",
    endereco: payload.endereco || "",
    condicao: payload.texto_atestado || "",
    cid: payload.cid || "",
    cidDisplay: payload.cid_display || payload.cidDisplay || payload.cid || "",
    cidNome: payload.cid_nome || payload.cidNome || "",
    codigoQR: payload.codigo_qr || payload.codigoQR || "",
    dataAssinatura: payload.data_assinatura || payload.dataAssinatura || "",
    horaAssinatura: payload.hora_assinatura || payload.horaAssinatura || "",
    medico: payload.medico || "",
    crm: payload.crm || "",
    especialidade: payload.especialidade || "",
    dataEmissao: payload.data_emissao || payload.dataEmissao || "",
    logoUrl: payload.logo_url || payload.logoUrl || "",
    logoRight: payload.logo_right || payload.logoRight || "",
    enderecoEmitente: payload.endereco_emitente || payload.enderecoEmitente || "",
    instituicao: payload.instituicao || "",
    unidade: payload.unidade || "",
    cidade: payload.cidade || "",
    signatureColor: payload.signature_color || payload.signatureColor || "#0b109f",
    signatureImage: payload.signature_image || payload.signatureImage || "",
    textoAtestado: payload.texto_atestado || "",
    documentType: "atestado",
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      !userSearch ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredLogs = logs.filter(l =>
    !logFilter ||
    (l.username || "").toLowerCase().includes(logFilter.toLowerCase()) ||
    l.action.toLowerCase().includes(logFilter.toLowerCase()) ||
    (l.details || "").toLowerCase().includes(logFilter.toLowerCase())
  );

  const filteredEmissions = emissions.filter(e => {
    // Filtro de texto
    const textMatch = !emissionsFilter ||
      (e.nome || e.paciente || "").toLowerCase().includes(emissionsFilter.toLowerCase()) ||
      (e.username || "").toLowerCase().includes(emissionsFilter.toLowerCase()) ||
      (e.codigo_qr || "").toLowerCase().includes(emissionsFilter.toLowerCase());
    // Filtro de data
    let dateMatch = true;
    if (emissionsDateFrom || emissionsDateTo) {
      const eDate = e.created_at ? new Date(e.created_at).getTime() : 0;
      if (emissionsDateFrom) {
        const from = new Date(emissionsDateFrom).getTime();
        if (eDate < from) dateMatch = false;
      }
      if (emissionsDateTo) {
        const to = new Date(emissionsDateTo + "T23:59:59").getTime();
        if (eDate > to) dateMatch = false;
      }
    }
    return textMatch && dateMatch;
  });

   const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);
  const activeUsers = users.filter(u => u.is_active).length;

  // Verificar permissão admin (após todos os hooks)
  if (!isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header Admin - Estilo EliteDoc */}
        <div className="flex flex-wrap items-center gap-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-blue-950/80 border border-blue-500/30 shadow-lg flex items-center justify-center overflow-hidden shrink-0">
            <img src="/assets/logo-elite-dm.png" alt="DocMaster Elite" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight m-0">Painel Administrativo</h1>
            <p className="text-xs font-bold text-slate-400 mt-1">Gestão de Operações — <span className="text-blue-400 font-bold tracking-wider uppercase">DOCMASTER ELITE</span></p>
          </div>
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-3 shadow-sm min-w-[120px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Usuários</p>
              <p className="text-xl font-black text-blue-400 mt-0.5">{users.length}</p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-3 shadow-sm min-w-[140px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Saldo Usuários</p>
              <p className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
                R$ {(totalBalance / 100).toFixed(2).replace(".", ",")}
              </p>
            </div>
            {gatewayFinancial && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-3 shadow-sm min-w-[150px]">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" /> Gateway PIX
                </p>
                <p className="text-xl font-black text-purple-300 mt-0.5 font-mono">
                  R$ {Number(gatewayFinancial.saldo_disponivel || 0).toFixed(2).replace(".", ",")}
                </p>
              </div>
            )}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl px-5 py-3 shadow-sm min-w-[120px]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Online</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-xl font-black text-blue-400 font-mono">{onlineCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Bar Admin - Estilo EliteDoc */}
        <div className="flex items-center gap-2 p-2.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-x-auto no-scrollbar">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/30"
                    : "bg-slate-900/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{t.label}</span>
                {t.key === "monitoring" && onlineCount > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] font-black font-mono ${isActive ? "bg-white text-blue-600" : "bg-blue-600 text-white"}`}>
                    {onlineCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── USERS TAB ── */}
        {tab === "users" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
	            <div className="flex items-center gap-3 mb-6 flex-wrap">
	              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por username, email ou ID..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
	                  className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
	                />
	              </div>
	              <select
	                value={userRoleFilter}
	                onChange={e => setUserRoleFilter(e.target.value)}
	                className="px-4 py-3 text-sm rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all shadow-sm cursor-pointer"
	              >
	                <option value="all">Todos os perfis</option>
	                <option value="user">Apenas Usuários</option>
	                <option value="admin">Administradores</option>
	              </select>
              <button
                onClick={() => {
                const next = !showPasswords;
                setShowPasswords(next);
                loadUsers(next);
              }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm active:scale-95 ${
                  showPasswords
                    ? "bg-purple-600 text-white shadow-purple-900/20"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-800 hover:bg-gray-50"
                }`}
                title={showPasswords ? "Ocultar senhas" : "Ver senhas"}
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="hidden lg:inline">{showPasswords ? "Privacidade" : "Ver Senhas"}</span>
              </button>
              <button onClick={() => setShowCreateUser(!showCreateUser)} className="flex items-center gap-2 px-6 py-3 text-sm font-black uppercase tracking-widest rounded-2xl bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-900/20 active:scale-95">
                <UserPlus className="w-4 h-4" /> Novo Usuário
              </button>
            </div>

            {/* Formulário Criar Usuário */}
            {showCreateUser && (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 mb-8 shadow-xl animate-in zoom-in duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600" />
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
                  <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-red-600" />
                  </div>
                  Cadastrar Novo Operador
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Usuário *</label>
                    <input type="text" placeholder="ex: ricky_admin" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full px-4 py-3 text-sm rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha *</label>
                    <input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 text-sm rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                    <input type="text" placeholder="Nome Completo" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="w-full px-4 py-3 text-sm rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                    <input type="email" placeholder="contato@exemplo.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full px-4 py-3 text-sm rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Perfil de Acesso</label>
                    <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full px-4 py-3 text-sm rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all cursor-pointer">
                      <option value="user">Usuário Padrão</option>
                      <option value="admin">Administrador Geral</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Saldo Inicial (R$)</label>
                    <input type="number" placeholder="0,00" value={newBalance} onChange={e => setNewBalance(e.target.value)} className="w-full px-4 py-3 text-sm rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all" />
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button onClick={createUser} disabled={creatingUser} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 text-xs font-black uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white rounded-2xl transition-all shadow-lg shadow-red-900/20 active:scale-95 disabled:opacity-50">
                    {creatingUser ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {creatingUser ? "Processando..." : "Finalizar Cadastro"}
                  </button>
                  <button onClick={() => setShowCreateUser(false)} className="px-8 py-3.5 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Modal Alterar Senha */}
            {changePwUserId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setChangePwUserId(null); setChangePwValue(""); }}>
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2"><Lock className="w-4 h-4" /> Alterar Senha</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Usuário: <strong>{changePwUsername}</strong></p>
                  <input type="password" placeholder="Nova senha (mín. 4 caracteres)" value={changePwValue} onChange={e => setChangePwValue(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 mb-4" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setChangePwUserId(null); setChangePwValue(""); }} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancelar</button>
                    <button onClick={changePassword} disabled={changingPw} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition-colors disabled:opacity-50">{changingPw ? "Salvando..." : "Salvar"}</button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map(u => (
                  <div key={u.id} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-lg hover:border-red-100 dark:hover:border-red-900/30 transition-all duration-300 group animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex flex-wrap items-center justify-between gap-5">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                            {u.profile_photo ? (
                              <img src={u.profile_photo} alt={u.username} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl font-black text-red-600 dark:text-red-500">
                                {u.username.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          {presence.find(p => String(p.user_id) === String(u.id) && p.is_online) && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 animate-pulse shadow-sm" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-red-600 transition-colors">{u.username}</p>
                            <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest ${
                              u.role === "admin"
                                ? "bg-red-600 text-white shadow-md shadow-red-900/20"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                            }`}>
                              {u.role === "admin" ? "Master" : "Operador"}
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border ${
                              u.is_active
                                ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                                : "bg-red-50 border-red-100 text-red-600"
                            }`}>
                              {u.is_active ? "Ativo" : "Bloqueado"}
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border flex items-center gap-1 ${
                              u.role === "admin" || (Array.isArray(u.free_documents) && u.free_documents.includes("consultas"))
                                ? "bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/60 dark:border-violet-800 dark:text-violet-300"
                                : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300"
                            }`}>
                              <Search className="w-2.5 h-2.5" />
                              {u.role === "admin" || (Array.isArray(u.free_documents) && u.free_documents.includes("consultas"))
                                ? "Buscas: Grátis"
                                : "Buscas: Pagas"}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{u.email || "Sem email cadastrado"}</p>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">ID Operador</span>
                              <span className="text-[10px] font-mono text-gray-400">#{u.id.slice(0, 8)}</span>
                            </div>
                            <div className="w-px h-6 bg-gray-100 dark:bg-gray-800" />
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">Desde</span>
                              <span className="text-[10px] font-bold text-gray-500">{new Date(u.created_at).toLocaleDateString("pt-BR")}</span>
                            </div>
                          </div>
	                          {showPasswords && (
                            <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 animate-in slide-in-from-left-2">
                              <Lock className="w-3 h-3 text-purple-600" />
                              <span className="text-[11px] font-mono font-bold text-purple-700 dark:text-purple-300">
                                {(u as any).plain_password || "••••••••"}
                              </span>
                            </div>
	                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 ml-auto">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Saldo Disponível</p>
                          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-500 tabular-nums">
                            R$ {(u.balance / 100).toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleConsultasAccess(u)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 border shadow-sm ${
                              Array.isArray(u.free_documents) && u.free_documents.includes("consultas")
                                ? "bg-violet-600 text-white border-violet-500 hover:bg-violet-700"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-violet-50 hover:text-violet-600"
                            }`}
                            title="Alternar se este usuário tem buscas /consultas gratuitas ou pagas"
                          >
                            <Search className="w-3.5 h-3.5" />
                            {Array.isArray(u.free_documents) && u.free_documents.includes("consultas")
                              ? "Buscas: Grátis"
                              : "Buscas: Pagas"}
                          </button>
                          <button
                            onClick={() => {
                              setGrantPlanModalUser(u);
                              setGrantPlanMode(Array.isArray(u.free_documents) && u.free_documents.includes("consultas") ? "free" : u.consultas_plan ? "plan" : "plan");
                              setGrantPlanDuration("1_mes");
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300 hover:bg-violet-600 hover:text-white transition-all active:scale-95 border border-violet-200 dark:border-violet-800 shadow-sm"
                            title="Conceder tempo de uso ou plano manual em /consultas"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {u.consultas_plan ? `Ativo até ${new Date(u.consultas_plan.expires_at).toLocaleDateString('pt-BR')}` : "Tempo / Plano"}
                          </button>
                          <button
                            onClick={() => { setBalanceModalUser(u); setBalanceModalValue(""); setBalanceModalType("credit"); }}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all active:scale-95 border border-emerald-100 dark:border-emerald-900/30 shadow-sm"
                            title="Ajustar saldo"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            Saldo
                          </button>
                          
                          <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-100 dark:border-gray-800">
                            <button
                              onClick={() => openUserDetail(u)}
                              className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all active:scale-90"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenPermissions(u)}
                              className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all active:scale-90"
                              title="Permissões ACL"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setChangePwUserId(String(u.id)); setChangePwUsername(u.username); setChangePwValue(""); }}
                              className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all active:scale-90"
                              title="Resetar Senha"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleUserActive(u.id, !!u.is_active)}
                              className={`p-2 rounded-lg transition-all active:scale-90 ${u.is_active ? "text-emerald-500 hover:bg-emerald-50" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
                              title={u.is_active ? "Bloquear" : "Ativar"}
                            >
                              {u.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {cashbackEditId === u.id ? (
                              <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-red-200 p-1 rounded-xl shadow-lg animate-in zoom-in">
                                <input
                                  type="number" step="0.5" min="0" max="100"
                                  value={cashbackEditValue}
                                  onChange={e => setCashbackEditValue(e.target.value)}
                                  className="w-14 px-2 py-1 text-[10px] font-black rounded-lg bg-gray-50 border-none focus:ring-0"
                                  autoFocus
                                />
                                <button onClick={() => saveCashbackForUser(u.id)} className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"><Save size={12} /></button>
                                <button onClick={() => { setCashbackEditId(null); setCashbackEditValue(""); }} className="p-1.5 rounded-lg bg-gray-100 text-gray-500"><X size={12} /></button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setCashbackEditId(u.id); setCashbackEditValue(u.cashback_percentage != null ? String(u.cashback_percentage) : ""); }}
                                className="flex items-center gap-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-all active:scale-95 shadow-md shadow-slate-900/20"
                                title="Definir % Cashback"
                              >
                                <Percent className="w-3.5 h-3.5" />
                                {u.cashback_percentage != null ? `${u.cashback_percentage}%` : "CB%"}
                              </button>
                            )}
                            <button
                              onClick={() => deleteUser(u)}
                              className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all active:scale-90 border border-red-100"
                              title="Remover Operador"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FERRAMENTAS (MÓDULOS) & PERMISSÕES TAB ── */}
        {tab === "tools" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Master Buscas /consultas Spotlight Control Card */}
            <div className="rounded-3xl bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 border border-violet-500/40 p-7 text-white shadow-2xl space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-violet-500/30 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl shadow-inner">
                    🔍
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                      <span>Master Buscas / Snoop Intelligence</span>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-violet-500/30 border border-violet-300/40 text-violet-200">
                        /consultas
                      </span>
                    </h2>
                    <p className="text-xs text-violet-200 mt-1">
                      Gerencie a liberação de permissão para ferramentas e pesquisas cadastrais.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => toggleBulkConsultasAccess(true)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
                  >
                    <CheckCircle className="w-4 h-4" /> Liberar Gratuito p/ Todos
                  </button>
                  <button
                    onClick={() => toggleBulkConsultasAccess(false)}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
                  >
                    <Lock className="w-4 h-4" /> Definir Modo Pago p/ Todos
                  </button>
                </div>
              </div>

              {/* Status Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider block">TOTAL OPERADORES</span>
                  <span className="text-2xl font-black text-white">{users.length}</span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">🟢 ACESSO GRATUITO (LIBERADO)</span>
                  <span className="text-2xl font-black text-emerald-400">
                    {users.filter(u => u.role === "admin" || (Array.isArray(u.free_documents) && u.free_documents.includes("consultas"))).length}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 space-y-1">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">🔴 MODO PAGO (REQUER PLANO)</span>
                  <span className="text-2xl font-black text-amber-400">
                    {users.filter(u => u.role !== "admin" && (!Array.isArray(u.free_documents) || !u.free_documents.includes("consultas"))).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Matriz Completa de Ferramentas & Módulos por Usuário */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    Matriz de Liberação Gratuita de Módulos
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Visualize o número de operadores com liberação gratuita em cada ferramenta do ecossistema.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(DOC_TYPE_LABELS).map(([slug, label]) => {
                  const freeUsersCount = users.filter(u => u.role === "admin" || (Array.isArray(u.free_documents) && u.free_documents.includes(slug))).length;
                  return (
                    <div key={slug} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{slug}</span>
                        <h4 className="font-extrabold text-gray-900 dark:text-white text-xs mt-0.5">{label}</h4>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-500">Operadores grátis:</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                          {freeUsersCount} / {users.length}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── MONITORING TAB ── */}
        {tab === "monitoring" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Monitoramento de Usuários em Tempo Real
              </h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => clearLogs("monitoring")} 
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors text-xs font-semibold"
                  title="Limpar todos os dados de presença"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Monitoramento
                </button>
                <button onClick={loadPresence} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">Ativo</span>
                </div>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500">{onlineCount}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Online Agora</p>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                    <WifiOff className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <p className="text-3xl font-black text-gray-700 dark:text-gray-300">{offlineCount}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Offline</p>
              </div>
	              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
	                <div className="flex items-center justify-between mb-4">
	                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
	                    <FileText className="w-5 h-5 text-blue-500" />
	                  </div>
	                </div>
	                <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
	                  {presence.filter(p => p.is_online && /(criando|editando|emitindo)/i.test(p.current_action || "")).length}
	                </p>
	                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Emitindo Docs</p>
	              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
                <p className="text-3xl font-black text-purple-600 dark:text-purple-400">{totalTracked}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Total Tracked</p>
              </div>
            </div>

            {/* User List */}
            {presence.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                <Monitor className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado de presença disponível ainda.</p>
                <p className="text-xs text-gray-400 mt-1">Os dados aparecerão quando os usuários acessarem o painel.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {presence.map(p => (
                  <div key={p.user_id} className={`bg-white dark:bg-gray-900 rounded-[2rem] border p-6 transition-all duration-500 hover:shadow-xl group animate-in fade-in slide-in-from-right-4 ${
                    p.is_online
                      ? "border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50/30 to-transparent"
                      : "border-gray-100 dark:border-gray-800 opacity-60 grayscale"
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-white dark:border-gray-700 shadow-md group-hover:scale-110 transition-transform duration-500">
                            {p.profile_photo ? (
                              <img src={p.profile_photo} alt={p.username} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl font-black text-gray-400 dark:text-gray-500">
                                {(p.username || "?").charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white dark:border-gray-900 shadow-sm ${
                            p.is_online ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                              {p.username || `Operador #${p.user_id}`}
                            </p>
                            {p.role === "admin" && (
                              <span className="text-[9px] px-2 py-0.5 rounded-lg bg-red-600 text-white font-black uppercase tracking-widest shadow-sm">
                                Master
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{p.email || "Sem email"}</p>
                            <div className="w-1 h-1 rounded-full bg-gray-300" />
                            <p className="text-[10px] font-mono text-gray-400">ID: {p.user_id}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-[200px] flex flex-col items-center sm:items-start">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                            {PAGE_LABELS[p.current_page] || p.current_page || "Ocioso"}
                          </p>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                          <p className="text-[11px] font-bold text-gray-600 dark:text-gray-400 italic">
                            &ldquo;{p.current_action || "Apenas navegando"}&rdquo;
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Visto por último</p>
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-200 tabular-nums">{timeAgo(p.last_seen)}</p>
                        </div>
                        <div className="h-10 w-px bg-gray-100 dark:bg-gray-800" />
                        <div className="text-right">
                          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Sessão Atual</p>
                          <p className="text-sm font-black text-emerald-600 dark:text-emerald-500 tabular-nums">{formatDuration(p.total_session_seconds)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-50 dark:border-gray-800/50">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fluxo de Atividade</p>
                        </div>
                        <div className="space-y-2">
                          {(Array.isArray(p.timeline) ? p.timeline : []).slice(0, 4).map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between gap-4 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <div className="flex items-center gap-2.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                <div>
                                  <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200">
                                    {PAGE_LABELS[item.page_path] || item.page_path}
                                  </p>
                                  <p className="text-[9px] text-gray-400 uppercase font-medium">{item.action || "navegando"}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-mono text-gray-500">{formatDuration(item.duration_seconds)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Distribuição de Tempo</p>
                        </div>
                        <div className="space-y-2">
                          {(Array.isArray(p.page_totals) ? p.page_totals : []).slice(0, 4).map((item: any) => (
                            <div key={item.page} className="flex items-center justify-between gap-4 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">{PAGE_LABELS[item.page] || item.page}</span>
                              <div className="flex items-center gap-3 flex-1">
                                <div className="h-1 bg-gray-100 dark:bg-gray-800 flex-1 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-500 rounded-full" 
                                    style={{ width: `${Math.min(100, (item.duration_seconds / (p.total_session_seconds || 1)) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 w-10 text-right">
                                  {formatDuration(item.duration_seconds)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STUDIO ENGINE TAB ── */}
        {tab === "studio" && (
          <StudioEngine />
        )}

        {/* ── PRICING TAB ── */}
        {tab === "pricing" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-yellow-500" />
                  Tabela de Preços
                </h2>
                <p className="text-xs text-gray-500 font-medium">Gerencie os valores de emissão de cada módulo do sistema</p>
              </div>
              <div className="flex gap-2">
                <button 
                   onClick={loadPricing}
                   className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {pricing.length === 0 && (
                  <button
                    onClick={initDefaultPricing}
                    className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-yellow-200 dark:shadow-none uppercase italic"
                  >
                    <Plus className="w-4 h-4" />
                    Resetar Padrões
                  </button>
                )}
              </div>
            </div>

            {pricing.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/5 to-transparent pointer-events-none" />
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-800 animate-bounce" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nenhum preço configurado</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">A tabela de preços está vazia. Comece carregando os valores padrão.</p>
                <button
                  onClick={initDefaultPricing}
                  className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-2xl text-sm transition-all shadow-xl shadow-yellow-200 dark:shadow-none uppercase italic"
                >
                  Configurar Preços Padrão
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pricing.map(p => {
                    const Icon = p.document_type === "atestado" ? FileText : 
                                 p.document_type.includes("cnh") ? Car :
                                 p.document_type.includes("cha") ? Anchor :
                                 p.document_type.includes("toxic") ? FlaskConical :
                                 p.document_type.includes("historico") ? GraduationCap :
                                 p.document_type.includes("receita") ? Pill :
                                 p.document_type.includes("peticao") ? Search :
                                 p.document_type.includes("diploma") ? Shield : FileText;
                    
                    return (
                      <div key={p.document_type} className="group relative bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-2xl hover:border-yellow-400/50 transition-all duration-500 overflow-hidden">
                        {/* Glow effect on hover */}
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-yellow-400/5 blur-[40px] rounded-full group-hover:bg-yellow-400/10 transition-colors" />
                        
                        <div className="flex items-center justify-between mb-6 relative z-10">
                          <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-400 group-hover:text-yellow-500 group-hover:bg-yellow-500/10 group-hover:scale-110 transition-all duration-300">
                            <Icon size={28} />
                          </div>
                          <button
                            onClick={() => setEditingIsActive(prev => ({ ...prev, [p.document_type]: !(prev[p.document_type] !== false) }))}
                            className={`p-2 rounded-xl transition-all ${editingIsActive[p.document_type] !== false ? "bg-green-500/10 text-green-500" : "bg-gray-100 dark:bg-gray-800 text-gray-400"}`}
                            title={editingIsActive[p.document_type] !== false ? "Desativar Módulo" : "Ativar Módulo"}
                          >
                            {editingIsActive[p.document_type] !== false ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                          </button>
                        </div>

                        <div className="space-y-4 relative z-10">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nome de Exibição</label>
                            <input
                              type="text"
                              value={editingDisplayName[p.document_type] ?? p.display_name}
                              onChange={e => setEditingDisplayName(prev => ({ ...prev, [p.document_type]: e.target.value }))}
                              className="w-full bg-gray-50 dark:bg-gray-800/30 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white border border-transparent focus:border-yellow-400/50 focus:ring-0 transition-all"
                            />
                          </div>

                          <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Custo de Emissão</label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-yellow-500">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editingPrice[p.document_type] || ""}
                                  onChange={e => setEditingPrice(prev => ({ ...prev, [p.document_type]: e.target.value }))}
                                  className="w-full bg-gray-50 dark:bg-gray-800/30 rounded-2xl pl-10 pr-4 py-3 text-2xl font-black text-gray-900 dark:text-white border border-transparent focus:border-yellow-400/50 focus:ring-0 transition-all"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => savePrice(p.document_type)}
                              className="h-14 w-14 flex items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-lg shadow-yellow-400/20 hover:scale-105 active:scale-95 transition-all"
                              title="Salvar individual"
                            >
                              <Save size={20} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                           <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">{p.document_type}</span>
                           <div className="flex items-center gap-1.5">
                             <div className={`w-1.5 h-1.5 rounded-full ${editingIsActive[p.document_type] !== false ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                             <span className={`text-[10px] font-black uppercase tracking-tighter ${editingIsActive[p.document_type] !== false ? "text-green-500" : "text-gray-400"}`}>
                               {editingIsActive[p.document_type] !== false ? "Módulo Operacional" : "Módulo Suspenso"}
                             </span>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-8 flex justify-center sm:justify-end">
                  <button
                    onClick={saveAllPrices}
                    disabled={pricingSaving}
                    className="group relative flex items-center gap-3 px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 uppercase italic text-sm tracking-tight overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-yellow-400/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {pricingSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {pricingSaving ? "Sincronizando..." : "Atualizar Sistema de Preços"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TEMPLATES TAB (Redirect) ── */}
        {tab === "templates" && (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <Layout className="w-16 h-16 mx-auto mb-4 text-indigo-500 animate-pulse" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Motor Universal de Documentos</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Gerencie templates dinâmicos, campos de formulário e layouts complexos em uma interface dedicada.
            </p>
            <button
              onClick={() => setLocation("/admin/templates")}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
            >
              Abrir Gerenciador de Templates
            </button>
          </div>
        )}

        {/* ── NOTICES TAB ── */}
        {tab === "notices" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">Criar Novo Aviso</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
                  <div className="flex gap-2 flex-wrap">
                    {NOTICE_TYPES.map(nt => (
                      <button
                        key={nt.value}
                        onClick={() => setNewNotice(n => ({ ...n, type: nt.value as any }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          newNotice.type === nt.value
                            ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400"
                            : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        <nt.icon className="w-3.5 h-3.5" />
                        {nt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Título</label>
                  <input
                    type="text"
                    value={newNotice.title}
                    onChange={e => setNewNotice(n => ({ ...n, title: e.target.value }))}
                    placeholder="Título do aviso"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Mensagem</label>
                  <textarea
                    value={newNotice.message}
                    onChange={e => setNewNotice(n => ({ ...n, message: e.target.value }))}
                    placeholder="Mensagem do aviso"
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                  />
                </div>
                <button
                  onClick={createNotice}
                  className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  Publicar Aviso
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Avisos Publicados</h3>
              {notices.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Nenhum aviso publicado</div>
              ) : (
                <div className="space-y-2">
                  {notices.map(n => (
                    <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl border ${
                      n.type === "warning" ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" :
                      n.type === "error" ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800" :
                      n.type === "success" ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800" :
                      "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                    } ${!n.is_active ? "opacity-50" : ""}`}>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{n.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{formatDate(n.created_at || "")}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          n.is_active
                            ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                        }`}>
                          {n.is_active ? "Ativo" : "Inativo"}
                        </span>
                        <button
                          onClick={() => n.id && toggleNotice(n.id, n.is_active)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        >
                          {n.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => n.id && deleteNotice(n.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LOGS TAB ── */}
        {tab === "logs" && (
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filtrar logs..."
                  value={logFilter}
                  onChange={e => setLogFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                {LOG_CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setLogCategory(c.value)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                      logCategory === c.value
                        ? "bg-yellow-500 text-white"
                        : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700"
                    }`}
                  >
                    <c.icon className="w-3 h-3" />
                    {c.label}
                    {logCategories[c.value] !== undefined && (
                      <span className="ml-0.5 opacity-70">({logCategories[c.value]})</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => clearLogs("payment")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300 hover:bg-purple-900 transition-all text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-950/40" title="Limpar logs de transações e pagamentos financeiras">
                  <Trash className="w-3.5 h-3.5 text-purple-400" />
                  Limpar Logs de Payment
                </button>
                <button onClick={() => clearLogs("all")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 hover:bg-red-900 transition-all text-xs font-black uppercase tracking-wider shadow-lg shadow-red-950/40" title="Limpar todos os logs de auditoria">
                  <Trash className="w-3.5 h-3.5 text-red-400" />
                  Limpar Todos
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Período:</span>
              <input
                type="date"
                value={logDateFrom}
                onChange={e => setLogDateFrom(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <span className="text-xs text-gray-400">até</span>
              <input
                type="date"
                value={logDateTo}
                onChange={e => setLogDateTo(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              {(logDateFrom || logDateTo) && (
                <button onClick={() => { setLogDateFrom(""); setLogDateTo(""); }} className="text-xs text-red-500 hover:text-red-700 font-semibold">
                  Limpar filtro
                </button>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum registro encontrado para estes filtros.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 backdrop-blur-sm">
                        <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                        <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Operador</th>
                        <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                        <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ação Realizada</th>
                        <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Payload / Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                      {filteredLogs.map(l => {
                        const severity = l.severity || "info";
                        const category = l.category || "admin";
                        return (
                          <tr key={l.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/20 transition-colors group">
                            <td className="px-5 py-4 whitespace-nowrap">
                              {formatDateTime(l.created_at)}
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-red-600 transition-colors">{l.username || "Sistema"}</p>
                              <p className="text-[10px] font-mono text-gray-400">ID: {l.user_id || "SYS"}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                                category === "payment"
                                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                                  : category === "error"
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                  : category === "admin"
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                              }`}>
                                {category}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                severity === "error"
                                  ? "bg-red-50 border-red-100 text-red-700"
                                  : l.action.includes("delete") || l.action.includes("exclu")
                                  ? "bg-red-50 border-red-100 text-red-700"
                                  : l.action.includes("emit") || l.action.includes("create") || l.action.includes("credito")
                                  ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                  : "bg-gray-50 border-gray-100 text-gray-600 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-400"
                              }`}>
                                {l.action}
                              </span>
                            </td>
                            <td className="px-5 py-4 hidden md:table-cell max-w-sm">
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate font-mono bg-gray-50 dark:bg-gray-800/30 px-2 py-1 rounded border border-gray-100 dark:border-gray-800">
                                {(() => {
                                  try {
                                    const parsed = JSON.parse(l.details || "{}");
                                    if (parsed.amount) return `R$ ${(parsed.amount / 100).toFixed(2)} - ${parsed.description || ""}`;
                                    if (parsed.price) return `Preço: R$ ${(parsed.price / 100).toFixed(2)}`;
                                    return l.details || "—";
                                  } catch { return l.details || "—"; }
                                })()}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── EMISSIONS TAB ── */}
        {tab === "emissions" && (
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filtrar por paciente, usuário ou código..."
                  value={emissionsFilter}
                  onChange={e => setEmissionsFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <select
                value={emissionsTypeFilter}
                onChange={e => setEmissionsTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="all">Todos os Tipos</option>
                <option value="atestado">Atestado Médico</option>
                <option value="receita">Receituário Médico</option>
                <option value="cnh">CNH Digital</option>
                <option value="crlv">CRLV Digital</option>
                <option value="cha">CHA Náutica</option>
                <option value="toxicologico">Exame Toxicológico</option>
                <option value="toxicria">Toxicológico Sodré</option>
                <option value="historico-sp">Histórico SP</option>
                <option value="historico-uninter">Histórico UNINTER</option>
                <option value="peticao-stj">Petição STJ</option>
                <option value="fgv">Certificado FGV</option>
                <option value="diploma-uninter">Diploma UNINTER</option>
              </select>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <input
                  type="date"
                  value={emissionsDateFrom}
                  onChange={e => setEmissionsDateFrom(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  title="Data inicial"
                />
                <span className="text-xs text-gray-400">ate</span>
                <input
                  type="date"
                  value={emissionsDateTo}
                  onChange={e => setEmissionsDateTo(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  title="Data final"
                />
                {(emissionsDateFrom || emissionsDateTo) && (
                  <button onClick={() => { setEmissionsDateFrom(""); setEmissionsDateTo(""); }} className="p-1 rounded-lg bg-red-100 dark:bg-red-900/20 text-red-500 hover:bg-red-200 transition-colors" title="Limpar filtro de data">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button onClick={loadEmissions} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">{filteredEmissions.length} emissões</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredEmissions.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma emissão encontrada</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
	                <table className="w-full text-xs">
	                  <thead>
	                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
	                      <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID Interno</th>
	                      <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data Emissão</th>
	                      <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Criação (Painel)</th>
	                      <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuário</th>
	                      <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome/Paciente</th>
	                      <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Tipo</th>
	                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Código Emissão</th>
	                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
	                <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
	                </tr>
	                </thead>
	                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
	                    {filteredEmissions.map(e => {
	                        const createDate = new Date(e.created_at);
	                        const docDateValue = e.emission_date || e.data_emissao || e.dataEmissao || e.data || "";


	                return (
	                <tr key={`${e.table_source}-${e.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
	                <td className="px-4 py-2.5 font-mono text-gray-400 text-[10px]">{e.id.slice(0, 8)}...</td>
	                <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 font-semibold">{docDateValue || "—"}</td>
	                <td className="px-4 py-2.5 whitespace-nowrap">
	                <div className="flex flex-col">
	                <span className="font-semibold text-gray-800 dark:text-gray-200">{createDate.toLocaleDateString("pt-BR")}</span>
	                <span className="text-[10px] text-gray-400">{createDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
	                </div>
	                </td>
	                <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{e.username || e.user_id || "—"}</td>
	                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 uppercase">{e.nome || e.paciente || "—"}</td>
	                <td className="px-4 py-2.5 hidden md:table-cell">
	                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
	                {DOC_TYPE_LABELS[e.type] || e.type}
	                </span>
	                </td>
	                <td className="px-4 py-2.5 hidden md:table-cell">
	                {e.codigo_qr ? (
	                <span 
                    onClick={() => {
                      navigator.clipboard.writeText(e.codigo_qr!);
                      toast.success("Código copiado!");
                    }}
                    className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-md font-bold border border-blue-100 dark:border-blue-800 font-mono text-[11px] cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-95 block w-fit"
                    title="Clique para copiar"
                  >
	                {e.codigo_qr}
	                </span>
	                ) : (
	                <span className="text-gray-400 italic">sem código</span>
	                )}
	                </td>
	                <td className="px-4 py-2.5">
	                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
	                e.status === "emitido"
	                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
	                : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
	                }`}>
	                {e.status}
	                </span>
	                </td>
	                <td className="px-4 py-2.5">
	                <div className="flex items-center gap-1">
	                <button
	                onClick={() => openEmissionPreview(e)}
	                className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
	                title="Visualizar"
	                >
	                <Eye className="w-3.5 h-3.5" />
	                </button>
	                <button
	                onClick={() => editEmission(e)}
	                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
	                title="Editar"
	                >
	                <Pencil className="w-3.5 h-3.5" />
	                </button>
	                <button
	                onClick={() => deleteEmission(e.id, e.table_source || "documents", false)}
	                className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
	                title="Cancelar"
	                >
	                <X className="w-3.5 h-3.5" />
	                </button>
	                <button
	                onClick={() => deleteEmission(e.id, e.table_source || "documents", true)}
	                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
	                title="Excluir permanentemente"
	                >
	                <Trash2 className="w-3.5 h-3.5" />
	                </button>
	                </div>
	                </td>
	                </tr>
	                );
	                })}
	                  </tbody>
	                </table>              </div>
            )}
          </div>
        )}

        {/* ── REFERRAL TAB ── */}
        {tab === "referral" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sub-tabs Elite Style */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
                {(["overview", "referrals", "earnings", "cashback", "users"] as const).map(rt => (
                  <button
                    key={rt}
                    onClick={() => setReferralTab(rt)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      referralTab === rt
                        ? "bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    {rt === "overview" ? "Resumo" : rt === "referrals" ? "Rede" : rt === "earnings" ? "Comissões" : rt === "cashback" ? "Reembolsos" : "Gestão"}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowLinkModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-red-900/20 active:scale-95 italic"
              >
                <UserPlus className="w-4 h-4" />
                Vincular Manualmente
              </button>
            </div>

            {referralTab === "overview" && (
              <div className="space-y-6">
                {/* Stats cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Indicações", value: referralData.totalReferrals || 0, icon: Gift, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20" },
                    { label: "Indicadores Ativos", value: (referralData.earningsByReferrer || []).length || referralData.activeReferrers || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
                    { label: "Comissões Pagas", value: `R$ ${((referralData.totalReferralEarnings || 0) / 100).toFixed(2).replace(".", ",")}`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
                    { label: "Códigos Ativos", value: referralData.activeCodes || 0, icon: Percent, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" }
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-all group">
                       <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} mb-4 group-hover:scale-110 transition-transform`}>
                         <stat.icon size={24} />
                       </div>
                       <p className={`text-2xl font-black ${stat.color} tracking-tight`}>{stat.value}</p>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Global Configuration Card */}
                <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-8 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 blur-[60px] rounded-full" />
                  <h3 className="text-sm font-black text-gray-900 dark:text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                    <Settings className="w-4 h-4 text-red-600" />
                    Regras de Comissionamento
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">Bônus de Indicação (Referral)</label>
                        <button
                          onClick={() => setReferralSettings(s => ({ ...s, referral_enabled: !s.referral_enabled }))}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase transition-all ${referralSettings.referral_enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-100 text-gray-400"}`}
                        >
                           {referralSettings.referral_enabled ? "Ativado" : "Suspenso"}
                        </button>
                      </div>
                      <div className="relative group">
                        <input
                          type="number" step="0.5" min="0" max="100"
                          value={referralSettings.referral_percentage}
                          onChange={e => setReferralSettings(s => ({ ...s, referral_percentage: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-2xl px-6 py-4 text-3xl font-black text-gray-900 dark:text-white border border-transparent focus:border-red-500/50 focus:ring-0 transition-all"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-red-600">%</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium italic ml-1">Porcentagem que o indicador recebe sobre cada recarga aprovada de seus indicados.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">Bônus de Cashback (Depósito)</label>
                        <button
                          onClick={() => setReferralSettings(s => ({ ...s, cashback_enabled: !s.cashback_enabled }))}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase transition-all ${referralSettings.cashback_enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-100 text-gray-400"}`}
                        >
                           {referralSettings.cashback_enabled ? "Ativado" : "Suspenso"}
                        </button>
                      </div>
                      <div className="relative group">
                        <input
                          type="number" step="0.5" min="0" max="100"
                          value={referralSettings.cashback_percentage}
                          onChange={e => setReferralSettings(s => ({ ...s, cashback_percentage: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-2xl px-6 py-4 text-3xl font-black text-gray-900 dark:text-white border border-transparent focus:border-emerald-500/50 focus:ring-0 transition-all"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-emerald-600">%</span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium italic ml-1">Bônus creditado automaticamente ao próprio usuário ao realizar um depósito PIX.</p>
                    </div>
                  </div>
	                  <div className="mt-10 pt-6 border-t border-gray-50 dark:border-gray-800 flex justify-end">
	                    <button onClick={saveReferralSettings} className="flex items-center gap-2 px-12 py-4 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-red-900/20 active:scale-95 italic">
	                      <Save className="w-4 h-4" /> Salvar Regras de Negócio
	                    </button>
	                  </div>
	                </div>

                  {/* Leaderboard/Detailed Table */}
	                <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
	                  <div className="px-8 py-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
	                    <h3 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest italic">Performance de Indicadores</h3>
                      <TrendingUp className="w-4 h-4 text-red-500" />
	                  </div>
	                  <table className="w-full text-left">
	                    <thead>
	                      <tr className="border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
	                        <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Indicador Master</th>
	                        <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Base de Indicados</th>
	                        <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Acumulado</th>
	                        <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Última Atividade</th>
	                      </tr>
	                    </thead>
	                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
	                      {(referralData.earningsByReferrer || []).map((item: any) => (
	                        <tr key={item.referrer_id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/20 transition-all group">
	                          <td className="px-8 py-4">
                               <p className="text-sm font-black text-gray-900 dark:text-white group-hover:text-red-600 transition-colors uppercase italic">{item.referrer_username}</p>
                               <p className="text-[10px] font-mono text-gray-400">ID: {item.referrer_id.slice(0, 8)}</p>
                            </td>
	                          <td className="px-8 py-4 text-center">
                               <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black text-[10px]">
                                 {item.total_referred || 0} CONTAS
                               </span>
                            </td>
	                          <td className="px-8 py-4">
                               <div className="flex flex-col">
                                 <span className="text-sm font-black text-emerald-600 dark:text-emerald-500">R$ {((item.total_earned || 0) / 100).toFixed(2).replace(".", ",")}</span>
                                 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Lucro Direto</span>
                               </div>
                            </td>
	                          <td className="px-8 py-4">
                               <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{item.last_earning_at ? formatDate(item.last_earning_at) : "Sem histórico"}</span>
                            </td>
	                        </tr>
	                      ))}
	                    </tbody>
	                  </table>
                    {(referralData.earningsByReferrer || []).length === 0 && (
                      <div className="p-20 text-center text-gray-400">
                         <Info className="w-12 h-12 mx-auto mb-4 opacity-20" />
                         <p className="text-sm font-bold uppercase italic tracking-widest">Nenhuma atividade de rede detectada</p>
                      </div>
                    )}
	                </div>
	              </div>
	            )}

            {referralTab === "referrals" && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
	                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
	                      <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase">Data</th>
	                      <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase">Indicador</th>
	                      <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase">Indicado</th>
	                      <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase">Status</th>
	                      <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase">Comissão</th>
	                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {(referralData.referrals || []).map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-2.5 text-gray-500">{formatDate(r.created_at)}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{r.referrer_name} <span className="text-gray-400">({r.referrer_email})</span></td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{r.referred_name} <span className="text-gray-400">({r.referred_email})</span></td>
	                        <td className="px-4 py-2.5 text-gray-500">{r.status || "active"}</td>
	                        <td className="px-4 py-2.5 font-semibold text-green-600">
	                          R$ {((r.commission_earned || r.total_earned || 0) / 100).toFixed(2)}
	                          <span className="ml-1 text-gray-400 font-normal">{r.commission_percentage ? `(${r.commission_percentage}%)` : ""}</span>
	                        </td>
	                      </tr>
                    ))}
                  </tbody>
                </table>
                {(referralData.referrals || []).length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">Nenhuma indicação registrada</div>
                )}
              </div>
            )}

            {referralTab === "earnings" && (
              <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="px-8 py-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest italic">Histórico de Comissões</h3>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <DollarSign size={14} />
                  </div>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data / Horário</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Indicador</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Origem (Indicado)</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Base de Depósito</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">%</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ganho Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {(referralData.earnings || []).map((e: any) => (
                      <tr key={e.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/20 transition-all">
                        <td className="px-8 py-4 text-[11px] font-medium text-gray-400">{formatDate(e.created_at)}</td>
                        <td className="px-8 py-4 font-black text-gray-900 dark:text-white uppercase italic text-xs tracking-tight">{e.referrer_name}</td>
                        <td className="px-8 py-4 text-xs font-bold text-blue-600 dark:text-blue-400">{e.referred_name}</td>
                        <td className="px-8 py-4 text-xs font-black text-gray-500">R$ {((e.deposit_amount || 0) / 100).toFixed(2).replace(".", ",")}</td>
                        <td className="px-8 py-4 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] font-black">{e.percentage}%</span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-500 tracking-tighter">
                            + R$ {((e.earned_amount || 0) / 100).toFixed(2).replace(".", ",")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(referralData.earnings || []).length === 0 && (
                  <div className="p-20 text-center text-gray-400">
                    <Info className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold uppercase italic tracking-widest">Nenhuma comissão processada ainda</p>
                  </div>
                )}
              </div>
            )}

            {referralTab === "cashback" && (
              <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="px-8 py-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest italic">Histórico de Reembolsos (Cashback)</h3>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <TrendingUp size={14} />
                  </div>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data / Horário</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuário Beneficiado</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Depositado</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">% Aplicada</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Retorno (Bônus)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {(referralData.cashback || []).map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/20 transition-all">
                        <td className="px-8 py-4 text-[11px] font-medium text-gray-400">{formatDate(c.created_at)}</td>
                        <td className="px-8 py-4">
                           <p className="text-xs font-black text-gray-900 dark:text-white uppercase italic tracking-tight">{c.user_name}</p>
                           <p className="text-[10px] font-mono text-gray-400">{c.user_email}</p>
                        </td>
                        <td className="px-8 py-4 text-xs font-black text-gray-500 italic">R$ {((c.deposit_amount || 0) / 100).toFixed(2).replace(".", ",")}</td>
                        <td className="px-8 py-4 text-center">
                           <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 font-black text-[10px]">{c.percentage}%</span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-sm font-black text-emerald-600 dark:text-emerald-500">+ R$ {((c.cashback_amount || 0) / 100).toFixed(2).replace(".", ",")}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(referralData.cashback || []).length === 0 && (
                  <div className="p-20 text-center text-gray-400">
                    <Info className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold uppercase italic tracking-widest">Sem registros de cashback no sistema</p>
                  </div>
                )}
              </div>
            )}

            {referralTab === "users" && (
              <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
                 <div className="px-8 py-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest italic">Gestão de Taxas Customizadas</h3>
                  <Settings className="w-4 h-4 text-gray-400" />
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuário</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Código</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Rede</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-emerald-600">Lucro Ref</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-blue-600">Bônus CB</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Comissão custom</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {(referralData.users || []).map((u: any) => (
                      <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/20 transition-all">
                        <td className="px-8 py-4">
                          <p className="text-xs font-black text-gray-900 dark:text-white uppercase italic tracking-tight">{u.name || u.username || u.email}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{u.email}</p>
                        </td>
                        <td className="px-8 py-4">
                          <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">{u.code || "—"}</span>
                        </td>
                        <td className="px-8 py-4 text-center">
                           <span className="text-[11px] font-black text-gray-500">{u.total_referred || 0}</span>
                        </td>
                        <td className="px-8 py-4 font-black text-emerald-600 text-xs">R$ {((u.total_earned || 0) / 100).toFixed(2).replace(".", ",")}</td>
                        <td className="px-8 py-4 font-black text-blue-600 text-xs">R$ {((u.total_cashback || 0) / 100).toFixed(2).replace(".", ",")}</td>
                        <td className="px-8 py-4">
                          {editUserRefId === u.id ? (
                            <div className="flex items-center gap-1 animate-in zoom-in duration-200">
                              <input type="number" step="0.5" placeholder="Ref %" value={editUserRefPct} onChange={e => setEditUserRefPct(e.target.value)} className="w-14 px-2 py-1.5 text-[10px] font-black rounded-lg border border-red-200 bg-red-50 text-red-600" />
                              <input type="number" step="0.5" placeholder="CB %" value={editUserCbPct} onChange={e => setEditUserCbPct(e.target.value)} className="w-14 px-2 py-1.5 text-[10px] font-black rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600" />
                              <button onClick={() => saveUserRefSettings(u.id)} className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"><Save size={12} /></button>
                              <button onClick={() => setEditUserRefId(null)} className="p-2 rounded-lg bg-gray-400 text-white hover:bg-gray-500 shadow-md"><X size={12} /></button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded w-fit ${u.referral_percentage != null ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                                {u.referral_percentage != null ? `INDICAÇÃO: ${u.referral_percentage}%` : "REF: GLOBAL"}
                              </span>
                              {u.cashback_percentage != null && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded w-fit bg-emerald-50 text-emerald-600">
                                  CASHBACK: {u.cashback_percentage}%
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button
                            onClick={() => { setEditUserRefId(u.id); setEditUserRefPct(u.referral_percentage?.toString() || ""); setEditUserCbPct(u.cashback_percentage?.toString() || ""); }}
                            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-blue-500 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                            title="Editar Taxas"
                          >
                            <Pencil size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(referralData.users || []).length === 0 && (
                  <div className="p-20 text-center text-gray-400">
                    <Info className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold uppercase italic tracking-widest">Nenhum parceiro registrado</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── DATABASE TAB ── */}
	        {tab === "database" && (
	          <div className="space-y-6">
	            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-amber-200 dark:border-amber-800 p-5">
	              <div className="flex items-center gap-2 mb-4">
	                <AlertTriangle className="w-5 h-5 text-amber-500" />
	                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Exclusão em Cascata de Usuário</h3>
	              </div>
	              {deleteTargetUserId ? (
	                <div className="space-y-4">
	                  <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
	                    O usuário <strong>{deleteTargetUsername}</strong> foi selecionado. Esta ação remove documentos, transações, sessões, presença e vínculos de indicação.
	                  </div>
	                  <div>
	                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
	                      Digite o username para confirmar exclusão de dados do usuário
	                    </label>
	                    <input
	                      type="text"
	                      value={deleteUserConfirm}
	                      onChange={e => setDeleteUserConfirm(e.target.value)}
	                      placeholder={deleteTargetUsername}
	                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
	                    />
	                  </div>
	                  <div className="flex gap-3">
	                    <button
	                      onClick={deleteUserData}
	                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm transition-colors"
	                    >
	                      Excluir Dados do Usuário
	                    </button>
	                    <button
	                      onClick={() => {
	                        const target = users.find(user => String(user.id) === String(deleteTargetUserId));
	                        if (target) deleteUser(target);
	                      }}
	                      className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors"
	                    >
	                      Excluir Usuário Completo
	                    </button>
	                  </div>
	                </div>
	              ) : (
	                <p className="text-sm text-gray-500 dark:text-gray-400">
	                  Selecione um usuário na aba <strong>Usuários</strong> para abrir a exclusão em cascata nesta seção.
	                </p>
	              )}
	            </div>
	            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Excluir TODOS os Dados</h3>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800 mb-4">
                <p className="text-xs text-red-700 dark:text-red-400 font-semibold">
                  ATENÇÃO: Esta ação é IRREVERSÍVEL. Todos os documentos emitidos de todos os usuários serão permanentemente excluídos.
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Digite <strong className="text-red-600">EXCLUIR TUDO</strong> para confirmar
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder='Digite "EXCLUIR TUDO"'
                    className="w-full px-3 py-2 text-sm rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <button
                  onClick={deleteAllData}
                  disabled={deleteConfirm !== "EXCLUIR TUDO"}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  Excluir TODOS os Dados
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">Configurações Gerais</h3>
              <div className="space-y-4">
                {[
                  { key: "site_name", label: "Nome do Site", placeholder: "DocMaster" },
                  { key: "support_whatsapp", label: "WhatsApp de Suporte", placeholder: "5511999999999" },
                  { key: "max_documents_per_day", label: "Máx. Documentos por Dia", placeholder: "100" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                    <input
                      type="text"
                      value={settings[key as keyof typeof settings] as string}
                      onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Modo Manutenção</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Bloqueia acesso de usuários não-admin</p>
                  </div>
                  <button
                    onClick={() => setSettings(s => ({ ...s, maintenance_mode: !s.maintenance_mode }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.maintenance_mode ? "bg-red-500" : "bg-gray-300 dark:bg-gray-600"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.maintenance_mode ? "translate-x-5" : ""}`} />
                  </button>
                </div>
	                <button
	                  disabled={settingsSaving}
	                  onClick={saveSettingsPayload}
	                  className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
	                >
                  {settingsSaving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar Configurações</>}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">Logo do Painel</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Faça upload de uma nova logo para o painel. A imagem será usada na sidebar e na página de login.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                  <img src="/assets/logo-icon.png" alt="Logo atual" className="w-16 h-16 object-contain" />
                </div>
                <div className="flex-1">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Save className="w-4 h-4" />
                    Escolher Arquivo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          toast.info(`Logo "${file.name}" selecionada. Funcionalidade de upload será implementada com R2 Storage.`);
                        }
                      }}
                    />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-2">PNG, JPG ou WebP. Máximo 2MB.</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">Exclusão Automática de Documentos</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Configure o período de retenção (em dias) para cada tipo de documento. Após esse período, os documentos serão excluídos automaticamente.
              </p>
	              <div className="space-y-3">
                {[
                  { key: "auto_delete_atestado", label: "Atestados", defaultVal: "60" },
                  { key: "auto_delete_receita", label: "Receitas (Dr. Consulta)", defaultVal: "60" },
                  { key: "auto_delete_cnh", label: "CNH Digital", defaultVal: "365" },
                  { key: "auto_delete_cha", label: "CHA Náutica", defaultVal: "60" },
                  { key: "auto_delete_toxicologico", label: "Toxicológico", defaultVal: "60" },
                  { key: "auto_delete_historico", label: "Históricos Escolares", defaultVal: "90" },
                ].map(({ key, label, defaultVal }) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 w-48 flex-shrink-0">{label}</label>
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={(settings as any)[key] || defaultVal}
                      onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                      className="w-24 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 text-center"
                    />
                    <span className="text-xs text-gray-400">dias</span>
                  </div>
                ))}
	              </div>
	              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
	                <button
	                  onClick={saveSettingsPayload}
	                  className="py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors"
	                >
	                  Salvar Configurações de Exclusão
	                </button>
	                <button
	                  onClick={runCleanupNow}
	                  disabled={cleanupRunning}
	                  className="py-2.5 bg-gray-900 hover:bg-black disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
	                >
	                  {cleanupRunning ? "Executando limpeza..." : "Executar Limpeza Agora"}
	                </button>
	              </div>
	              <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4">
	                <div className="flex items-center justify-between gap-3 mb-3">
	                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Prévia da limpeza</p>
	                  <button onClick={loadCleanupPreview} className="p-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
	                    <RefreshCw className="w-3.5 h-3.5" />
	                  </button>
	                </div>
	                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
	                  {cleanupPreview?.pendingDeletion && Object.entries(cleanupPreview.pendingDeletion).map(([key, value]) => (
	                    <div key={key} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2">
	                      <p className="text-gray-400 uppercase">{key}</p>
	                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{String(value)}</p>
	                    </div>
	                  ))}
	                </div>
	                <p className="text-[11px] text-gray-400 mt-3">
	                  A prévia considera a data de emissão real (`data_emissao`) por tipo de documento.
	                </p>
	              </div>
	            </div>
          </div>
        )}
      </div>

	      {/* User Detail Modal */}
	      {userDetailOpen && selectedUser && (
	        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
	          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
	            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
	              <div>
	                <h3 className="font-bold text-gray-900 dark:text-white">{selectedUser.username}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
              </div>
              <button onClick={() => setUserDetailOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
	              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    R$ {(selectedUser.balance / 100).toFixed(2).replace(".", ",")}
                  </p>
                </div>
	                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
	                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
	                  <p className={`text-sm font-bold ${selectedUser.is_active ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
	                    {selectedUser.is_active ? "Ativo" : "Inativo"}
	                  </p>
	                </div>
	                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-3">
	                  <p className="text-xs text-gray-500 dark:text-gray-400">Documentos</p>
	                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{userDetails?.summary?.total_documents || userHistory.length}</p>
	                </div>
	                <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-3">
	                  <p className="text-xs text-gray-500 dark:text-gray-400">Transações</p>
	                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{userDetails?.summary?.total_transactions || 0}</p>
	                </div>
	              </div>

                {/* Seção de Gestão de Acessos Rápida */}
                <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl p-4 mb-6 border border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                      <Shield className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Gestão de Permissões</p>
                      <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400">Configure ACL, Módulos e Docs Gratuitos</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setUserDetailOpen(false); handleOpenPermissions(selectedUser); }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-none"
                  >
                    Gerenciar Acessos
                  </button>
                </div>

	              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Histórico de Emissões</h4>
	              {userHistory.length === 0 ? (
	                <p className="text-sm text-gray-400 text-center py-6">Nenhuma emissão registrada</p>
	              ) : (
                <div className="space-y-2">
                  {userHistory.map((h: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{h.paciente || h.nome || "—"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{h.type || "atestado"} · {formatDate(h.created_at)}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold">
                        {h.status || "emitido"}
                      </span>
                    </div>
	                  ))}
	                </div>
	              )}
	              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 mt-6">Transações</h4>
	              {(userDetails?.transactions || []).length === 0 ? (
	                <p className="text-sm text-gray-400 text-center py-4">Nenhuma transação registrada</p>
	              ) : (
	                <div className="space-y-2">
	                  {userDetails.transactions.slice(0, 8).map((tx: any) => (
	                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
	                      <div>
	                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{tx.description || tx.type}</p>
	                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(tx.created_at)}</p>
	                      </div>
	                      <span className={`text-sm font-bold ${tx.type === "credit" ? "text-green-600" : "text-red-500"}`}>
	                        {tx.type === "credit" ? "+" : "-"}R$ {((tx.amount || 0) / 100).toFixed(2)}
	                      </span>
	                    </div>
	                  ))}
	                </div>
	              )}
	              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 mt-6">Indicações</h4>
	              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
	                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
	                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Como indicador</p>
	                  {(userDetails?.referrals?.as_referrer || []).length === 0 ? (
	                    <p className="text-sm text-gray-400">Nenhum indicado.</p>
	                  ) : (
	                    <div className="space-y-2">
	                      {userDetails.referrals.as_referrer.slice(0, 5).map((item: any) => (
	                        <div key={item.id} className="flex items-center justify-between text-xs">
	                          <span className="text-gray-700 dark:text-gray-200">{item.referred_username}</span>
	                          <span className="text-green-600 font-semibold">R$ {((item.total_earned || 0) / 100).toFixed(2)}</span>
	                        </div>
	                      ))}
	                    </div>
	                  )}
	                </div>
	                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
	                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Como indicado</p>
	                  {(userDetails?.referrals?.as_referred || []).length === 0 ? (
	                    <p className="text-sm text-gray-400">Nenhum indicador vinculado.</p>
	                  ) : (
	                    <div className="space-y-2">
	                      {userDetails.referrals.as_referred.slice(0, 5).map((item: any) => (
	                        <div key={item.id} className="flex items-center justify-between text-xs">
	                          <span className="text-gray-700 dark:text-gray-200">{item.referrer_username}</span>
	                          <span className="text-gray-400">{item.status}</span>
	                        </div>
	                      ))}
	                    </div>
	                  )}
	                </div>
	              </div>
	            </div>
	          </div>
	        </div>
	      )}

	      {balanceModalUser && (
	        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
	          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 border border-gray-100 dark:border-gray-800 animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4 border-4 border-emerald-100 dark:border-emerald-800">
                  <Wallet className="w-10 h-10 text-emerald-600" />
                </div>
	              <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Gestão de Saldo</h3>
	              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ajustando conta de <span className="text-red-600 font-bold">@{balanceModalUser.username}</span></p>
              </div>

	            <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-gray-800/50 rounded-2xl mb-6">
	              <button onClick={() => setBalanceModalType("credit")} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${balanceModalType === "credit" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" : "text-gray-500 hover:text-gray-700"}`}>
                  <div className="flex items-center justify-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> Crédito
                  </div>
                </button>
	              <button onClick={() => setBalanceModalType("debit")} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${balanceModalType === "debit" ? "bg-red-600 text-white shadow-lg shadow-red-900/20" : "text-gray-500 hover:text-gray-700"}`}>
                  <div className="flex items-center justify-center gap-2">
                    <Minus className="w-3.5 h-3.5" /> Débito
                  </div>
                </button>
	            </div>

              <div className="relative group mb-8">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-black text-gray-400 group-focus-within:text-emerald-600 transition-colors">R$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={balanceModalValue}
                  onChange={e => setBalanceModalValue(e.target.value)}
                  placeholder="0,00"
                  autoFocus
                  className="w-full pl-14 pr-6 py-5 text-3xl font-black rounded-3xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-300"
                />
              </div>

	            <div className="grid grid-cols-2 gap-4">
	              <button onClick={() => setBalanceModalUser(null)} className="py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
	              <button onClick={submitBalanceAdjustment} disabled={savingBalance} className={`py-4 ${balanceModalType === 'credit' ? 'bg-emerald-600' : 'bg-red-600'} hover:opacity-90 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2`}>
	                {savingBalance ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {savingBalance ? "Salvando..." : "Confirmar"}
	              </button>
	            </div>
	          </div>
	        </div>
	      )}

	      {hardDeleteUser && (
	        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setHardDeleteUser(null)}>
	          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl p-6" onClick={e => e.stopPropagation()}>
	            <h3 className="font-bold text-gray-900 dark:text-white mb-2">Excluir usuário definitivamente</h3>
	            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
	              Esta exclusão é em cascata e remove documentos, transações, sessões, dados de presença e vínculos de indicação de <strong>{hardDeleteUser.username}</strong>.
	            </p>
	            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
	              <input type="checkbox" checked={hardDeleteConfirmChecked} onChange={e => setHardDeleteConfirmChecked(e.target.checked)} />
	              Confirmo que desejo excluir todos os dados em cascata
	            </label>
	            <input
	              type="text"
	              value={hardDeleteConfirmText}
	              onChange={e => setHardDeleteConfirmText(e.target.value)}
	              placeholder='Digite EXCLUIR'
	              className="w-full px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
	            />
	            <div className="flex gap-3 mt-4">
	              <button onClick={() => setHardDeleteUser(null)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold">Cancelar</button>
	              <button
	                disabled={!hardDeleteConfirmChecked || hardDeleteConfirmText !== "EXCLUIR"}
	                onClick={async () => {
	                  try {
	                    const res = await fetch(`/api/admin/users/${hardDeleteUser.id}/delete`, {
	                      method: "POST",
	                      headers: { "Content-Type": "application/json" },
	                      credentials: "include",
	                      body: JSON.stringify({ confirm: true, confirmation_text: "EXCLUIR" }),
	                    });
	                    const data = await res.json();
	                    if (data.success) {
	                      toast.success("Usuário excluído com sucesso");
	                      setHardDeleteUser(null);
	                      loadUsers(showPasswords);
	                    } else {
	                      toast.error(data.error || "Erro ao excluir usuário");
	                    }
	                  } catch {
	                    toast.error("Erro de conexão");
	                  }
	                }}
	                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold"
	              >
	                Excluir em cascata
	              </button>
	            </div>
	          </div>
	        </div>
	      )}

	      {emissionPreview && (
	        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEmissionPreview(null)}>
	          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
	            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
	              <div>
	                <h3 className="font-bold text-gray-900 dark:text-white">Visualizar emissão</h3>
	                <p className="text-xs text-gray-500 dark:text-gray-400">{emissionPreview.emission?.id}</p>
	              </div>
	              <button onClick={() => setEmissionPreview(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
	                <X className="w-4 h-4 text-gray-500" />
	              </button>
	            </div>
	            <div className="p-4 overflow-auto flex-1 bg-gray-100 dark:bg-gray-950">
	              {emissionPreviewLoading ? (
	                <div className="flex items-center justify-center py-12">
	                  <div className="animate-spin w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full" />
	                </div>
	              ) : emissionPreview.document_type === "atestado" ? (
	                <div className="flex justify-center">
	                  <AttestationDocument data={buildAttestationPreviewData(emissionPreview.payload)} />
	                </div>
	              ) : (
	                <pre className="text-xs text-gray-800 dark:text-gray-100 whitespace-pre-wrap rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
	                  {JSON.stringify(emissionPreview.payload || emissionPreview.document, null, 2)}
	                </pre>
	              )}
	            </div>
	          </div>
	        </div>
	      )}

	      {showPermissionsModal && aclSelectedUser && (
	        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
	          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-2xl p-6 border border-indigo-100 dark:border-indigo-900 animate-in zoom-in duration-300">
	            <div className="flex items-center justify-between mb-6">
	              <div className="flex items-center gap-3">
	                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
	                  <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
	                </div>
	                <div>
	                  <h3 className="font-bold text-gray-900 dark:text-white">Permissões de Acesso</h3>
	                  <p className="text-xs text-gray-500 tracking-tight font-black uppercase">{aclSelectedUser.username}</p>
	                </div>
	              </div>
	              <button onClick={() => setShowPermissionsModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
	            </div>

	            <div className="space-y-6">
	              <div>
                  <div className="flex items-center justify-between mb-3">
	                  <h4 className="text-[10px] font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest">EDITÁVEIS (Documentos Gerais)</h4>
                    <div className="flex gap-2">
                      <button onClick={() => selectAllDocs(true)} className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-md">Selecionar Todos</button>
                      <button onClick={() => selectAllDocs(false)} className="text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-tighter bg-gray-50 px-2 py-0.5 rounded-md">Limpar</button>
                    </div>
                  </div>
	                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
	                  {["atestado", "cnh", "cha", "toxicologico", "toxicria", "laudocria", "receita", "historico-sp", "historicocria", "diploma-uninter", "peticaocria"].map(doc => (
	                    <label key={doc} className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:border-indigo-300 transition-all">
	                      <input 
	                        type="checkbox" 
	                        checked={userPermissions.editaveis.includes(doc)}
	                        onChange={(e) => {
	                          const next = e.target.checked 
	                            ? [...userPermissions.editaveis, doc]
	                            : userPermissions.editaveis.filter((d: string) => d !== doc);
	                          setUserPermissions({ ...userPermissions, editaveis: next });
	                        }}
	                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" 
	                      />
	                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase truncate">{DOC_TYPE_LABELS[doc] || doc}</span>
	                    </label>
	                  ))}
	                </div>
	              </div>

	              {/* DESTAQUE: Permissão do Módulo /consultas (Master Buscas) */}
	              <div className="p-4 rounded-2xl border-2 border-violet-500/30 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 space-y-3 shadow-inner">
	                <div className="flex items-center justify-between flex-wrap gap-2">
	                  <div className="flex items-center gap-3">
	                    <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold shadow-md">
                        🔍
                      </div>
	                    <div>
	                      <h4 className="text-xs font-black text-violet-950 dark:text-violet-200 uppercase tracking-wide">
	                        Módulo Master Buscas (/consultas)
	                      </h4>
	                      <p className="text-[10px] text-violet-700 dark:text-violet-300 font-medium">
	                        Acesso livre sem custo vs Necessidade de plano
	                      </p>
	                    </div>
	                  </div>
	                  <button
	                    type="button"
	                    onClick={() => {
	                      const hasConsultas = userFreeDocs.includes("consultas");
	                      if (hasConsultas) {
	                        setUserFreeDocs(userFreeDocs.filter(s => s !== "consultas"));
	                      } else {
	                        setUserFreeDocs([...userFreeDocs, "consultas"]);
	                      }
	                    }}
	                    className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 border shadow-sm ${
	                      userFreeDocs.includes("consultas")
	                        ? "bg-emerald-600 text-white border-emerald-400"
	                        : "bg-amber-500 text-white border-amber-400"
	                    }`}
	                  >
	                    {userFreeDocs.includes("consultas") ? (
	                      <>
	                        <CheckCircle className="w-3.5 h-3.5" /> 🟢 MODO GRATUITO (LIBERADO)
	                      </>
	                    ) : (
	                      <>
	                        <Lock className="w-3.5 h-3.5" /> 🔴 MODO PAGO (REQUER PLANO)
	                      </>
	                    )}
	                  </button>
	                </div>
	              </div>

	              <div>
                  <div className="flex items-center justify-between mb-3">
	                  <h4 className="text-[10px] font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest">FERRAMENTAS (Módulos)</h4>
                    <div className="flex gap-2">
                      <button onClick={() => selectAllTools(true)} className="text-[9px] font-black text-emerald-600 hover:text-emerald-800 uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-md">Selecionar Todos</button>
                      <button onClick={() => selectAllTools(false)} className="text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-tighter bg-gray-50 px-2 py-0.5 rounded-md">Limpar</button>
                    </div>
                  </div>
	                <div className="grid grid-cols-2 gap-2">
	                  {["bot-adv", "peticao-stj", "consultas"].map(tool => (
	                    <label key={tool} className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:border-emerald-300 transition-all">
	                      <input 
	                        type="checkbox" 
	                        checked={userPermissions.ferramentas.includes(tool) || userFreeDocs.includes(tool)}
	                        onChange={(e) => {
	                          const next = e.target.checked 
	                            ? [...userPermissions.ferramentas, tool]
	                            : userPermissions.ferramentas.filter((t: string) => t !== tool);
	                          setUserPermissions({ ...userPermissions, ferramentas: next });
                            if (tool === "consultas") {
                              if (e.target.checked && !userFreeDocs.includes("consultas")) {
                                setUserFreeDocs([...userFreeDocs, "consultas"]);
                              } else if (!e.target.checked && userFreeDocs.includes("consultas")) {
                                setUserFreeDocs(userFreeDocs.filter(s => s !== "consultas"));
                              }
                            }
	                        }}
	                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" 
	                      />
	                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">{DOC_TYPE_LABELS[tool] || tool}</span>
	                    </label>
	                  ))}
	                </div>
	              </div>

                <div>
                  <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Gift size={12} /> Documentos Gratuitos (Sem Custo)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(DOC_TYPE_LABELS).map(([slug, label]) => (
                      <label key={slug} className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:border-amber-300 transition-all">
                        <input 
                          type="checkbox" 
                          checked={userFreeDocs.includes(slug)}
                          onChange={(e) => {
                            const next = e.target.checked 
                              ? [...userFreeDocs, slug]
                              : userFreeDocs.filter(s => s !== slug);
                            setUserFreeDocs(next);
                          }}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" 
                        />
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase truncate">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
	            </div>

	            <div className="mt-8">
	              <button 
	                onClick={savePermissions}
	                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
	              >
	                <Save size={18} /> SALVAR PERMISSÕES
	              </button>
	            </div>
	          </div>
	        </div>
	      )}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] text-white border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-150 space-y-5">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                confirmModal.type === "danger" ? "bg-rose-950/80 border-rose-500/40 text-rose-400 shadow-lg shadow-rose-950/50" :
                confirmModal.type === "warning" ? "bg-amber-950/80 border-amber-500/40 text-amber-400 shadow-lg shadow-amber-950/50" :
                "bg-blue-950/80 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-950/50"
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-white uppercase tracking-tight m-0">{confirmModal.title}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Confirmação de Ação Administrativa</p>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-300 leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(m => ({ ...m, open: false }))}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-3 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 ${
                  confirmModal.type === "danger" ? "bg-rose-600 hover:bg-rose-500 border border-rose-500/50 shadow-rose-950/50" :
                  confirmModal.type === "warning" ? "bg-amber-600 hover:bg-amber-500 border border-amber-500/50 shadow-amber-950/50" :
                  "bg-blue-600 hover:bg-blue-500 border border-blue-500/50 shadow-blue-950/50"
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE CONCESSÃO MANUAL DE TEMPO DE USO DE /consultas */}
      {grantPlanModalUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-violet-500/30 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center text-white font-bold shadow-md">
                  🔍
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Gestão Manual de Tempo — Master Buscas
                  </h3>
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-mono">
                    Usuário: <span className="font-bold">{grantPlanModalUser.username}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGrantPlanModalUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* SELEÇÃO DO MODO DE ACESSO */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Modo de Concessão de Acesso
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGrantPlanMode("free")}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    grantPlanMode === "free"
                      ? "bg-emerald-600 text-white border-emerald-400 shadow-md font-bold"
                      : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span className="text-base">🟢</span>
                  <span className="text-[10px] uppercase font-black">Gratuito Ilimitado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGrantPlanMode("plan")}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    grantPlanMode === "plan"
                      ? "bg-violet-600 text-white border-violet-400 shadow-md font-bold"
                      : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span className="text-base">⏳</span>
                  <span className="text-[10px] uppercase font-black">Tempo Determinado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGrantPlanMode("revoke")}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    grantPlanMode === "revoke"
                      ? "bg-red-600 text-white border-red-400 shadow-md font-bold"
                      : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span className="text-base">🔴</span>
                  <span className="text-[10px] uppercase font-black">Revogar / Modo Pago</span>
                </button>
              </div>
            </div>

            {/* SE MODO FOR 'PLAN' (TEMPO DETERMINADO) */}
            {grantPlanMode === "plan" && (
              <div className="space-y-3 p-4 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50">
                <label className="text-xs font-black text-violet-900 dark:text-violet-300 uppercase tracking-wider block">
                  Escolha o Período Liberado
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "1_dia", label: "⚡ 1 Dia" },
                    { id: "1_semana", label: "🗓️ 1 Semana" },
                    { id: "1_mes", label: "🗓️ 1 Mês" },
                    { id: "3_meses", label: "🗓️ 3 Meses" },
                    { id: "6_meses", label: "🗓️ 6 Meses" },
                    { id: "1_ano", label: "🗓️ 1 Ano" },
                    { id: "ilimitado_2099", label: "♾️ 31/12/2099 às 20:59" },
                    { id: "custom", label: "📅 Data Específica" },
                  ].map((dur) => (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => setGrantPlanDuration(dur.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        grantPlanDuration === dur.id
                          ? "bg-violet-600 text-white border-violet-400 shadow"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-violet-400"
                      }`}
                    >
                      {dur.label}
                    </button>
                  ))}
                </div>

                {grantPlanDuration === "custom" && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                      Selecione a Data Exata de Expiração:
                    </label>
                    <input
                      type="date"
                      value={grantPlanCustomDate}
                      onChange={(e) => setGrantPlanCustomDate(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* BOTÕES DE AÇÃO */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setGrantPlanModalUser(null)}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={savingGrantPlan}
                onClick={handleGrantPlan}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {savingGrantPlan ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirmar Concessão
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
