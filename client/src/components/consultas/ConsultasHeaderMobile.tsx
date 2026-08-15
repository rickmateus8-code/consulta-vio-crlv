import React from "react";
import masterBuscasLogo from "@/assets/master_buscas_logo.png";
import { Clock, LogOut, Search, LayoutGrid, History } from "lucide-react";

export type ViewMode = "dashboard" | "modulos" | "historico";

interface ConsultasHeaderMobileProps {
  viewMode: ViewMode;
  usageRestantes: number;
  onSelectViewMode: (viewMode: ViewMode) => void;
  onLogout: () => void;
}

export const ConsultasHeaderMobile: React.FC<ConsultasHeaderMobileProps> = ({
  viewMode,
  usageRestantes,
  onSelectViewMode,
  onLogout,
}) => {
  return (
    <header className="md:hidden bg-[#0c0f2a] border-b border-violet-500/20 p-3.5 space-y-3 flex-shrink-0 z-10">
      {/* Linha 1: Logo + Status + Botão Sair */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-950/90 border border-violet-500/40 p-1 flex items-center justify-center shadow-lg overflow-hidden shrink-0">
            <img src={masterBuscasLogo} alt="Master Buscas Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-black text-sm text-white tracking-tight">Master Buscas</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#070a19] border border-violet-500/20 text-[10px] font-bold">
            <Clock className="w-3 h-3 text-violet-400" />
            <span className="text-emerald-400">{usageRestantes} rest.</span>
          </div>
          <button
            onClick={onLogout}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-violet-600/90 hover:bg-violet-500 text-white flex items-center gap-1 active:scale-95 transition-all shadow-md"
          >
            <LogOut className="w-3 h-3" /> Sair
          </button>
        </div>
      </div>

      {/* Linha 2: Submenu de Navegação Mobile Separado (Pesquisas | Módulos | Histórico) */}
      <div className="grid grid-cols-3 gap-1.5 bg-[#070a19]/90 p-1 rounded-xl border border-violet-500/20">
        <button
          onClick={() => onSelectViewMode("dashboard")}
          className={`py-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 ${
            viewMode === "dashboard"
              ? "bg-violet-600 text-white shadow-md shadow-violet-600/30 border border-violet-400/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Pesquisas</span>
        </button>

        <button
          onClick={() => onSelectViewMode("modulos")}
          className={`py-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 ${
            viewMode === "modulos"
              ? "bg-violet-600 text-white shadow-md shadow-violet-600/30 border border-violet-400/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Módulos</span>
        </button>

        <button
          onClick={() => onSelectViewMode("historico")}
          className={`py-2 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 ${
            viewMode === "historico"
              ? "bg-violet-600 text-white shadow-md shadow-violet-600/30 border border-violet-400/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Histórico</span>
        </button>
      </div>
    </header>
  );
};
