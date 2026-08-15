import React from "react";
import { Users, Search } from "lucide-react";
import { toast } from "sonner";

export interface RelativeItemRecord {
  nome?: string;
  name?: string;
  NOME?: string;
  cpf?: string;
  CPF?: string;
  vinculo?: string;
  relationship?: string;
  VINCULO?: string;
}

interface RelativesSectionProps {
  parentesData: RelativeItemRecord[];
  onSelectPerson?: (cpf: string) => void;
}

export const RelativesSection: React.FC<RelativesSectionProps> = ({
  parentesData,
  onSelectPerson,
}) => {
  if (!parentesData || parentesData.length === 0) return null;

  return (
    <div id="secao-parentes" className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
      <div className="px-6 py-3 bg-slate-800/90 font-bold text-white text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" />
          <span>Parentes Registrados</span>
        </div>
        <span className="text-xs text-violet-300 font-medium">Total: {parentesData.length}</span>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {parentesData.map((par, i) => {
          const parNome = par.nome || par.name || par.NOME || "Parente";
          const parCpf = par.cpf || par.CPF || "";
          const cleanCpf = parCpf ? String(parCpf).replace(/\D/g, "") : "";
          const formattedCpf = cleanCpf.length === 11
            ? cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
            : (parCpf || "CPF Não Consta");
          const vinculo = par.vinculo || par.relationship || par.VINCULO || "Parente";

          return (
            <div key={i} className="p-3.5 rounded-2xl bg-slate-950/80 border border-violet-500/30 hover:border-violet-400 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">{parNome}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-950 text-violet-300 border border-violet-500/30">
                    {vinculo}
                  </span>
                </div>
                <p className="text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
                  <span>CPF: {formattedCpf}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                {cleanCpf.length === 11 && onSelectPerson ? (
                  <button
                    type="button"
                    onClick={() => onSelectPerson(cleanCpf)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all no-print"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Consultar CPF ➔</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(parNome);
                      toast.success("Nome copiado!");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-bold border border-violet-500/20"
                  >
                    📋 Copiar Nome
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
