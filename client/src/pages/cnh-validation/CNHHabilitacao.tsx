import { useState } from "react";
import { useLocation } from "wouter";
import { ErrorState, LoadingState, queryCpf, useCnhRecord } from "./shared";
import CNH3PartDocument from "@/components/CNH3PartDocument";
import { ChevronLeft, ChevronRight, Contact, FileUp, Trash2, Copy } from "lucide-react";

export default function CNHHabilitacao() {
  const [, setLocation] = useLocation();
  const cpf = queryCpf();
  const { record, loading, error } = useCnhRecord(cpf);
  const [activeSlide, setActiveSlide] = useState<1 | 2 | 3 | 4>(1);
  const [modalMsg, setModalMsg] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex flex-col justify-center items-center font-sans">
        <LoadingState label="Carregando CNH Digital..." />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] font-sans">
        <ErrorState message={error || "CNH não encontrada."} />
      </div>
    );
  }

  const dataAtual = new Date().toLocaleDateString("pt-BR") + " - " + new Date().toLocaleTimeString("pt-BR");

  const slideTitles: Record<number, string> = {
    1: "PARTE SUPERIOR (FRENTE)",
    2: "PARTE INFERIOR (VERSO)",
    3: "CÓDIGO MRZ",
    4: "VALOR QR CODE VIO",
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#333] flex flex-col relative overflow-x-hidden font-sans">
      {/* --- TOP NAVBAR --- */}
      <header className="bg-[#002e6e] text-white p-4 pt-10 flex items-center gap-3 sticky top-0 z-[100] shadow-sm">
        <button
          onClick={() => setLocation(`/condutor?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
          className="text-white hover:opacity-80 transition cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-wide uppercase text-white">HABILITAÇÃO</span>
          <span className="text-xs text-white/80 font-normal">Atualizado em: {dataAtual}</span>
        </div>
      </header>

      {/* --- VIO AUTH BANNER --- */}
      <div className="bg-white py-3 px-4 text-center border-b border-gray-100 text-xs text-[#444] flex items-center justify-between">
        <span className="font-semibold text-[#002e6e]">{slideTitles[activeSlide]}</span>
        <span className="text-[11px] text-[#888]">Lâmina {activeSlide} de 4</span>
      </div>

      {/* --- MAIN CNH DISPLAY & ACTIONS --- */}
      <div className="flex-1 flex flex-col items-center pt-4 overflow-y-auto pb-6 w-full max-w-[600px] mx-auto">
        {/* CAROUSEL SLIDE CONTAINER WITH PREV/NEXT CONTROLS */}
        <div className="w-full max-w-[380px] relative px-2">
          {activeSlide > 1 && (
            <button
              onClick={() => setActiveSlide((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg hover:bg-black/80 transition cursor-pointer"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
          )}

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex justify-center p-2">
            <CNH3PartDocument
              slide={activeSlide}
              nome={record.nome || ""}
              cpf={record.cpf || ""}
              rg={record.rg || ""}
              orgaoEmissor={record.orgaoEmissor || ""}
              ufRG={record.ufRG || ""}
              sexo={record.sexo || ""}
              nacionalidade={record.nacionalidade || "BRASILEIRA"}
              dataNascimento={record.dataNascimento || ""}
              localNascimento={record.localNascimento || ""}
              ufNascimento={record.ufNascimento || ""}
              nomePai={record.nomePai || ""}
              nomeMae={record.nomeMae || ""}
              categoria={record.categoria || ""}
              registro={record.registro || ""}
              espelho={record.espelho || ""}
              validade={record.validade || ""}
              dataEmissao={record.dataEmissao || ""}
              primeiraHabilitacao={record.primeiraHabilitacao || ""}
              localEmissao={record.localEmissao || ""}
              ufEmissao={record.ufEmissao || ""}
              observacoes={record.observacoes || ""}
              fotoUrl={record.fotoUrl || ""}
              assinaturaUrl={record.assinaturaUrl || ""}
              codigoQR={record.codigo_validacao || record.codigo_qr || record.codigoQR || ""}
              previewWidth={350}
            />
          </div>

          {activeSlide < 4 && (
            <button
              onClick={() => setActiveSlide((prev) => (prev + 1) as 1 | 2 | 3 | 4)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg hover:bg-black/80 transition cursor-pointer"
              aria-label="Próximo"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          )}
        </div>

        {/* PAGINATION DOTS */}
        <div className="flex gap-2 my-4">
          {[1, 2, 3, 4].map((num) => (
            <button
              key={num}
              onClick={() => setActiveSlide(num as 1 | 2 | 3 | 4)}
              className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                activeSlide === num ? "bg-[#002e6e] w-6" : "bg-[#d0d4d9]"
              }`}
            />
          ))}
        </div>

        {/* ACTION MENU ITEMS */}
        <div className="w-full px-4 space-y-2.5 pb-8">
          <div
            onClick={() => setModalMsg(`Histórico de emissões da CNH:\nEmitida em ${record.dataEmissao || '-'}\nFormulário: ${record.espelho || record.registro || '-'}`)}
            className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-xs text-[#002e6e] font-bold text-xs cursor-pointer hover:bg-slate-50 transition"
          >
            <Contact className="w-5 h-5 text-[#002e6e] shrink-0" />
            <span>Histórico de emissões da CNH</span>
          </div>

          <div
            onClick={() => {
              const canvas = document.querySelector("canvas");
              if (canvas) {
                const link = document.createElement("a");
                link.download = `CNH_Lamin_${activeSlide}_${(record.nome || "documento").replace(/\s+/g, "_")}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
              }
            }}
            className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-xs text-[#002e6e] font-bold text-xs cursor-pointer hover:bg-slate-50 transition"
          >
            <FileUp className="w-5 h-5 text-[#002e6e] shrink-0" />
            <span>Exportar Lâmina Atual ({activeSlide}/4)</span>
          </div>

          <div
            onClick={() => setLocation("/")}
            className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-xs text-[#002e6e] font-bold text-xs cursor-pointer hover:bg-slate-50 transition"
          >
            <Trash2 className="w-5 h-5 text-[#002e6e] shrink-0" />
            <span>Remover</span>
          </div>

          <div
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(record.codigo_validacao || record.codigo_qr || record.cpf || "");
                alert("Código QR copiado para a área de transferência!");
              }
            }}
            className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-xs text-[#002e6e] font-bold text-xs cursor-pointer hover:bg-slate-50 transition"
          >
            <Copy className="w-5 h-5 text-[#002e6e] shrink-0" />
            <span>Copiar QR Code</span>
          </div>
        </div>
      </div>

      {/* --- MODAL WARNING OVERLAY --- */}
      {modalMsg && (
        <div className="fixed inset-0 bg-black/60 z-[3000] flex items-center justify-center p-4 backdrop-blur-[2px]">
          <div className="bg-white w-[85%] max-w-[320px] rounded-[20px] p-6 text-center shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-[#ffcc00] text-[#333] font-bold text-2xl flex items-center justify-center mx-auto mb-4">
              !
            </div>
            <p className="text-[#002e6e] text-sm font-semibold leading-relaxed mb-6 whitespace-pre-line">
              {modalMsg}
            </p>
            <button
              onClick={() => setModalMsg("")}
              className="w-full py-3.5 bg-[#155bcb] text-white font-bold text-xs rounded-full uppercase tracking-wider"
            >
              ENTENDI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
