import { useState } from "react";
import { useLocation } from "wouter";
import { ErrorState, LoadingState, formatCpf, queryCpf, useCnhRecord } from "./shared";
import { Menu, Bell, Mail, UserCheck, FileText, Smile, Settings, BookOpen, HelpCircle, Info, LogOut, X, Car, ShieldAlert, GraduationCap } from "lucide-react";

export default function CNHPainel() {
  const [, setLocation] = useLocation();
  const cpf = queryCpf();
  const { record, loading, error } = useCnhRecord(cpf);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalMsg, setModalMsg] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex flex-col justify-center items-center font-sans">
        <LoadingState label="Consultando painel da CNH digital..." />
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
  const fullNome = (record.nome || "Condutor").toUpperCase();
  const inicial = fullNome.trim().charAt(0) || "C";

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#333] flex flex-col relative overflow-x-hidden font-sans">
      {/* --- OVERLAY BACKDROP --- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[1000] transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- SIDEBAR MENU (SLIDE-OVER FROM LEFT) --- */}
      <aside
        className={`fixed top-0 left-0 w-[85%] max-w-[320px] bg-white h-full shadow-2xl flex flex-col z-[1001] transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pt-10 px-5 pb-4 border-b border-slate-100 flex flex-col relative bg-white">
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
          <img src="/img/logo_cnh.png" alt="CNH do Brasil" className="w-[110px] mb-3 object-contain" />
          <div className="font-bold text-[16px] text-[#002e6e] tracking-tight uppercase">
            {fullNome}
          </div>
          <div className="text-[13px] text-[#8e8e93] font-medium mt-0.5">
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
              <UserCheck className="w-5 h-5 text-[#4b4b4b] mr-4 shrink-0" />
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
              className="w-full flex items-center px-5 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 text-red-600 mr-4 shrink-0" />
              <span>Sair da conta</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* --- TOP NAVBAR --- */}
      <header className="bg-[#002e6e] text-white p-4 pt-8 shadow-md z-10 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 hover:bg-white/10 rounded-lg transition text-white"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6 text-white cursor-pointer" />
          </button>
          <span className="font-semibold text-base tracking-wide text-white">
            CNH do Brasil
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Bell className="w-5 h-5 text-white cursor-pointer" />
          <div className="w-8 h-8 rounded-full border border-white/80 flex items-center justify-center text-sm font-bold cursor-pointer text-white uppercase">
            {inicial}
          </div>
        </div>
      </header>

      {/* --- MAIN APP CARDS CONTENT --- */}
      <main className="flex-1 w-full max-w-[600px] mx-auto p-4 py-5 space-y-4">
        {/* CARD 1: CONDUTOR (GREEN) */}
        <button
          onClick={() => setLocation(`/condutor?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
          className="w-full h-[110px] rounded-2xl shadow-md transition transform active:scale-[0.98] text-left p-5 text-white flex items-center justify-between cursor-pointer"
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
          <div className="p-2.5 bg-white/10 rounded-xl">
            <Car className="w-8 h-8 text-white" />
          </div>
        </button>

        {/* CARD 2: VEÍCULOS (YELLOW) */}
        <button
          onClick={() => setLocation(`/condutor?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
          className="w-full h-[110px] rounded-2xl shadow-md transition transform active:scale-[0.98] text-left p-5 text-slate-950 flex items-center justify-between cursor-pointer"
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
          <div className="p-2.5 bg-black/10 rounded-xl">
            <Car className="w-8 h-8 text-slate-950" />
          </div>
        </button>

        {/* CARD 3: INFRAÇÕES (NAVY) */}
        <button
          onClick={() => setModalMsg("É necessário baixar sua CNH-e antes de verificar as infrações")}
          className="w-full h-[110px] rounded-2xl shadow-md transition transform active:scale-[0.98] text-left p-5 text-white flex items-center justify-between cursor-pointer"
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
          <div className="p-2.5 bg-white/10 rounded-xl">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
        </button>

        {/* CARD 4: EDUCAÇÃO (LIGHT BLUE) */}
        <button
          onClick={() => setModalMsg("É necessário baixar sua CNH-e antes de verificar os cursos de educação")}
          className="w-full h-[110px] rounded-2xl shadow-md transition transform active:scale-[0.98] text-left p-5 text-white flex items-center justify-between cursor-pointer"
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
          <div className="p-2.5 bg-white/10 rounded-xl">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
        </button>
      </main>

      {/* --- FOOTER LOGOS --- */}
      <footer className="w-full max-w-[600px] mx-auto px-4 py-6 flex items-center justify-between gap-2 bg-[#f5f7fa]">
        <div className="shrink-0">
          <img src="/img/logo_serpro.png" onError={(e) => { e.currentTarget.style.display = 'none'; }} alt="Serpro" className="w-[75px] h-auto block" />
        </div>
        <div className="text-[#001b3a] text-xs font-normal whitespace-nowrap">
          CNH do <strong className="text-black font-extrabold">BRASIL</strong>
        </div>
        <div className="flex items-center justify-end gap-1 shrink-0">
          <img src="/img/logo_transportes.png" onError={(e) => { e.currentTarget.style.display = 'none'; }} alt="Ministério dos Transportes" className="w-[85px] h-auto block" />
          <span className="text-base">🇧🇷</span>
        </div>
      </footer>

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

