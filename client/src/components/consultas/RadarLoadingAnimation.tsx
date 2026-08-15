import React from "react";
import { Radar, CheckCircle2 } from "lucide-react";

export const RadarLoadingAnimation: React.FC = () => {
  return (
    <div className="rounded-2xl p-8 bg-[#0c0f2a]/95 border border-violet-500/40 text-center shadow-2xl space-y-6 relative overflow-hidden">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative w-20 h-20 rounded-full border-2 border-violet-500/40 flex items-center justify-center bg-slate-950/80 shadow-inner">
          <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping opacity-75" />
          <div className="w-14 h-14 rounded-full border border-violet-400/50 flex items-center justify-center bg-violet-950/60">
            <Radar className="w-7 h-7 text-violet-400 animate-spin" />
          </div>
        </div>
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-widest">
            Agregando Bases de Inteligência (Radar OSINT)
          </h3>
          <p className="text-[11px] text-violet-300 font-mono mt-1">
            Varrendo registros em tempo real nas Bases Nacionais Unificadas v3...
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] max-w-xl mx-auto pt-1">
        <div className="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-center justify-center gap-1.5 text-emerald-300 font-bold animate-pulse">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Receita Federal
        </div>
        <div className="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-center justify-center gap-1.5 text-emerald-300 font-bold animate-pulse">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Bases de Fotos
        </div>
        <div className="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-center justify-center gap-1.5 text-emerald-300 font-bold animate-pulse">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Bureau Crédito
        </div>
        <div className="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-center justify-center gap-1.5 text-emerald-300 font-bold animate-pulse">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Datasus & DETRAN
        </div>
      </div>
    </div>
  );
};
