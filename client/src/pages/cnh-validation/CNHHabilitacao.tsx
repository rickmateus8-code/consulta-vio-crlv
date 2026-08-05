import { QRCodeSVG } from "qrcode.react";
import { BottomTabs, ErrorState, GovBrHeader, LoadingState, MobileShell, categoryRows, formatDate, queryCpf, statusLabel, useCnhRecord, validationUrl } from "./shared";

export default function CNHHabilitacao() {
  const cpf = queryCpf();
  const { record, loading, error } = useCnhRecord(cpf);

  if (loading) {
    return <div className="min-h-screen bg-[#0d1117]"><GovBrHeader /><LoadingState label="Carregando habilitação digital..." /></div>;
  }

  if (error || !record) {
    return <div className="min-h-screen bg-[#0d1117]"><GovBrHeader /><ErrorState message={error || "CNH não encontrada."} /></div>;
  }

  const rows = categoryRows(record.categoria, record.validade);
  const qrValue = validationUrl(record) || window.location.origin;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <GovBrHeader />
      <MobileShell>
        <div className="flex-1 px-4 py-6 sm:px-6">
          <div className="rounded-[2rem] border border-white/10 bg-[#1a1a2e] p-5 shadow-2xl shadow-black/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-300">habilitação</p>
                <h1 className="mt-2 text-2xl font-semibold">Categoria {record.categoria || "AB"}</h1>
                <p className="mt-2 text-sm text-slate-300">Status {statusLabel(record.validade)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-right">
                <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-200">Validade</div>
                <div className="mt-1 text-lg font-semibold text-emerald-300">{formatDate(record.validade)}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Número de registro</div>
                <div className="text-sm font-medium text-white">{record.registro || "Não informado"}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Número do espelho</div>
                <div className="text-sm font-medium text-white">{record.espelho || "Não informado"}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Primeira habilitação</div>
                <div className="text-sm font-medium text-white">{formatDate(record.primeiraHabilitacao)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Data de emissão</div>
                <div className="text-sm font-medium text-white">{formatDate(record.dataEmissao)}</div>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#101826]">
              <div className="grid grid-cols-[1fr,1fr] border-b border-white/10 bg-white/5 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                <span>Categoria</span>
                <span>Validade</span>
              </div>
              {rows.map((row) => (
                <div key={row.categoria} className="grid grid-cols-[1fr,1fr] px-4 py-3 text-sm text-slate-200 even:bg-white/[0.03]">
                  <span>{row.categoria}</span>
                  <span>{row.validade}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">Validação digital</p>
                  <p className="mt-2 max-w-[14rem] text-sm leading-6 text-slate-200">Use o QR Code para abrir a página de validação desta CNH.</p>
                </div>
                <div className="rounded-2xl bg-white p-3">
                  <QRCodeSVG value={qrValue} size={96} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <BottomTabs active="habilitacao" cpf={record.cpf || cpf} />
      </MobileShell>
    </div>
  );
}
