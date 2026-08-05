import { useState } from "react";
import { useLocation } from "wouter";
import { ErrorState, LoadingState, formatCpf, queryCpf, useCnhRecord } from "./shared";
import { Menu, Bell, Mail, Shield, FileText, Smile, Settings, BookOpen, HelpCircle, Info, LogOut, X } from "lucide-react";

export default function CNHPainel() {
  const [, setLocation] = useLocation();
  const cpf = queryCpf();
  const { record, loading, error } = useCnhRecord(cpf);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e9ecf2] flex flex-col justify-center items-center">
        <LoadingState label="Carregando CNH Digital..." />
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
  const fullNome = (record.nome || "Condutor").toUpperCase();
  const primeiroNome = fullNome.split(" ")[0] || "CONDUTOR";
  const inicial = primeiroNome.charAt(0) || "C";

  return (
    <div className="min-h-screen bg-[#e9ecf2] text-slate-900 flex flex-col relative overflow-x-hidden font-sans max-w-[450px] mx-auto shadow-2xl">
      {/* --- OVERLAY BACKDROP --- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[1000] transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR MENU (SLIDE-OVER FROM LEFT) --- */}
      <aside
        className={`fixed top-0 left-0 w-[85%] max-w-[320px] bg-white h-full shadow-2xl flex flex-col z-[1001] transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pt-8 px-5 pb-4 border-b border-slate-100 flex flex-col relative bg-[#0a1c40] text-white">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full border border-white flex items-center justify-center text-lg font-light bg-white/10 text-white uppercase">
              {inicial}
            </div>
            <div>
              <div className="font-bold text-sm text-white tracking-wide uppercase">
                {fullNome}
              </div>
              <div className="text-xs text-gray-300">
                {formattedCpf}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto">
          <div className="border-b border-slate-100 py-1">
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <Mail className="w-5 h-5 text-[#0a1c40] mr-4 shrink-0" />
              <span>Central de Mensagens</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <Shield className="w-5 h-5 text-[#0a1c40] mr-4 shrink-0" />
              <span>Política de Privacidade</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <FileText className="w-5 h-5 text-[#0a1c40] mr-4 shrink-0" />
              <span>Termo de Responsabilidade</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <Smile className="w-5 h-5 text-[#0a1c40] mr-4 shrink-0" />
              <span>Avaliar</span>
            </button>
          </div>

          <div className="border-b border-slate-100 py-1">
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <Settings className="w-5 h-5 text-[#0a1c40] mr-4 shrink-0" />
              <span>Preferências</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <BookOpen className="w-5 h-5 text-[#0a1c40] mr-4 shrink-0" />
              <span>Tutorial</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <HelpCircle className="w-5 h-5 text-[#0a1c40] mr-4 shrink-0" />
              <span>Assistente Virtual</span>
            </button>
            <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-5 py-3.5 text-sm font-medium text-[#444] hover:bg-slate-50">
              <Info className="w-5 h-5 text-[#0a1c40] mr-4 shrink-0" />
              <span>Sobre a CNH do Brasil</span>
            </button>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setSidebarOpen(false);
                setLocation("/");
              }}
              className="w-full flex items-center px-5 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 text-red-600 mr-4 shrink-0" />
              <span>Sair da conta</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* --- TOP NAVBAR --- */}
      <header className="bg-[#0a1c40] text-white p-4 pb-5 rounded-b-[20px] shadow-md z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 hover:bg-white/10 rounded-lg transition"
            aria-label="Menu"
          >
            <Menu className="w-7 h-7 text-white cursor-pointer" />
          </button>
          <h1 className="font-semibold text-lg tracking-wide uppercase text-white">
            {primeiroNome}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="w-6 h-6 text-white fill-current cursor-pointer" />
          <div className="w-9 h-9 rounded-full border border-white flex items-center justify-center text-base font-light cursor-pointer text-white">
            {inicial}
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT (4 CARDS) --- */}
      <main className="flex-1 w-full pt-6 px-4 space-y-4 flex flex-col overflow-y-auto pb-4">
        {/* CARD 1: CONDUTOR */}
        <div
          onClick={() => setLocation(`/condutor?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
          className="cursor-pointer transform transition active:scale-[0.98]"
        >
          <img src="/img/IMG_CONDUTOR.png" alt="Botão Condutor" className="w-full h-auto block rounded-2xl shadow-sm" />
        </div>

        {/* CARD 2: VEÍCULOS */}
        <div className="cursor-pointer transform transition active:scale-[0.98]">
          <img src="/img/IMG_VEICULOS.png" alt="Botão Veículos" className="w-full h-auto block rounded-2xl shadow-sm" />
        </div>

        {/* CARD 3: INFRAÇÕES */}
        <div className="cursor-pointer transform transition active:scale-[0.98]">
          <img src="/img/IMG_INFRACOES.png" alt="Botão Infrações" className="w-full h-auto block rounded-2xl shadow-sm" />
        </div>

        {/* CARD 4: EDUCAÇÃO */}
        <div className="cursor-pointer transform transition active:scale-[0.98]">
          <img src="/img/IMG_EDUCACAO.png" alt="Botão Educação" className="w-full h-auto block rounded-2xl shadow-sm" />
        </div>
      </main>

      {/* --- FOOTER LOGOS --- */}
      <footer className="flex items-center justify-center px-4 py-6 mt-auto bg-[#e9ecf2]">
        <img src="/img/IMG_2339.png" alt="Logos Governamentais" className="h-20 w-auto object-contain" />
      </footer>
    </div>
  );
}

