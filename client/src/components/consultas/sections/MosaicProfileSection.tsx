import React from "react";
import { Activity } from "lucide-react";

export interface SerasaMosaicData {
  codMosaic?: string;
  descricaoMosaic?: string;
  descMosaicSecundario?: string;
}

export interface PoderAquisitivoData {
  poderAquisitivo?: string;
  faixaRenda?: string;
  renda?: string | number;
  rendaEstimada?: string;
}

interface MosaicProfileSectionProps {
  serasaMosaicObj: SerasaMosaicData;
  poderAquisitivoObj: PoderAquisitivoData;
}

export const MosaicProfileSection: React.FC<MosaicProfileSectionProps> = ({
  serasaMosaicObj,
  poderAquisitivoObj,
}) => {
  const hasMosaicOrPurchasingPower =
    serasaMosaicObj.descricaoMosaic || poderAquisitivoObj.poderAquisitivo;

  if (!hasMosaicOrPurchasingPower) return null;

  return (
    <div
      id="secao-socioeconomico-avancado"
      className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl"
    >
      <div className="px-6 py-3 bg-slate-800/90 font-bold text-slate-200 text-sm flex items-center justify-between border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <span>Perfil Serasa Mosaic & Análise de Poder Aquisitivo</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">Bureaus de Crédito</span>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {serasaMosaicObj.descricaoMosaic && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
              Classificação Serasa Mosaic
            </span>
            <span className="text-slate-200 font-black text-sm block">
              {serasaMosaicObj.descricaoMosaic} ({serasaMosaicObj.codMosaic || "N/A"})
            </span>
            {serasaMosaicObj.descMosaicSecundario && (
              <p className="text-slate-400 text-xs pt-1">
                Perfil Secundário: {serasaMosaicObj.descMosaicSecundario}
              </p>
            )}
          </div>
        )}

        {poderAquisitivoObj.poderAquisitivo && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
              Estimativa de Poder Aquisitivo
            </span>
            <span className="text-slate-200 font-black text-sm block">
              {poderAquisitivoObj.poderAquisitivo} ({poderAquisitivoObj.faixaRenda || "Estimado"})
            </span>
            <p className="text-slate-400 text-xs pt-1">
              Renda Estimada: R$ {poderAquisitivoObj.renda || "600"},00
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
