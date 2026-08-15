import React from "react";
import { Gift } from "lucide-react";

export interface ParcelaRecebida {
  valor?: string;
  nisFavorecido?: string;
  mesReferencia?: string;
}

export interface BeneficioPrograma {
  parcelasRecebidas?: ParcelaRecebida[];
}

export interface BeneficiosData {
  bolsaFamilia?: BeneficioPrograma;
  auxilioBrasil?: BeneficioPrograma;
  auxilioEmergencial?: BeneficioPrograma;
  histInss?: BeneficioPrograma;
}

interface BenefitsSectionProps {
  beneficiosObj: BeneficiosData;
}

export const BenefitsSection: React.FC<BenefitsSectionProps> = ({ beneficiosObj }) => {
  const hasAnyBenefit =
    (beneficiosObj.bolsaFamilia?.parcelasRecebidas && beneficiosObj.bolsaFamilia.parcelasRecebidas.length > 0) ||
    (beneficiosObj.auxilioBrasil?.parcelasRecebidas && beneficiosObj.auxilioBrasil.parcelasRecebidas.length > 0) ||
    (beneficiosObj.auxilioEmergencial?.parcelasRecebidas && beneficiosObj.auxilioEmergencial.parcelasRecebidas.length > 0) ||
    beneficiosObj.histInss;

  if (!hasAnyBenefit) return null;

  return (
    <div id="secao-beneficios" className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
      <div className="px-6 py-3 bg-slate-800/90 font-bold text-slate-200 text-sm flex items-center justify-between border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-slate-400" />
          <span>Programas Sociais e Benefícios Governo Federal</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">Bolsa Família / Auxílio Brasil / INSS</span>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {beneficiosObj.bolsaFamilia?.parcelasRecebidas && beneficiosObj.bolsaFamilia.parcelasRecebidas.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="font-bold text-slate-200 block border-b border-slate-800 pb-1">Bolsa Família</span>
            <div className="space-y-1 text-slate-400">
              <div>Parcelas Registradas: <strong className="text-slate-200">{beneficiosObj.bolsaFamilia.parcelasRecebidas.length} meses</strong></div>
              <div>Último Valor Mensal: <strong className="text-slate-200">R$ {beneficiosObj.bolsaFamilia.parcelasRecebidas[beneficiosObj.bolsaFamilia.parcelasRecebidas.length - 1]?.valor || "0,00"}</strong></div>
              <div>NIS Favorecido: <strong className="text-slate-300 font-mono">{beneficiosObj.bolsaFamilia.parcelasRecebidas[0]?.nisFavorecido || "Cadastrado"}</strong></div>
            </div>
          </div>
        )}

        {beneficiosObj.auxilioBrasil?.parcelasRecebidas && beneficiosObj.auxilioBrasil.parcelasRecebidas.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="font-bold text-slate-200 block border-b border-slate-800 pb-1">Auxílio Brasil</span>
            <div className="space-y-1 text-slate-400">
              <div>Parcelas Registradas: <strong className="text-slate-200">{beneficiosObj.auxilioBrasil.parcelasRecebidas.length} meses</strong></div>
              <div>Último Valor Mensal: <strong className="text-slate-200">R$ {beneficiosObj.auxilioBrasil.parcelasRecebidas[beneficiosObj.auxilioBrasil.parcelasRecebidas.length - 1]?.valor || "0,00"}</strong></div>
            </div>
          </div>
        )}

        {beneficiosObj.auxilioEmergencial?.parcelasRecebidas && beneficiosObj.auxilioEmergencial.parcelasRecebidas.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="font-bold text-slate-200 block border-b border-slate-800 pb-1">Auxílio Emergencial COVID</span>
            <div className="space-y-1 text-slate-400">
              <div>Parcelas Recebidas: <strong className="text-slate-200">{beneficiosObj.auxilioEmergencial.parcelasRecebidas.length} parcela(s)</strong></div>
              <div>Valor por Parcela: <strong className="text-slate-200">R$ {beneficiosObj.auxilioEmergencial.parcelasRecebidas[0]?.valor || "150,00"}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
