import React, { useState } from "react";
import { Download, Copy, Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

export interface VehicleDataRecord {
  placa?: string;
  PLACA?: string;
  placa_mercosul?: string;
  PLACA_MERCOSUL?: string;
  chassi?: string;
  CHASSI?: string;
  renavam?: string;
  RENAVAM?: string;
  motor?: string;
  NUMERO_MOTOR?: string;
  restricoes?: string;
  RESTRIÇÃO?: string;
  RESTRIÇÕES?: string;
  situacao_veiculo?: string;
  SITUACAO_VEICULO?: string;
  situacao_chassi?: string;
  SITUACAO_CHASSI?: string;
  marca_modelo?: string;
  MARCA_MODELO?: string;
  modelo?: string;
  ano_fabricacao?: string | number;
  ANO_FABRICACAO?: string | number;
  ano_modelo?: string | number;
  ANO_MODELO?: string | number;
  cor?: string;
  COR?: string;
  combustivel?: string;
  COMBUSTIVEL?: string;
  municipio?: string;
  MUNICIPIO?: string;
  uf?: string;
  UF?: string;
  proprietario?: {
    nome?: string;
    cpf_cnpj?: string;
  };
  PROPRIETARIO?: string;
  NOME_PROPRIETARIO?: string;
  CPF_PROPRIETARIO?: string;
}

interface VehicleProfileViewProps {
  vehicle: VehicleDataRecord;
  profileRef?: React.RefObject<HTMLDivElement | null>;
  isExportingPDF: boolean;
  handleExportPDF: () => void;
  onSelectPerson?: (cpf: string) => void;
}

export const VehicleProfileView: React.FC<VehicleProfileViewProps> = ({
  vehicle: v,
  profileRef,
  isExportingPDF,
  handleExportPDF,
  onSelectPerson,
}) => {
  const [copied, setCopied] = useState(false);

  const placa = v.placa || v.PLACA || "Não informado";
  const placaMercosul = v.placa_mercosul || v.PLACA_MERCOSUL || placa;
  const chassi = v.chassi || v.CHASSI || "Não informado";
  const renavam = v.renavam || v.RENAVAM || "Não informado";
  const motor = v.motor || v.NUMERO_MOTOR || "Não informado";
  const restricoes = v.restricoes || v.RESTRIÇÃO || v.RESTRIÇÕES || "SEM RESTRIÇÕES";
  const situacaoVeiculo = v.situacao_veiculo || v.SITUACAO_VEICULO || "EM CIRCULAÇÃO";
  const situacaoChassi = v.situacao_chassi || v.SITUACAO_CHASSI || "REGULAR";
  const marcaModelo = v.marca_modelo || v.MARCA_MODELO || v.modelo || "Não informado";
  const anoFab = v.ano_fabricacao || v.ANO_FABRICACAO || "Não informado";
  const anoMod = v.ano_modelo || v.ANO_MODELO || "Não informado";
  const cor = v.cor || v.COR || "Não informado";
  const combustivel = v.combustivel || v.COMBUSTIVEL || "Não informado";
  const municipio = v.municipio || v.MUNICIPIO || "";
  const uf = v.uf || v.UF || "";
  const propNome = v.proprietario?.nome || v.PROPRIETARIO || v.NOME_PROPRIETARIO || "Não informado";
  const propCpf = v.proprietario?.cpf_cnpj || v.CPF_PROPRIETARIO || "Não informado";

  const copyVehicleData = () => {
    const text = `
=== CONSULTA VEÍCULO (PLACA) ===
PLACA: ${placa}
PLACA MERCOSUL: ${placaMercosul}
CHASSI: ${chassi}
RENAVAM: ${renavam}
MOTOR: ${motor}
RESTRIÇÕES: ${restricoes}
SITUAÇÃO VEÍCULO: ${situacaoVeiculo}
SITUAÇÃO CHASSI: ${situacaoChassi}
MARCA/MODELO: ${marcaModelo}
ANO FAB/MOD: ${anoFab}/${anoMod}
COR: ${cor}
COMBUSTÍVEL: ${combustivel}
MUNICÍPIO/UF: ${municipio} - ${uf}
PROPRIETÁRIO: ${propNome} (CPF: ${propCpf})
`.trim();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Dados do veículo copiados!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div ref={profileRef} className="w-full space-y-6 text-slate-800 font-sans select-text bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
      {/* BOTÕES DE AÇÃO MODELO IMAGEM 3 */}
      <div className="flex justify-end gap-3 pb-2 border-b border-slate-200 no-print">
        <button
          onClick={handleExportPDF}
          disabled={isExportingPDF}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all disabled:opacity-60"
        >
          {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {isExportingPDF ? "Gerando PDF..." : "Exportar PDF"}
        </button>
        <button
          onClick={copyVehicleData}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado!" : "Copiar Dados"}
        </button>
      </div>

      {/* SEÇÃO 1: DATA */}
      <div className="space-y-3">
        <h3 className="text-xl font-black text-slate-900 border-b-2 border-blue-500 pb-1">Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Placa Nacional</span>
            <span className="font-mono font-bold text-slate-900 text-sm block">{placa}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Placa Mercosul</span>
            <span className="font-mono font-bold text-slate-900 text-sm block">{placaMercosul}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Chassi</span>
            <span className="font-mono font-bold text-slate-900 text-sm block">{chassi}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Renavam</span>
            <span className="font-mono font-bold text-slate-900 text-sm block">{renavam}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Motor</span>
            <span className="font-mono font-bold text-slate-900 text-sm block">{motor}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Restrições</span>
            <span className="font-bold text-slate-900 text-sm block">{restricoes}</span>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: CIRCULAÇÃO */}
      <div className="space-y-3">
        <h3 className="text-xl font-black text-slate-900 border-b-2 border-blue-500 pb-1">Circulação</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Situação Veículo</span>
            <span className="font-bold text-emerald-600 text-sm block">{situacaoVeiculo}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Situação Chassi</span>
            <span className="font-bold text-slate-900 text-sm block">{situacaoChassi}</span>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: CARACTERÍSTICAS */}
      <div className="space-y-3">
        <h3 className="text-xl font-black text-slate-900 border-b-2 border-blue-500 pb-1">Características</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Marca / Modelo</span>
            <span className="font-bold text-slate-900 block">{marcaModelo}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Ano Fab / Modelo</span>
            <span className="font-bold text-slate-900 block">{anoFab} / {anoMod}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Cor</span>
            <span className="font-bold text-slate-900 block">{cor}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Combustível</span>
            <span className="font-bold text-slate-900 block">{combustivel}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 md:col-span-2">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Município / UF Licenciamento</span>
            <span className="font-bold text-slate-900 block">{municipio} {uf ? `- ${uf}` : ''}</span>
          </div>
        </div>
      </div>

      {/* SEÇÃO 4: PROPRIETÁRIO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b-2 border-blue-500 pb-1">
          <h3 className="text-xl font-black text-slate-900">Proprietário</h3>
          {onSelectPerson && propCpf && propCpf !== "Não informado" && (
            <button
              onClick={() => onSelectPerson(propCpf.replace(/\D/g, ""))}
              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 border border-blue-200"
            >
              <Search className="w-3 h-3" /> Consultar CPF do Proprietário
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">Nome Proprietário</span>
            <span className="font-bold text-slate-900 text-sm block">{propNome}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 text-[10px] block font-bold uppercase">CPF / CNPJ Proprietário</span>
            <span className="font-mono font-bold text-slate-900 text-sm block">{propCpf}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
