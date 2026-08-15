import React from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";

interface EmptyStateBannerProps {
  onClose?: () => void;
  title?: string;
  message?: string;
}

export const EmptyStateBanner: React.FC<EmptyStateBannerProps> = ({
  onClose,
  title = "Nenhum Registro Localizado",
  message = "Não foram encontrados dados cadastrais nas bases oficiais para os parâmetros informados.",
}) => {
  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-8 text-center shadow-2xl space-y-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{title}</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">{message}</p>
      </div>
      {onClose && (
        <div className="pt-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all border border-slate-700/50"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Painel de Consultas
          </button>
        </div>
      )}
    </div>
  );
};
