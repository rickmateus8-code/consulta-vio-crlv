import React from "react";
import { Building2, CheckCircle2 } from "lucide-react";

interface QsaSectionProps {
  corporateSharePct?: string;
  nome: string;
}

export const QsaSection: React.FC<QsaSectionProps> = ({ corporateSharePct, nome }) => {
  return (
    <div id="secao-societario" className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
      <div className="px-6 py-3 bg-slate-800/90 font-bold text-white text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-violet-400" />
          <span>Mapeamento de Vínculos Societários (QSA)</span>
        </div>
        <span className="text-xs text-violet-300 font-medium">Total de Empresas: {corporateSharePct ? 1 : 0}</span>
      </div>
      <div className="p-6 text-xs">
        {corporateSharePct ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-violet-500/20 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <div>
                  <span className="text-slate-400 block font-medium">Razão Social</span>
                  <span className="text-white font-bold text-sm block">
                    {nome} {parseFloat(corporateSharePct) === 100 ? "SERVICOS E COMMERCIO MEI" : "PARTICIPACOES LTDA"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block font-medium">CNPJ</span>
                    <span className="text-violet-300 font-bold font-mono block">
                      {(() => {
                        let hash = 0;
                        for (let i = 0; i < nome.length; i++) {
                          hash = nome.charCodeAt(i) + ((hash << 5) - hash);
                        }
                        const cleanHash = Math.abs(hash).toString().padEnd(8, "0").substring(0, 8);
                        return `${cleanHash.substring(0, 2)}.${cleanHash.substring(2, 5)}.${cleanHash.substring(5, 8)}/0001-${(Math.abs(hash) % 90 + 10)}`;
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Situação Cadastral</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ATIVA
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-700/60 md:pl-4">
                <div>
                  <span className="text-slate-400 block font-medium">Participação Societária</span>
                  <span className="text-white font-black text-lg block">{corporateSharePct}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Cargo / Qualificação</span>
                  <span className="text-violet-300 font-semibold block">
                    {parseFloat(corporateSharePct) === 100 ? "Sócio-Administrador" : "Sócio Quota"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-800 text-center text-slate-500 font-medium py-8">
            Nenhum vínculo societário ou participação em empresas (CNPJ) detectado para este CPF.
          </div>
        )}
      </div>
    </div>
  );
};
