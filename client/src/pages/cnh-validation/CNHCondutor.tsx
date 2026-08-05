import { useState } from "react";
import { useLocation } from "wouter";
import { DataField, ErrorState, LoadingState, formatCpf, formatDate, queryCpf, useCnhRecord } from "./shared";
import CNHDocument from "@/components/CNHDocument";
import { Menu, Bell, ArrowLeft, Mail, Shield, FileText, Smile, Settings, BookOpen, HelpCircle, Info, LogOut, X } from "lucide-react";

export default function CNHCondutor() {
  const [, setLocation] = useLocation();
  const cpf = queryCpf();
  const { record, loading, error } = useCnhRecord(cpf);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <LoadingState label="Carregando dados do condutor..." />
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-[#f0f2f5]">
        <ErrorState message={error || "CNH não encontrada."} />
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
          <button
            onClick={() => setLocation(`/painel?cpf=${encodeURIComponent(record.cpf || cpf)}`)}
            className="flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Condutor</span>
          </button>
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

      {/* --- SIDEBAR MENU (SLIDE-OVER FROM LEFT) --- */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="p-5 border-b border-slate-100 flex flex-col gap-3 relative">
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
                className="h-8 w-auto object-contain"
              />
              <div className="mt-1">
                <div className="font-bold text-sm text-slate-900 tracking-tight uppercase leading-snug">
                  {nomeCondutor}
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-0.5">
                  {formattedCpf}
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
              <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition">
                <Mail className="w-4 h-4 text-slate-500 mr-3" />
                <span>Central de Mensagens</span>
              </button>
              <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition">
                <Shield className="w-4 h-4 text-slate-500 mr-3" />
                <span>Política de Privacidade</span>
              </button>
              <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition">
                <FileText className="w-4 h-4 text-slate-500 mr-3" />
                <span>Termo de Responsabilidade</span>
              </button>
              <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition">
                <Smile className="w-4 h-4 text-slate-500 mr-3" />
                <span>Avaliar</span>
              </button>
              <div className="my-2 border-t border-slate-100" />
              <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition">
                <Settings className="w-4 h-4 text-slate-500 mr-3" />
                <span>Preferências</span>
              </button>
              <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition">
                <BookOpen className="w-4 h-4 text-slate-500 mr-3" />
                <span>Tutorial</span>
              </button>
              <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition">
                <HelpCircle className="w-4 h-4 text-slate-500 mr-3" />
                <span>Assistente Virtual</span>
              </button>
              <button onClick={() => setSidebarOpen(false)} className="w-full flex items-center px-3 py-2.5 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition">
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

      {/* --- CONTENT --- */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shrink-0">
              {record.fotoUrl ? (
                <img src={record.fotoUrl} alt={record.nome || "Condutor"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] uppercase font-bold text-slate-400">Sem foto</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Condutor</p>
              <h1 className="mt-1 text-xl font-extrabold text-slate-900 leading-tight">{record.nome || "Não informado"}</h1>
              <p className="mt-1 text-xs font-semibold text-slate-500">CPF {formattedCpf}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <DataField label="RG" value={record.rg} />
            <DataField label="Data de nascimento" value={formatDate(record.dataNascimento)} />
            <DataField label="Nacionalidade" value={record.nacionalidade} />
            <DataField label="Local de nascimento" value={[record.localNascimento, record.ufNascimento].filter(Boolean).join("/")} />
            <DataField label="Nome da mãe" value={record.nomeMae} />
            <DataField label="Nome do pai" value={record.nomePai} />
            <DataField label="Órgão emissor" value={[record.orgaoEmissor, record.ufRG].filter(Boolean).join("/")} />
            {(record.assDigital2 || record.renach) && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-semibold uppercase">RENACH</span>
                  <span className="text-slate-900 font-mono font-bold text-sm">{record.assDigital2 || record.renach}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
