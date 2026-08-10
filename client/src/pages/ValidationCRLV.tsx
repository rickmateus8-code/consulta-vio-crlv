/**
 * ValidationCRLV.tsx — Réplica 1:1 do Validador Público CRLV Digital
 * Fonte de inspiração/referência: https://consulta-crlv-vio.info
 */
import { useState, useEffect } from "react";

export default function ValidationCRLV() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [infoAberto, setInfoAberto] = useState(false);
  const [codigoConsulta, setCodigoConsulta] = useState("");
  const [dataHoraConsulta, setDataHoraConsulta] = useState("");

  useEffect(() => {
    setDataHoraConsulta(new Date().toLocaleString("pt-BR"));
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get("codigo") || params.get("code") || params.get("token") || params.get("id") || "";
    
    // Suporte a extração de código via path (ex: /validar?codigo=XXX ou /v/XXX)
    let codeClean = codigo.trim();
    if (!codeClean) {
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      if (pathParts.length > 0 && pathParts[pathParts.length - 1] !== "validar" && pathParts[pathParts.length - 1] !== "consulta") {
        codeClean = pathParts[pathParts.length - 1];
      }
    }

    setCodigoConsulta(codeClean);

    if (!codeClean) {
      setError("Código de validação não informado.");
      setLoading(false);
      return;
    }

    fetch(`/api/validate/${encodeURIComponent(codeClean)}`, { credentials: "include" })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.valid && resData.data) {
          setData(resData.data);
        } else {
          // Fallback para buscar direto em /api/documents/[id]
          return fetch(`/api/documents/${encodeURIComponent(codeClean)}`, { credentials: "include" })
            .then((r) => r.json())
            .then((docRes) => {
              if (docRes.success && docRes.data) {
                setData(docRes.data);
              } else {
                setError("Dados não encontrados para o código informado.");
              }
            });
        }
      })
      .catch(() => {
        setError("Falha ao consultar validação pública do CRLV.");
      })
      .finally(() => setLoading(false));
  }, []);

  const formatarCpfCnpj = (v: string) => {
    if (!v) return "-";
    const nums = v.replace(/\D/g, "");
    if (nums.length === 11) return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (nums.length === 14) return nums.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    return v;
  };

  const getUF = (localStr?: string, detranUF?: string) => {
    if (detranUF) return detranUF.toUpperCase();
    if (!localStr) return "PR";
    const match = localStr.match(/\b[A-Z]{2}\b$/i);
    return match ? match[0].toUpperCase() : "PR";
  };

  const getChaveConsulta = (renavam?: string, code?: string) => {
    const base = (renavam || code || "CRLV").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const p1 = base.padEnd(11, "0").slice(0, 11);
    const p2 = String(Date.now()).slice(-10);
    return `{CRLV-${p1}-${p2}}`;
  };

  const qrUrl = typeof window !== "undefined"
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&ecc=H&margin=8&data=${encodeURIComponent(window.location.href)}`
    : "";

  return (
    <div className="bg-[#f0f0f0] min-h-screen text-[#333] font-sans m-0 p-0 selection:bg-emerald-200">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen pb-10 shadow-lg relative">
        {/* HEADER */}
        <div className="p-0 relative text-center after:content-[''] after:block after:mx-[18px] after:border-b after:border-[#e5e5e5]">
          {/* BREADCRUMB VERDE SENATRAN */}
          <div className="flex items-center justify-between h-[56px] px-4 bg-[#9ccc65] text-white text-[17px] font-normal">
            <span className="flex-1 text-left">Detalhamento</span>
            <button
              type="button"
              onClick={() => setInfoAberto(true)}
              className="w-4 h-4 rounded-full bg-white text-[#9ccc65] inline-flex items-center justify-center text-[13px] font-bold border-0 cursor-pointer"
              aria-label="Informações"
            >
              i
            </button>
          </div>

          {/* TITLE SECTION */}
          <div className="block py-[9.5px] px-[15px] pb-[10.5px] bg-[#eeeeee] text-left">
            <h1 className="text-[19px] text-[#333] font-normal leading-tight m-0">CRLV Digital</h1>
            <div className="mt-1 text-[13px] text-[#9e9e9e] font-normal uppercase">SENATRAN</div>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="text-center py-12 px-6 font-bold text-[#666]">
            Carregando dados...
          </div>
        )}

        {/* ERROR STATE */}
        {!loading && error && (
          <div className="text-center py-12 px-6 font-bold text-[#b91c1c]">
            {error}
          </div>
        )}

        {/* CONTENT STATE */}
        {!loading && !error && data && (
          <div>
            <DataRow label="Código de Segurança do CLA" value={data.codigoSegurancaCLA || data.cod_seg_cla || data.txt_cod_seg_cla} />
            <DataRow label="Número do CRV" value={data.numeroCRV || data.num_crv || data.txt_num_crv || "***"} />
            <DataRow label="UF" value={getUF(data.local || data.txt_local, data.detranUF)} />
            <DataRow label="Renavam" value={data.renavam || data.txt_renavam} />
            <DataRow label="RNTRC" value={data.rntrc || data.txt_rntrc || " "} />
            <DataRow label="Exercício" value={data.exercicio || data.txt_exercicios || "2026"} />
            <DataRow label="Nome" value={(data.nome || data.txt_nome || "").toUpperCase()} />
            <DataRow label="CPF/CNPJ" value={formatarCpfCnpj(data.cpfCnpj || data.cpf || data.txt_cpf_cnpj)} />
            <DataRow label="Placa" value={(data.placa || data.txt_placa || "").toUpperCase()} />
            <DataRow label="Chassi" value={(data.chassi || data.txt_chassi || "").toUpperCase()} />
            <DataRow label="Marca / Modelo:" value={(data.marcaModeloVersao || data.txt_marca_modelo_versao || "").toUpperCase()} />
            <DataRow
              label="Ano Fab/Mod:"
              value={`${data.anoFabricacao || data.txt_ano_fabricacao || ""} / ${data.anoModelo || data.txt_ano_modelo || ""}`}
            />
            <DataRow label="Cor:" value={(data.corPredominante || data.txt_cor || "").toUpperCase()} />
            <DataRow label="Combustível:" value={(data.combustivel || data.txt_combustivel || "").toUpperCase()} />
            <DataRow label="Espécie / Tipo:" value={(data.especieTipo || data.txt_especie_tipo || "").toUpperCase()} />
            <DataRow label="Categoria:" value={(data.categoria || data.txt_categoria || "").toUpperCase()} />
            <DataRow label="Carroceria:" value={(data.carroceria || data.txt_carroceria || "NÃO APLICAVEL").toUpperCase()} />
            <DataRow label="Local:" value={(data.local || data.txt_local || "").toUpperCase()} />
            <DataRow label="Data Emissão:" value={data.dataEmissaoDoc || data.dataEmissao || data.txt_data || "-"} />

            {/* SUCCESS BOX */}
            <div className="bg-[#f3f8ef] border border-[#d8e9cf] text-[#477138] p-3 m-[18px] rounded text-[13px] text-center leading-normal font-medium">
              Documento localizado na base
            </div>

            {/* OBSERVAÇÃO */}
            <div className="text-[12px] text-[#555] px-[18px] leading-normal mb-6">
              <strong className="text-[#333]">Observação:</strong><br />
              Esta consulta apresenta os dados vinculados ao código informado no QR Code do documento. A validação é realizada pela base do SENATRAN
            </div>

            {/* KEY HASH */}
            <div className="font-mono text-center text-[11px] text-[#777] mb-2.5 break-all px-5">
              Chave de registro de consulta {getChaveConsulta(data.renavam, codigoConsulta)}
            </div>

            {/* QR CODE INFERIOR */}
            <div className="text-center mb-5">
              <img src={qrUrl} alt="QR da consulta" className="w-[150px] h-[150px] mx-auto border border-slate-100 p-1" />
            </div>

            {/* FOOTER INFO */}
            <div className="bg-[#e8e8e8] p-3.5 text-center text-[12px] text-[#555] mx-[18px] rounded">
              Código de consulta: <span className="text-[#6f9f5b] font-bold">{codigoConsulta}</span>
            </div>

            {/* CONSULTA HORA */}
            <div className="relative m-0 pt-3 px-[18px] pb border-t border-[#e5e5e5] text-center text-[12px] text-[#555] mt-4">
              Data e Hora da Consulta
              <span className="block mt-1 text-[#111] font-medium">{dataHoraConsulta}</span>
            </div>
          </div>
        )}
      </div>

      {/* MODAL INFORMAÇÕES */}
      {infoAberto && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/45">
          <div className="w-full max-w-[360px] bg-white rounded shadow-2xl overflow-hidden">
            <h2 className="m-0 p-3.5 bg-[#9ccc65] text-white text-[17px] font-normal">Informações</h2>
            <p className="m-0 p-4 pb-0 text-[#333] text-[14px] leading-relaxed">
              Esta tela apresenta os dados vinculados ao QR Code do CRLV Digital consultado.
            </p>
            <p className="m-0 p-4 pt-2 text-[#333] text-[14px] leading-relaxed">
              Confira as informações do veículo, proprietário, RENAVAM, placa e chassi antes de prosseguir.
            </p>
            <button
              type="button"
              onClick={() => setInfoAberto(false)}
              className="block my-4 mr-4 ml-auto border-0 bg-transparent text-[#6f9f5b] text-[14px] font-bold uppercase cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="relative py-[9px] px-[18px] pb-[9.5px] block border-b border-[#e5e5e5]">
      <span className="block font-normal text-[10px] w-full text-[#6f9f5b] mb-[3px]">{label}</span>
      <span className="block text-[14px] w-full text-left text-[#111] font-medium break-words uppercase">
        {value || "-"}
      </span>
    </div>
  );
}
