import React from "react";
import masterBuscasLogo from "@/assets/master_buscas_logo.png";
import { ChevronLeft, LayoutGrid, Search, History, Moon, LogOut } from "lucide-react";
import type { ViewMode } from "./ConsultasHeaderMobile";

interface ConsultasSidebarProps {
  viewMode: ViewMode;
  onSelectViewMode: (viewMode: ViewMode) => void;
  onLogout: () => void;
}

export const ConsultasSidebar: React.FC<ConsultasSidebarProps> = ({
  viewMode,
  onSelectViewMode,
  onLogout,
}) => {
  return (
    <aside className="hidden md:flex w-64 bg-[#0c0f2a] border-r border-violet-500/20 flex-col justify-between p-4 flex-shrink-0">
      <div className="space-y-6">
        {/* Logo Topo */}
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950/90 border border-violet-500/40 p-1.5 flex items-center justify-center shadow-lg overflow-hidden shrink-0">
              <img src={masterBuscasLogo} alt="Master Buscas Logo" className="w-full h-full object-contain" />
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
            onClick={() => onSelectViewMode("dashboard")}
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
            onClick={() => onSelectViewMode("modulos")}
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
            onClick={() => onSelectViewMode("historico")}
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
          onClick={onLogout}
          className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" /> Sair ↳
        </button>
      </div>
    </aside>
  );
};
