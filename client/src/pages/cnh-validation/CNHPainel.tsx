import { useState } from "react";
import { useLocation } from "wouter";
import { ErrorState, LoadingState, formatCpf, queryCpf, useCnhRecord } from "./shared";
import {
  Menu,
  Bell,
  Mail,
  Shield,
  FileText,
  Smile,
  Settings,
  BookOpen,
  HelpCircle,Info,
  LogOut,
  X
} from "lucide-react";

export default function CNHPainel() {
  const [, setLocation] = useLocation();
  const cpf = queryCpf();
  const { record, loading, error } = useCnhRecord(cpf);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex flex-col justify-center items-center">
        <LoadingState label="Carregando CNH Digital..." />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-[#f5f7fa]">
        <ErrorState message={error || "CNH não encontrada para o CPF informado."} />
      </div>
    );
  }

  const formattedCpf = formatCpf(record.cpf || cpf);
  const nomeCondutor = (record.nome || "Condutor").toUpperCase();

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900 flex flex-col relative overflow-x-hidden font-sans">
      {/* --- OVERLAY BACKDROP --- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[1000] transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR MENU (100% faithful) --- */}
      <aside
        className={`fixed top-0 left-0 w-[85%] max-w-[320px] bg-white h-full shadow-2xl flex flex-col z-[1001] transition-all duration-300 overflow-y-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pt-10 px-5 pb-4 border-b border-slate-100 flex flex-col relative">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src="/img/logo_cnh.png"
            onError={(e) => {
              e.currentTarget.src = "/assets/govbr-logo.png";
            }}
            alt="CNH do Brasil"
            className="w-[110px] h-auto mb-4 object-contain"
          />
          <div className="text-[#002e6e] font-bold text-base mb-1 tracking-tight uppercase">
            {nomeCondutor}
          </div>
          <div className="text-xs font-semibold text-[#8e8e93]">
            {formattedCpf}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto">
          <div className="border-b border-slate-100 py-1">
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <Mail className="w-5 h-5 text-[#4b4b4b] mr-4 shrink-0" />
              <span>Central de Mensagens</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <Shield className="w-5 h-5 text-[#4b4b4b] mr-4 shrink-0" />
              <span>Política de Privacidade</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <FileText className="w-5 h-5 text-[#4b4b4b] mr-4 shrink-0" />
              <span>Termo de Responsabilidade</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <Smile className="w-5 h-5 text-[#4b4b4b] mr-4 shrink-0" />
              <span>Avaliar</span>
            </button>
          </div>

          <div className="border-b border-slate-100 py-1">
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <Settings className="w-5 h-5 text-[#4b4b4b] mr-4 shrink-0" />
              <span>Preferências</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <BookOpen className="w-5 h-5 text-[#4b4b4b] mr-4 shrink-0" />
              <span>Tutorial</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <HelpCircle className="w-5 h-5 text-[#4b4b4b] mr-4 shrink-0" />
              <span>Assistente Virtual</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <Info className="w-5 h-5 text-[#4b4b4b] mr-4 shrink-0" />
              <span>Sobre a CNH do Brasil</span>
            </button>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setSidebarOpen(false);
                setLocation("/");
              }}
              className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50"
            >
              <LogOut className="w-5 h-5 text-[#4b4b4b] mr-4 shrink-0" />
              <span>Sair da conta</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* --- NAVBAR --- */}
      <header className="bg-[#002e6e] text-white pt-10 pb-3 px-5 flex items-center shadow-md sticky top-0 z-[900]">
        <button
          onClick={() => setSidebarOpen(true)}
          className="bg-none border-none text-white text-2xl cursor-pointer p-0 mr-1"
          aria-label="Abrir Menu"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>
        <span className="font-semibold text-base flex-grow ml-3 text-white">CNH do Brasil</span>
        <div className="flex items-center gap-5">
          <Bell className="w-5.5 h-5.5 text-white cursor-pointer" />
          <div className="w-8 h-8 rounded-full border-[1.5px] border-white/80 flex items-center justify-center font-bold text-sm leading-none bg-white/10 text-white uppercase">
            {nomeCondutor.slice(0, 1)}
          </div>
        </div>
      </header>

      {/* --- APP CONTENT --- */}
      <main className="px-4 py-5 flex-grow w-full max-w-[600px] mx-auto">
        {/* CARD 1: CONDUTOR */}
        <button
          onClick={() => setLocation(`/condutor?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
          className="w-full h-[110px] rounded-2xl mb-4 shadow-md transition transform active:scale-[0.98] text-left p-5 text-white flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, #00a859 0%, #008543 100%)",
          }}
        >
          <div>
            <div className="text-xl font-extrabold tracking-tight uppercase">CONDUTOR</div>
            <div className="text-xs font-medium text-emerald-100 mt-1">
              Gerencie sua habilitação
            </div>
          </div>
        </button>

        {/* CARD 2: VEÍCULOS */}
        <button
          onClick={() => setLocation(`/condutor?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
          className="w-full h-[110px] rounded-2xl mb-4 shadow-md transition transform active:scale-[0.98] text-left p-5 text-slate-950 flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, #f5a623 0%, #e09010 100%)",
          }}
        >
          <div>
            <div className="text-xl font-extrabold tracking-tight uppercase">VEÍCULOS</div>
            <div className="text-xs font-medium text-slate-900/80 mt-1">
              Acesso ao CRLV-e, venda digital
            </div>
          </div>
        </button>

        {/* CARD 3: INFRAÇÕES */}
        <button
          className="w-full h-[110px] rounded-2xl mb-4 shadow-md transition transform active:scale-[0.98] text-left p-5 text-white flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, #203468 0%, #132247 100%)",
          }}
        >
          <div>
            <div className="text-xl font-extrabold tracking-tight uppercase">INFRAÇÕES</div>
            <div className="text-xs font-medium text-blue-200 mt-1">
              Visualize e pague infrações com até 40% de desconto
            </div>
          </div>
        </button>

        {/* CARD 4: EDUCAÇÃO */}
        <button
          className="w-full h-[110px] rounded-2xl mb-4 shadow-md transition transform active:scale-[0.98] text-left p-5 text-white flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, #4aa0e6 0%, #2980b9 100%)",
          }}
        >
          <div>
            <div className="text-xl font-extrabold tracking-tight uppercase">EDUCAÇÃO</div>
            <div className="text-xs font-medium text-sky-100 mt-1">
              Conheça nossa plataforma de cursos
            </div>
          </div>
        </button>
      </main>

      {/* --- FOOTER LOGOS --- */}
      <footer className="w-full max-w-[600px] mx-auto px-4 pt-4 pb-7 flex items-center justify-between gap-2 bg-[#f5f7fa]">
        <div className="shrink-0">
          <img src="/img/logo_serpro.png" onError={(e) => { e.currentTarget.style.display = 'none'; }} alt="Serpro" className="w-[70px] sm:w-[90px] h-auto block" />
        </div>
        <div className="text-[#001b3a] text-xs sm:text-sm font-normal whitespace-nowrap">
          CNH do <strong className="text-black font-extrabold">BRASIL</strong>
        </div>
        <div className="flex items-center justify-end gap-1.5 shrink-0">
          <img src="/img/logo_transportes.png" onError={(e) => { e.currentTarget.style.display = 'none'; }} alt="Ministério dos Transportes" className="w-[80px] sm:w-[100px] h-auto block" />
          <span className="text-base">🇧🇷</span>
        </div>
      </footer>
    </div>
  );
}
