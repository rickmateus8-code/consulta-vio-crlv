import React from "react";
import { History, RefreshCw, Loader2 } from "lucide-react";

export interface ConsultationHistoryItem {
  id: number | string;
  modulo: string;
  created_at: string;
}

interface ConsultasHistoryViewProps {
  historyList: ConsultationHistoryItem[];
  historyLoading: boolean;
  onRefresh: () => void;
}

export const ConsultasHistoryView: React.FC<ConsultasHistoryViewProps> = ({
  historyList,
  historyLoading,
  onRefresh,
}) => {
  return (
    <div className="rounded-2xl p-6 bg-slate-900/90 border border-violet-500/30 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-violet-500/20 pb-4">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-violet-400" />
          <div>
            <h3 className="text-base font-bold text-white">Histórico de Consultas</h3>
            <p className="text-xs text-slate-400">Consultas executadas recentemente pelo seu usuário</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={historyLoading}
          className="px-3.5 py-2 rounded-xl bg-violet-900/40 hover:bg-violet-800 text-violet-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>

      {historyLoading ? (
        <div className="py-12 text-center text-slate-400 text-xs flex justify-center items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-violet-400" /> Carregando histórico...
        </div>
      ) : historyList.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          Nenhuma consulta realizada nas últimas horas.
        </div>
      ) : (
        <div className="divide-y divide-violet-500/10">
          {historyList.map((item, i) => (
            <div key={i} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-950 flex items-center justify-center font-bold text-violet-300">
                  #{item.id}
                </div>
                <div>
                  <p className="font-bold text-white uppercase">{item.modulo}</p>
                  <p className="text-slate-400 text-[11px]">{new Date(item.created_at).toLocaleString("pt-BR")}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                Sucesso
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
