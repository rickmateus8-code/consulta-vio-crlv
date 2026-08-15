import React from "react";
import { Phone } from "lucide-react";

export interface PhoneItemRecord {
  numero?: string;
  telefone?: string;
  PHONE?: string;
  fonte?: string;
  tipo?: string;
}

interface PhonesSectionProps {
  telefonesList: Array<PhoneItemRecord | string>;
}

export const PhonesSection: React.FC<PhonesSectionProps> = ({ telefonesList }) => {
  return (
    <div id="secao-telefones" className="rounded-2xl overflow-hidden border border-violet-500/40 bg-slate-900 shadow-2xl">
      <div className="px-6 py-3 bg-slate-800/90 font-bold text-white text-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-emerald-400" />
          <span>Telefones de Contato</span>
        </div>
        <span className="text-xs text-emerald-300 font-medium">Total: {telefonesList.length}</span>
      </div>
      <div className="p-6 space-y-2">
        {telefonesList.length > 0 ? (
          telefonesList.map((tel, i) => {
            const num = typeof tel === "object" ? (tel.numero || tel.telefone || tel.PHONE || "") : String(tel);
            const cleanNum = String(num).replace(/\D/g, "");
            const fonte = typeof tel === "object" ? tel.fonte : "";
            return (
              <div key={i} className="p-3 rounded-xl bg-slate-800/50 border border-violet-500/20 text-xs flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{num}</span>
                  {fonte && <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{fonte}</span>}
                </div>
                <a
                  href={`https://wa.me/55${cleanNum}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                >
                  WhatsApp
                </a>
              </div>
            );
          })
        ) : (
          <p className="text-slate-400 text-xs py-2">Nenhum telefone específico retornado.</p>
        )}
      </div>
    </div>
  );
};
