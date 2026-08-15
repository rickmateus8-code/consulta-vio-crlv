import React from "react";
import { Car, CheckCircle2 } from "lucide-react";

export interface Module {
  id: string;
  label: string;
  description: string;
  emoji: string;
  category: string;
  dailyLimit?: number;
}

export interface CategoryFilter {
  id: string;
  label: string;
  count: number;
  emoji: string;
}

interface CategoryFilterChipsProps {
  categoryFilters: CategoryFilter[];
  activeCategoryFilter: string;
  onSelectCategoryFilter: (categoryId: string) => void;
}

export const CategoryFilterChips: React.FC<CategoryFilterChipsProps> = ({
  categoryFilters,
  activeCategoryFilter,
  onSelectCategoryFilter,
}) => {
  return (
    <div className="rounded-2xl p-6 bg-[#0c0f2a]/90 border border-violet-500/20 space-y-4 text-center">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
        FILTRAR POR CATEGORIA
      </span>
      <div className="flex flex-wrap justify-center gap-2.5">
        {categoryFilters.map((cat) => {
          const isActive = activeCategoryFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategoryFilter(cat.id)}
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
  );
};

interface ModulesGridProps {
  modules: Module[];
  usageByModulo: Record<string, number>;
  onSelectModule: (moduleId: string) => void;
  variant?: "dashboard" | "full";
}

export const ModulesGrid: React.FC<ModulesGridProps> = ({
  modules,
  usageByModulo,
  onSelectModule,
  variant = "dashboard",
}) => {
  if (variant === "full") {
    return (
      <div className="space-y-8">
        <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-950/80 to-indigo-950/80 border border-violet-500/30 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white">Módulos de Consulta</h3>
            <p className="text-xs text-slate-400 mt-0.5">Selecione um módulo abaixo para realizar pesquisas direcionadas.</p>
          </div>
          <span className="text-xs font-bold text-violet-300 bg-violet-900/80 px-3 py-1.5 rounded-xl border border-violet-500/40">
            {modules.length} Módulos Disponíveis
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((mod) => {
            const modCount = usageByModulo[mod.id] || 0;
            return (
              <div
                key={mod.id}
                onClick={() => onSelectModule(mod.id)}
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
    );
  }

  return (
    <div className="rounded-2xl p-6 bg-[#0c0f2a]/90 border border-violet-500/20 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <Car className="w-5 h-5 text-violet-400" />
          <span>Módulos ({modules.length})</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {modules.map((mod) => {
          const modCount = usageByModulo[mod.id] || 0;
          return (
            <div
              key={mod.id}
              onClick={() => onSelectModule(mod.id)}
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
  );
};
