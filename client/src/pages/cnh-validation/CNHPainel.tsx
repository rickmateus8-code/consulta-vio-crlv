import { useState } from "react";
import { useLocation } from "wouter";
import { ErrorState, LoadingState, formatCpf, queryCpf, useCnhRecord } from "./shared";
import { Menu, Bell, User, Car, ShieldAlert, GraduationCap, Mail, Shield, FileText, Smile, Settings, BookOpen, HelpCircle, Info, LogOut, X } from "lucide-react";

export default function CNHPainel() {
  const [, setLocation] = useLocation();
  const cpf = queryCpf();
  const { record, loading, error } = useCnhRecord(cpf);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f5f8] flex flex-col justify-center items-center">
        <LoadingState label="Carregando Carteira Digital de Trânsito..." />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-[#f3f5f8]">
        <ErrorState message={error || "CNH não encontrada para o CPF informado."} />
      </div>
    );
  }

  const formattedCpf = formatCpf(record.cpf || cpf);
  const nomeCondutor = (record.nome || "Condutor").toUpperCase();

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-slate-900 flex flex-col relative overflow-x-hidden">
      {/* --- TOP HEADER BAR --- */}
      <header className="bg-[#002554] text-white h-14 px-4 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded-lg hover:bg-white/10 transition text-white"
            aria-label="Abrir Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-base tracking-wide">CNH do Brasil</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-1 rounded-full hover:bg-white/10 transition text-white">
            <Bell className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center font-bold text-xs bg-white/10">
            {nomeCondutor.slice(0, 1)}
          </div>
        </div>
      </header>

      {/* --- SIDEBAR MENU (SLIDE-OVER FROM LEFT - IMAGEM 05) --- */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Sidebar Drawer */}
          <aside className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Sidebar Header */}
            <div className="p-5 border-b border-slate-100 flex flex-col gap-3 relative">
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <img
                  src="/img/logo_cnh.png"
                  onError={(e) => {
                    e.currentTarget.src = "/assets/govbr-logo.png";
                  }}
                  alt="CNH do Brasil"
                  className="h-8 w-auto object-contain"
                />
              </div>

              <div className="mt-1">
                <div className="font-bold text-sm text-slate-900 tracking-tight uppercase leading-snug">
                  {nomeCondutor}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  {formattedCpf}
                </div>
              </div>
            </div>

            {/* Sidebar Links List */}
            <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                <Mail className="w-4 h-4 text-slate-500 mr-3" />
                <span>Central de Mensagens</span>
              </button>

              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                <Shield className="w-4 h-4 text-slate-500 mr-3" />
                <span>Política de Privacidade</span>
              </button>

              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                <FileText className="w-4 h-4 text-slate-500 mr-3" />
                <span>Termo de Responsabilidade</span>
              </button>

              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                <Smile className="w-4 h-4 text-slate-500 mr-3" />
                <span>Avaliar</span>
              </button>

              <div className="my-2 border-t border-slate-100" />

              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                <Settings className="w-4 h-4 text-slate-500 mr-3" />
                <span>Preferências</span>
              </button>

              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                <BookOpen className="w-4 h-4 text-slate-500 mr-3" />
                <span>Tutorial</span>
              </button>

              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                <HelpCircle className="w-4 h-4 text-slate-500 mr-3" />
                <span>Assistente Virtual</span>
              </button>

              <button
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                <Info className="w-4 h-4 text-slate-500 mr-3" />
                <span>Sobre a CNH do Brasil</span>
              </button>

              <div className="my-2 border-t border-slate-100" />

              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setLocation("/");
                }}
                className="w-full flex items-center px-3 py-2.5 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4 text-red-600 mr-3" />
                <span>Sair da conta</span>
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* --- MAIN SYSTEM ACCESS CONTENT --- */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full py-8">
        {/* 4 FEATURE CARDS STACK */}
        <div className="w-full space-y-4">

          {/* CARD 1: CONDUTOR (GREEN) */}
          <button
            onClick={() => setLocation(`/condutor?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
            className="w-full rounded-2xl p-5 text-white flex items-center justify-between shadow-md hover:shadow-lg transition transform active:scale-[0.99] text-left"
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
              <Car className="w-9 h-9 text-white" />
            </div>
          </button>

          {/* CARD 2: VEÍCULOS (YELLOW) */}
          <button
            className="w-full rounded-2xl p-5 text-slate-950 flex items-center justify-between shadow-md hover:shadow-lg transition transform active:scale-[0.99] text-left"
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
              <Car className="w-9 h-9 text-slate-950" />
            </div>
          </button>

          {/* CARD 3: INFRAÇÕES (NAVY/PURPLE) */}
          <button
            className="w-full rounded-2xl p-5 text-white flex items-center justify-between shadow-md hover:shadow-lg transition transform active:scale-[0.99] text-left"
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
              <ShieldAlert className="w-9 h-9 text-white" />
            </div>
          </button>

          {/* CARD 4: EDUCAÇÃO (LIGHT BLUE) */}
          <button
            className="w-full rounded-2xl p-5 text-white flex items-center justify-between shadow-md hover:shadow-lg transition transform active:scale-[0.99] text-left"
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
              <GraduationCap className="w-9 h-9 text-white" />
            </div>
          </button>

        </div>

        {/* --- BOTTOM LOGOS FOOTER --- */}
        <div className="mt-12 flex items-center justify-center gap-6 opacity-80 py-4">
          <div className="flex items-center gap-1 text-xs font-bold text-[#002554]">
            <span className="w-3 h-3 rounded-full bg-[#005CA9] inline-block" />
            Serpro
          </div>
          <div className="text-xs font-bold text-[#002554]">
            CNH do <span className="text-[#f5a623]">BRASIL</span>
          </div>
          <div className="text-[10px] font-bold text-slate-700 tracking-tighter uppercase flex items-center gap-1">
            MINISTÉRIO DOS TRANSPORTES
            <span className="text-[10px]">🇧🇷</span>
          </div>
        </div>
      </main>
    </div>
  );
}
