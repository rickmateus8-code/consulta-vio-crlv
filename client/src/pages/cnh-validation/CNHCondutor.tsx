import { useState } from "react";
import { useLocation } from "wouter";
import { ErrorState, LoadingState, formatCpf, formatDate, queryCpf, useCnhRecord } from "./shared";
import { ChevronLeft, Contact, UserCheck, Microscope, GraduationCap } from "lucide-react";

export default function CNHCondutor() {
  const [, setLocation] = useLocation();
  const cpf = queryCpf();
  const { record, loading, error } = useCnhRecord(cpf);
  const [modalMsg, setModalMsg] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex flex-col justify-center items-center font-sans">
        <LoadingState label="Carregando informações do condutor..." />
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

  const formattedCpf = formatCpf(record.cpf || cpf);
  const nomeCondutor = (record.nome || "Não informado").toUpperCase();

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#333] flex flex-col relative overflow-x-hidden font-sans">
      {/* --- TOP NAVBAR --- */}
      <header className="bg-[#002e6e] text-white p-4 pt-10 flex items-center gap-4 sticky top-0 z-[100] shadow-sm">
        <button
          onClick={() => setLocation(`/painel?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
          className="bg-white/15 rounded-full w-8 h-8 flex items-center justify-center text-white hover:bg-white/30 transition cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <span className="font-bold text-base tracking-wide uppercase text-white">CONDUTOR</span>
      </header>

      {/* --- CONDUTOR INFO CARD CONTAINER --- */}
      <div className="p-4 w-full max-w-[600px] mx-auto">
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="text-[#4a4a4a] font-bold text-base pb-2.5 mb-4 border-b border-gray-100">
            Informações do Condutor
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <div className="text-[#333] font-bold text-[11px] uppercase mb-1">Nome</div>
              <div className="text-[#555] font-medium text-sm break-words">{nomeCondutor}</div>
            </div>
            <div>
              <div className="text-[#333] font-bold text-[11px] uppercase mb-1">CPF</div>
              <div className="text-[#555] font-medium text-sm">{formattedCpf}</div>
            </div>
            <div>
              <div className="text-[#333] font-bold text-[11px] uppercase mb-1">Sexo</div>
              <div className="text-[#555] font-medium text-sm">{record.sexo || "MASCULINO"}</div>
            </div>
            <div>
              <div className="text-[#333] font-bold text-[11px] uppercase mb-1">Categoria</div>
              <div className="text-[#555] font-medium text-sm">{record.categoria || "AB"}</div>
            </div>
            <div>
              <div className="text-[#333] font-bold text-[11px] uppercase mb-1">UF de Emissão</div>
              <div className="text-[#555] font-medium text-sm">{record.ufEmissao || "DF"}</div>
            </div>
            <div>
              <div className="text-[#333] font-bold text-[11px] uppercase mb-1">Data de Validade</div>
              <div className="text-[#555] font-medium text-sm">{formatDate(record.validade)}</div>
            </div>
            <div>
              <div className="text-[#333] font-bold text-[11px] uppercase mb-1">Data de Emissão</div>
              <div className="text-[#555] font-medium text-sm">{formatDate(record.dataEmissao)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MENU GRID BUTTONS --- */}
      <div className="grid grid-cols-2 gap-3 px-4 pb-8 w-full max-w-[600px] mx-auto">
        <button
          onClick={() => setLocation(`/habilitacao?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
          className="bg-white rounded-xl h-[90px] flex flex-col items-center justify-center p-2.5 shadow-xs text-[#002e6e] font-bold text-[10px] uppercase cursor-pointer hover:bg-slate-50 transition active:scale-[0.98]"
        >
          <Contact className="w-6 h-6 text-[#002e6e] mb-2" />
          <span>Habilitação</span>
        </button>

        <button
          onClick={() => setModalMsg("É necessário baixar sua CNH-e antes de verificar o cadastro positivo")}
          className="bg-white rounded-xl h-[90px] flex flex-col items-center justify-center p-2.5 shadow-xs text-[#002e6e] font-bold text-[10px] uppercase cursor-pointer hover:bg-slate-50 transition active:scale-[0.98]"
        >
          <UserCheck className="w-6 h-6 text-[#002e6e] mb-2" />
          <span>Cadastro Positivo</span>
        </button>

        <button
          onClick={() => setModalMsg("É necessário baixar sua CNH-e antes de verificar os exames toxicológicos")}
          className="bg-white rounded-xl h-[90px] flex flex-col items-center justify-center p-2.5 shadow-xs text-[#002e6e] font-bold text-[10px] uppercase cursor-pointer hover:bg-slate-50 transition active:scale-[0.98]"
        >
          <Microscope className="w-6 h-6 text-[#002e6e] mb-2" />
          <span>Exames Toxicológicos</span>
        </button>

        <button
          onClick={() => setModalMsg("É necessário baixar sua CNH-e antes de verificar os cursos especializados")}
          className="bg-white rounded-xl h-[90px] flex flex-col items-center justify-center p-2.5 shadow-xs text-[#002e6e] font-bold text-[10px] uppercase cursor-pointer hover:bg-slate-50 transition active:scale-[0.98]"
        >
          <GraduationCap className="w-6 h-6 text-[#002e6e] mb-2" />
          <span>Cursos Especializados</span>
        </button>

        <button
          onClick={() => setLocation(`/habilitacao?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
          className="bg-white rounded-xl h-[90px] flex flex-col items-center justify-center p-2.5 shadow-xs text-[#002e6e] font-bold text-[10px] uppercase cursor-pointer hover:bg-slate-50 transition active:scale-[0.98]"
        >
          <div className="border-2 border-[#002e6e] rounded-full w-6 h-6 flex items-center justify-center text-xs font-extrabold text-[#002e6e] mb-2">
            E
          </div>
          <span className="text-center leading-tight">Credencial de<br />Estacionamento</span>
        </button>
      </div>

      {/* --- MODAL WARNING OVERLAY --- */}
      {modalMsg && (
        <div className="fixed inset-0 bg-black/60 z-[3000] flex items-center justify-center p-4 backdrop-blur-[2px]">
          <div className="bg-white w-[85%] max-w-[320px] rounded-[20px] p-6 text-center shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-[#ffcc00] text-[#333] font-bold text-2xl flex items-center justify-center mx-auto mb-4">
              !
            </div>
            <p className="text-[#002e6e] text-sm font-semibold leading-relaxed mb-6">
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

