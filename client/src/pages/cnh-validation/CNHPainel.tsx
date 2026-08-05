import { useLocation } from "wouter";
import { BottomTabs, ErrorState, GovBrHeader, LoadingState, formatCpf, formatDate, queryCpf, statusLabel, useCnhRecord } from "./shared";

export default function CNHPainel() {
  const [, setLocation] = useLocation();
  const cpf = queryCpf();
  const { record, loading, error } = useCnhRecord(cpf);

  if (loading) {
    return <div className="min-h-screen bg-[#0d1117]"><GovBrHeader /><LoadingState label="Consultando painel da CNH digital..." /></div>;
  }

  if (error || !record) {
    return <div className="min-h-screen bg-[#0d1117]"><GovBrHeader /><ErrorState message={error || "CNH não encontrada."} /></div>;
  }

  const status = statusLabel(record.validade);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <GovBrHeader />
      <div className="mx-auto max-w-md px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#1a1a2e] shadow-2xl shadow-black/30">
          <div className="relative overflow-hidden px-6 pt-6 pb-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(37,99,235,0.18),_transparent_40%)]" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-300">painel do condutor</p>
                  <h1 className="mt-3 text-2xl font-semibold">{record.nome || "Condutor"}</h1>
                  <p className="mt-2 text-sm text-slate-300">CPF {formatCpf(record.cpf)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "Válida" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                  {status}
                </span>
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-emerald-400/15 bg-[#101826] p-5 shadow-lg shadow-black/20">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Carteira Nacional de Habilitação</p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-3xl font-semibold text-emerald-300">{record.categoria || "AB"}</p>
                    <p className="mt-2 text-sm text-slate-300">Registro {record.registro || "Não informado"}</p>
                    <p className="mt-1 text-sm text-slate-300">Validade {formatDate(record.validade)}</p>
                  </div>
                  <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-right">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-200">Categoria</div>
                    <div className="mt-1 text-2xl font-semibold">{record.categoria || "AB"}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => setLocation(`/condutor?cpf=${encodeURIComponent((record.cpf || cpf).replace(/\D/g, ""))}`)}
                  className="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  Ver CNH Digital
                </button>
                <button
                  onClick={() => setLocation(`/habilitacao?cpf=${encodeURIComponent((record.cpf || cpf).replace(/\D/g, ""))}`)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Dados da habilitação
                </button>
              </div>
            </div>
          </div>
        </div>
        <BottomTabs active="condutor" cpf={record.cpf || cpf} />
      </div>
    </div>
  );
}
