import React from "react";
import { Syringe } from "lucide-react";

export interface VaccineRecord {
  nome?: string;
  nomeVacina?: string;
  vacinaNome?: string;
  fabricante?: string;
  lote?: string;
  dataAplicacao?: string;
  descricaoDose?: string;
  estabelecimento?: string;
  estabAplicacao?: string;
  vacina?: {
    nome?: string;
    nomeVacina?: string;
    vacinaNome?: string;
    fabricante?: string;
    lote?: string;
  };
  aplicacao?: {
    fabricante?: string;
    lote?: string;
    dataAplicacao?: string;
    descricaoDose?: string;
    estabelecimento?: string;
    estabAplicacao?: string;
  };
}

interface VaccinesSectionProps {
  vacinasList: VaccineRecord[];
}

export const VaccinesSection: React.FC<VaccinesSectionProps> = ({ vacinasList }) => {
  if (!vacinasList || vacinasList.length === 0) return null;

  return (
    <div id="secao-vacinas" className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
      <div className="px-6 py-3 bg-slate-800/90 font-bold text-slate-200 text-sm flex items-center justify-between border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Syringe className="w-4 h-4 text-slate-400" />
          <span>Histórico de Imunizações e Vacinas (DATASUS / SUS)</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">Total: {vacinasList.length} registro(s)</span>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {vacinasList.map((vac, idx) => {
          const vObj = vac.vacina || vac;
          const aObj = vac.aplicacao || vac;
          const nomeVac = vObj.nomeVacina || vObj.vacinaNome || vObj.nome || "Vacina";
          const fabricante = vObj.fabricante || aObj.fabricante || "Oficial SUS";
          const lote = vObj.lote || aObj.lote || "Não Informado";
          const dataApp = aObj.dataAplicacao || vac.dataAplicacao || "Data N/I";
          const dose = vac.descricaoDose || aObj.descricaoDose || "Dose Única / Imunização";
          const local = aObj.estabelecimento || aObj.estabAplicacao || "Posto de Saúde Central";

          return (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 uppercase tracking-wide">{nomeVac}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">{dose}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                <div><span className="text-slate-500 block">Fabricante / Lote:</span> <strong className="text-slate-300">{fabricante} ({lote})</strong></div>
                <div><span className="text-slate-500 block">Data de Aplicação:</span> <strong className="text-slate-300">{dataApp.split('T')[0]}</strong></div>
              </div>
              <div className="text-[10px] text-slate-500 truncate pt-1 border-t border-slate-900">
                Local: {local}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
