import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth, type AuthUser } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePresenceTracker } from "@/hooks/usePresenceTracker";
import NovoDocumentoModal from "@/components/NovoDocumentoModal";
import RecarregaModal, { RECARREGA_MODAL_EVENT, RECARREGA_MODAL_PENDING_KEY } from "@/components/RecarregaModal";
import ExtratoModal from "@/components/ExtratoModal";
import ReferralModal from "@/components/ReferralModal";
import UserProfileModal from "@/components/UserProfileModal";
import {
  LayoutDashboard, FileText, CreditCard, Receipt, LogOut,
  ChevronDown, ChevronRight, Menu, X, Sun, Moon,
  Shield, GraduationCap, Car, Anchor, FlaskConical,
  User, Wallet, Settings, HelpCircle, Plus, Bell, Pill, Gift, FilePlus, Search, AlertCircle, Database
} from "lucide-react";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  children?: { label: string; path: string; isCreation?: boolean }[];
}

const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    {
      icon: FileText, label: "Atestado",
      children: [
        { label: "Novo Atestado", path: "/atestadocria", isCreation: true },
        { label: "Atestados Salvos", path: "/atestadosalvos" },
      ],
    },
    {
      icon: Car, label: "CNH Digital",
      children: [
        { label: "Criar CNH", path: "/cnhcria", isCreation: true },
        { label: "CNHs Salvas", path: "/cnhsalvas" },
      ],
    },
    {
      icon: Anchor, label: "CHA Náutica",
      children: [
        { label: "Nova CHA", path: "/chacria", isCreation: true },
        { label: "CHAs Salvas", path: "/chasalvas" },
      ],
    },
    {
      icon: FileText, label: "Petição STJ",
      children: [
        { label: "Nova Petição", path: "/peticaocria", isCreation: true },
        { label: "Petições Salvas", path: "/peticaocria-salvos" },
      ],
    },
    { icon: Search, label: "Bot Adv", path: "/bot-adv" },
    {
      icon: Database, label: "Consultar Dados",
      children: [
        { label: "Consultar Dados", path: "/consultas" },
      ],
    },
    {
      icon: FlaskConical, label: "Toxicológico",
      children: [
        { label: "Laudo Innovatox", path: "/toxicria", isCreation: true },
        { label: "Laudos Innovatox Salvos", path: "/toxicriasalvos" },
      ],
    },
    {
      icon: Pill, label: "Receituário",
      children: [
        { label: "Dr. Consulta", path: "/receitacria", isCreation: true },
        { label: "Receitas Salvas", path: "/receitassalvas" },
      ],
    },
];

// Mapper para sincronizar paths da Sidebar com slugs de Documentos Gratuitos do Admin
const getPathSlug = (path: string): string => {
  const p = path.replace(/^\//, "");
  const mapping: Record<string, string> = {
    "atestadocria": "atestado",
    "cnhcria": "cnh",
    "chacria": "cha",
    "toxicria": "toxicria",
    "receitacria": "receita",
    "historicocria": "historico-uninter",
    "historico-uninter": "historico-uninter",
    "historico-sp": "historico-sp",
    "peticaocria": "peticao-stj",
    "peticao-stj": "peticao-stj",
    "diploma-uninter": "diploma-uninter",
    "certificado-fgv": "fgv",
    "laudocria": "laudocria"
  };
  return mapping[p] || p;
};

function SidebarItem({
  item,
  collapsed,
  onNavigate,
  userBalance = 0,
  freeDocuments = [],
  isAdmin = false,
  onInsufficientBalance,
}: {
  item: MenuItem;
  collapsed: boolean;
  onNavigate?: () => void;
  userBalance?: number;
  freeDocuments?: string[];
  isAdmin?: boolean;
  onInsufficientBalance?: () => void;
}) {
  const [location, setLocation] = useLocation();
  const isChildActive = item.children?.some(c => location === c.path) ?? false;
  const [open, setOpen] = useState(isChildActive);
  const isActive = item.path
    ? location === item.path
    : isChildActive;
  const Icon = item.icon;

  useEffect(() => {
    if (item.children) {
      const active = item.children.some(c => location === c.path);
      if (active) setOpen(true);
    }
  }, [location, item.children]);

  const navigate = useCallback((path: string, isCreation?: boolean) => {
    const slug = getPathSlug(path);
    const freeDocsArr = Array.isArray(freeDocuments) ? freeDocuments : [];
    
    // Lógica de verificação de gratuidade unificada
    const isFree = isAdmin || 
      freeDocsArr.includes(slug) || 
      (slug === "peticao-stj" && (freeDocsArr.includes("peticaocria") || freeDocsArr.includes("peticao"))) ||
      (slug === "historico-uninter" && freeDocsArr.includes("historicocria")) ||
      (slug === "toxicologico" && freeDocsArr.includes("toxicologia"));

    if (isCreation && userBalance <= 0 && !isFree) {
      console.warn(`[Sidebar] Acesso bloqueado para ${path}. slug: ${slug}, isFree: ${isFree}, Balance: ${userBalance}`);
      onInsufficientBalance?.();
      return;
    }
    setLocation(path);
    onNavigate?.();
  }, [setLocation, onNavigate, userBalance, onInsufficientBalance, freeDocuments, isAdmin]);

  const handleToggle = useCallback(() => {
    setOpen(o => !o);
  }, []);

  if (item.children) {
    return (
      <div>
        <button
          onClick={handleToggle}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
            ${isActive
              ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {open
                ? <ChevronDown className="w-3 h-3 opacity-60" />
                : <ChevronRight className="w-3 h-3 opacity-60" />}
            </>
          )}
        </button>
        {!collapsed && open && (
          <div className="ml-7 mt-1 space-y-0.5">
            {item.children.map(child => (
              <button
                key={child.path}
                onClick={() => navigate(child.path, child.isCreation)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all
                  ${location === child.path
                    ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium"
                    : "text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
              >
                {child.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => item.path && navigate(item.path)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
        ${isActive
          ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100"
        }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </button>
  );
}

function UserProfileHeader({
  user,
  collapsed,
  onOpenProfile,
}: {
  user: AuthUser;
  collapsed: boolean;
  onOpenProfile: () => void;
}) {
  return (
    <button
      onClick={onOpenProfile}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors w-full ${collapsed ? "justify-center" : ""}`}
    >
      <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-red-300 dark:border-red-700">
        {user.profilePhoto ? (
          <img src={user.profilePhoto} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User className="w-4 h-4 text-red-600 dark:text-red-400" />
        )}
      </div>
      {!collapsed && (
        <>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
              {user.displayName || user.username}
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">
              {user.role === "admin" ? "Administrador" : "Usuário"}
            </p>
          </div>
          <ChevronRight className="w-3 h-3 text-gray-400 opacity-50" />
        </>
      )}
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  usePresenceTracker();
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNovoDocModal, setShowNovoDocModal] = useState(false);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [showRecarregaModal, setShowRecarregaModal] = useState(false);
  const [showExtratoModal, setShowExtratoModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const handleOpenRecarregaModal = () => {
      setShowInsufficientBalance(false);
      setShowRecarregaModal(true);
    };

    if (window.sessionStorage.getItem(RECARREGA_MODAL_PENDING_KEY) === "1") {
      window.sessionStorage.removeItem(RECARREGA_MODAL_PENDING_KEY);
      handleOpenRecarregaModal();
    }

    window.addEventListener(RECARREGA_MODAL_EVENT, handleOpenRecarregaModal);
    return () => window.removeEventListener(RECARREGA_MODAL_EVENT, handleOpenRecarregaModal);
  }, []);

  useEffect(() => {
    if (location !== "/recargas") return;
    setShowInsufficientBalance(false);
    setShowRecarregaModal(true);
    setLocation("/dashboard");
  }, [location, setLocation]);

  if (!user) {
    setLocation("/login");
    return null;
  }

  const permissions = (() => {
    if (!user?.permissions) return { editaveis: [], ferramentas: [] };
    if (typeof user.permissions === "object") return user.permissions;
    try {
      return JSON.parse(user.permissions);
    } catch {
      return { editaveis: [], ferramentas: [] };
    }
  })();

  const isAllowed = (label: string) => {
    if (isAdmin) return true;
    const l = label.toLowerCase();
    const editaveis = Array.isArray(permissions.editaveis) ? permissions.editaveis : [];
    const ferramentas = Array.isArray(permissions.ferramentas) ? permissions.ferramentas : [];

    if (l === "dashboard") return true;
    if (l === "atestado") return editaveis.includes("atestado");
    if (l === "cnh digital") return editaveis.includes("cnh");
    if (l === "cha náutica") return editaveis.includes("cha");
    if (l === "petição stj") return ferramentas.includes("peticao-stj");
    if (l === "bot adv") return ferramentas.includes("bot-adv");
    if (l === "toxicológico") return editaveis.includes("toxicologico");
    if (l === "receituário") return editaveis.includes("receita");
    return false;
  };

  const filteredMenuItems = menuItems.filter(item => isAllowed(item.label));
  const allItems = filteredMenuItems;

  const safeBalance = typeof user.balance === 'number' ? user.balance : (parseFloat(String(user.balance ?? '0')) || 0);
  const balanceFormatted = `R$ ${(safeBalance / 100).toFixed(2).replace('.', ',')}`;
  const userBalanceSafe = safeBalance;
  const userCpf = typeof (user as any).cpf === "string" ? (user as any).cpf || "" : "";

  const handleOpenRecarregaModal = useCallback((closeMobile = false) => {
    if (closeMobile) setMobileOpen(false);
    setShowInsufficientBalance(false);
    setShowRecarregaModal(true);
  }, []);

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div
      className={`flex flex-col h-full ${mobile ? "w-72" : collapsed ? "w-18" : "w-64"} 
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200`}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-gray-800 min-h-[64px]">
        {(!collapsed || mobile) && (
          <div className="flex items-center cursor-pointer" onClick={() => setLocation("/dashboard")}>
            <img src="/assets/logo-text.webp" alt="DocMaster" className="h-9 w-auto object-contain" />
          </div>
        )}
        {collapsed && !mobile && (
          <div className="flex items-center justify-center w-full cursor-pointer" onClick={() => setLocation("/dashboard")}>
            <img src="/assets/logo-icon.png" alt="DM" className="h-9 w-9 object-contain" />
          </div>
        )}
        {!mobile && (
          <button onClick={() => setCollapsed(c => !c)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 rotate-90" />}
          </button>
        )}
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="px-2 py-3 space-y-3">
        {/* User Profile Header (Top) */}
        <UserProfileHeader 
          user={user} 
          collapsed={!mobile && collapsed} 
          onOpenProfile={() => { setShowProfileModal(true); if (mobile) setMobileOpen(false); }} 
        />
        
        <div className="space-y-2">
          <div className={`${collapsed && !mobile ? "flex justify-center" : ""}`}>
            <button
              onClick={() => { setShowNovoDocModal(true); if (mobile) setMobileOpen(false); }}
              className={`flex items-center gap-2 rounded-xl font-bold text-sm transition-all shadow-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white active:scale-95 ${collapsed && !mobile ? "w-10 h-10 justify-center p-0" : "w-full px-4 py-2.5 justify-center"}`}
            >
              <FilePlus className="w-4 h-4 flex-shrink-0" />
              {(!collapsed || mobile) && <span>Novo Documento</span>}
            </button>
          </div>

          {(!collapsed || mobile) && (
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider">Saldo</p>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{balanceFormatted}</p>
                </div>
                <button onClick={() => handleOpenRecarregaModal(mobile)} className="w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <button 
                onClick={() => { setShowExtratoModal(true); if (mobile) setMobileOpen(false); }}
                className="w-full py-1.5 px-2 rounded-md bg-white dark:bg-white/5 border border-blue-100 dark:border-white/5 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center justify-center gap-1.5 hover:bg-blue-50 transition-all"
              >
                <Receipt className="w-3 h-3" /> Ver Extrato
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto custom-scrollbar">
        {allItems.map(item => (
          <div key={item.label} className="space-y-0.5">
            <SidebarItem
              item={item}
              collapsed={!mobile && collapsed}
              onNavigate={mobile ? () => setMobileOpen(false) : undefined}
              userBalance={userBalanceSafe}
              freeDocuments={user?.free_documents || []}
              isAdmin={isAdmin}
              onInsufficientBalance={() => {
                if (mobile) setMobileOpen(false);
                setShowInsufficientBalance(true);
              }}
            />
            {item.label === "CHA Náutica" && (
              <button
                onClick={() => { setShowHistoricoModal(true); if (mobile) setMobileOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100`}
              >
                <GraduationCap className="w-4 h-4 flex-shrink-0" />
                {(!collapsed || mobile) && <span>Histórico</span>}
              </button>
            )}
          </div>
        ))}

        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => { setLocation("/admin"); if (mobile) setMobileOpen(false); }}
              className={`group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all overflow-hidden bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95 shadow-sm border border-blue-100 dark:border-blue-800/50 ${collapsed && !mobile ? "justify-center w-12 h-12" : "w-full"}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity" />
              <Shield className="w-5 h-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              {(!collapsed || mobile) && (
                <div className="flex flex-col items-start leading-tight">
                  <span className="text-[11px] font-black uppercase tracking-widest opacity-80">Acesso Restrito</span>
                  <span className="text-sm font-black italic">Admin Portal</span>
                </div>
              )}
            </button>
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
          <button 
            onClick={() => { logout(); if (mobile) setMobileOpen(false); }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-black text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all ${collapsed && !mobile ? "justify-center w-full" : "w-full"}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {(!collapsed || mobile) && <span>SAIR DA CONTA</span>}
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <div className="hidden md:flex flex-shrink-0"><SidebarContent /></div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 shadow-2xl"><SidebarContent mobile /></div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="md:hidden flex items-center justify-between px-3 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm z-30">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><Menu className="w-5 h-5" /></button>
            <img src="/assets/logo-text.webp" alt="DocMaster" className="h-6 w-auto object-contain" onClick={() => setLocation("/dashboard")} />
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowNovoDocModal(true)} className="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg transition-colors shadow-sm"><FilePlus className="w-4 h-4" /></button>
            <div onClick={() => handleOpenRecarregaModal(false)} className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1.5 rounded-lg cursor-pointer active:scale-95 transition-transform">
              <Wallet className="w-3.5 h-3.5 text-red-500" /><span className="text-[11px] font-black text-red-600 dark:text-red-400">{balanceFormatted}</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 relative">
          <div className="w-full max-w-full overflow-x-hidden">{children}</div>
        </main>
      </div>
      <a href="https://wa.me/5511965355468?text=Suporte" target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-green-500 hover:bg-green-600 active:scale-95 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all">
        <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
      <NovoDocumentoModal open={showNovoDocModal} onClose={() => setShowNovoDocModal(false)} userBalance={userBalanceSafe} username={user.username} />
      <RecarregaModal isOpen={showRecarregaModal} onClose={() => setShowRecarregaModal(false)} userName={user.displayName || user.username} userCpf={userCpf} />
      <ExtratoModal isOpen={showExtratoModal} onClose={() => setShowExtratoModal(false)} />
      <ReferralModal isOpen={showReferralModal} onClose={() => setShowReferralModal(false)} />
      <UserProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        user={user} 
        logout={logout}
        onOpenRecarregaModal={() => handleOpenRecarregaModal()}
        onOpenExtratoModal={() => setShowExtratoModal(true)}
        onOpenReferralModal={() => setShowReferralModal(true)}
      />
      {showHistoricoModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowHistoricoModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
              <div>
                <h2 className="text-xl font-black text-blue-600 uppercase italic">Histórico Escolar</h2>
                <p className="text-xs text-gray-500 font-medium">Selecione o modelo de emissão</p>
              </div>
              <button onClick={() => setShowHistoricoModal(false)} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 flex-1">
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl p-3 mb-6 flex items-center gap-3">
                <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Seu saldo: <strong>{balanceFormatted}</strong></span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => { setShowHistoricoModal(false); if (userBalanceSafe <= 0) { setShowInsufficientBalance(true); return; } setLocation("/historico-sp"); }}
                  className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-white dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <GraduationCap size={24} />
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white uppercase leading-tight">Estado de SP</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">Histórico Escolar</span>
                </button>

                <button 
                  onClick={() => { setShowHistoricoModal(false); if (userBalanceSafe <= 0) { setShowInsufficientBalance(true); return; } setLocation("/historicocria"); }}
                  className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-white dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <GraduationCap size={24} />
                  </div>
                  <span className="text-sm font-black text-gray-900 dark:text-white uppercase leading-tight">UNINTER</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">Centro Universitário</span>
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                <button 
                  onClick={() => { setShowHistoricoModal(false); setLocation("/historico-sp-salvos"); }}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition-all"
                >
                  SP Salvos
                </button>
                <button 
                  onClick={() => { setShowHistoricoModal(false); setLocation("/historico-uninter-salvos"); }}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-white dark:hover:bg-gray-800 transition-all"
                >
                  UNINTER Salvos
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-800/30 text-center">
               <button onClick={() => setShowHistoricoModal(false)} className="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest">Fechar Janela</button>
            </div>
          </div>
        </div>
      )}
      {showInsufficientBalance && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setShowInsufficientBalance(false)}>
          <div className="bg-slate-950 border border-slate-800 rounded-[2.5rem] p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-orange-500/10 blur-[100px] rounded-full" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 blur-[100px] rounded-full" />
            
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-orange-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <AlertCircle className="w-10 h-10 text-orange-500" />
              </div>

              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">
                Saldo Insuficiente
              </h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8 px-4">
                Você não possui saldo suficiente para iniciar esta emissão. 
                Recarregue agora e continue utilizando a plataforma Elite.
              </p>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Saldo Atual</p>
                    <p className="text-lg font-black text-white">{balanceFormatted}</p>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Acesso</p>
                    <p className="text-xs font-black text-slate-300 uppercase">Bloqueado</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => { setShowInsufficientBalance(false); handleOpenRecarregaModal(); }}
                  className="py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-900/20"
                >
                  Recarregar
                </button>
                <button
                  onClick={() => setShowInsufficientBalance(false)}
                  className="py-4 rounded-2xl bg-slate-800 text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
