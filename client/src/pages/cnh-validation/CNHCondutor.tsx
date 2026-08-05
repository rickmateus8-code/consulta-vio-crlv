import { useLocation } from "wouter";
import { ErrorState, LoadingState, formatCpf, formatDate, queryCpf, useCnhRecord } from "./shared";
import { ChevronLeft, Contact, UserPlus, Microscope, BookOpen } from "lucide-react";

export default function CNHCondutor() {
  const [, setLocation] = useLocation();
  const cpf = queryCpf();
  const { record, loading, error } = useCnhRecord(cpf);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e9ecf2] flex flex-col justify-center items-center">
        <LoadingState label="Carregando informações do condutor..." />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-[#e9ecf2]">
        <ErrorState message={error || "CNH não encontrada."} />
      </div>
    );
  }

  const formattedCpf = formatCpf(record.cpf || cpf);
  const nomeCondutor = (record.nome || "Não informado").toUpperCase();

  return (
    <div className="min-h-screen bg-[#e9ecf2] text-slate-900 flex flex-col relative overflow-x-hidden font-sans max-w-[450px] mx-auto shadow-2xl">
      {/* --- TOP HEADER --- */}
      <div className="bg-[#0a1c40] text-white p-4 pb-5 rounded-b-[20px] shadow-md z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation(`/painel?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
            className="bg-[#2a4570] p-1.5 rounded-full hover:bg-opacity-80 transition flex items-center justify-center w-9 h-9"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="font-bold text-base tracking-wide uppercase text-white">CONDUTOR</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-8 no-scrollbar">
        {/* --- YELLOW PERMISSÃO BANNER --- */}
        <div className="bg-[#ffcc00] mx-4 mt-4 p-3 rounded-xl flex items-center gap-3 shadow-sm">
          <div className="bg-[#0a1c40] min-w-[28px] h-7 rounded-full flex items-center justify-center">
            <span className="text-[#ffcc00] font-bold text-lg leading-none">!</span>
          </div>
          <p className="text-[#0a1c40] font-bold text-sm leading-tight">
            Você está no período de Permissão para Dirigir. Toque para saber mais.
          </p>
        </div>

        {/* --- WHITE INFO CARD --- */}
        <div className="bg-white mx-4 mt-4 p-5 rounded-[1.25rem] shadow-sm relative">
          {/* BADGE BOM CONDUTOR */}
          <div className="absolute top-4 right-4 flex flex-col items-center justify-center w-14 h-14">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm absolute">
              <path d="M50 2 L60 18 L78 15 L82 32 L98 40 L90 55 L98 70 L82 78 L78 95 L60 92 L50 108 L40 92 L22 95 L18 78 L2 70 L10 55 L2 40 L18 32 L22 15 L40 18 Z" fill="#00c853" />
              <path d="M50 8 L58 21 L73 19 L76 33 L89 40 L83 55 L89 70 L76 77 L73 91 L58 89 L50 102 L42 89 L27 91 L24 77 L11 70 L17 55 L11 40 L24 33 L27 19 L42 21 Z" fill="#00e676" />
            </svg>
            <div className="relative z-10 text-center flex flex-col items-center mt-1">
              <span className="text-white font-bold text-[5px] leading-none uppercase">Selo</span>
              <span className="text-white font-black text-[10px] leading-none">BOM</span>
              <span className="text-white font-bold text-[5px] leading-none uppercase">Condutor</span>
            </div>
          </div>

          <h2 className="text-[#333] font-bold text-base mb-3 pb-2 border-b border-gray-100 pr-16">
            Informações do Condutor
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-gray-800 font-bold text-xs mb-0.5">Nome</p>
              <p className="text-gray-500 font-normal text-sm">{nomeCondutor}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-800 font-bold text-xs mb-0.5">CPF</p>
                <p className="text-gray-500 font-normal text-sm">{formattedCpf}</p>
              </div>
              <div>
                <p className="text-gray-800 font-bold text-xs mb-0.5">Sexo</p>
                <p className="text-gray-500 font-normal text-sm">{record.sexo || "MASCULINO"}</p>
              </div>
              <div>
                <p className="text-gray-800 font-bold text-xs mb-0.5">Categoria</p>
                <p className="text-gray-500 font-normal text-sm">{record.categoria || "AB"}</p>
              </div>
              <div>
                <p className="text-gray-800 font-bold text-xs mb-0.5">UF de Emissão</p>
                <p className="text-gray-500 font-normal text-sm">{record.ufEmissao || "DF"}</p>
              </div>
              <div>
                <p className="text-gray-800 font-bold text-xs mb-0.5">Data de Validade</p>
                <p className="text-gray-500 font-normal text-sm">{formatDate(record.validade)}</p>
              </div>
              <div>
                <p className="text-gray-800 font-bold text-xs mb-0.5">Data de Emissão</p>
                <p className="text-gray-500 font-normal text-sm">{formatDate(record.dataEmissao)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- GRID ACTION BUTTONS --- */}
        <div className="grid grid-cols-2 gap-3 px-4 mt-4">
          <button
            onClick={() => setLocation(`/habilitacao?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
            className="bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm min-h-[110px] active:scale-[0.98] transition cursor-pointer"
          >
            <Contact className="w-8 h-8 text-[#0a1c40]" />
            <span className="text-[#0a1c40] font-normal text-xs text-center uppercase">Habilitação</span>
          </button>

          <button className="bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm min-h-[110px] active:scale-[0.98] transition">
            <UserPlus className="w-8 h-8 text-[#0a1c40]" />
            <span className="text-[#0a1c40] font-normal text-xs text-center uppercase">Cadastro Positivo</span>
          </button>

          <button className="bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm min-h-[110px] active:scale-[0.98] transition">
            <Microscope className="w-8 h-8 text-[#0a1c40]" />
            <span className="text-[#0a1c40] font-normal text-xs text-center uppercase">Exames Toxicológicos</span>
          </button>

          <button className="bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm min-h-[110px] active:scale-[0.98] transition">
            <BookOpen className="w-8 h-8 text-[#0a1c40]" />
            <span className="text-[#0a1c40] font-normal text-xs text-center uppercase">Cursos Especializados</span>
          </button>

          <button className="bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-3 shadow-sm min-h-[110px] active:scale-[0.98] transition col-span-1">
            <div className="w-8 h-8 rounded-full border-[2.5px] border-[#0a1c40] flex items-center justify-center">
              <span className="text-[#0a1c40] font-bold text-lg leading-none">E</span>
            </div>
            <span className="text-[#0a1c40] font-normal text-[10px] text-center uppercase leading-tight mt-1">Credencial de Estacionamento</span>
          </button>
        </div>
      </div>
    </div>
  );
}

