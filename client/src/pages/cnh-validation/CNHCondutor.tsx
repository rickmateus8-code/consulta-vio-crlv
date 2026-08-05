import { BottomTabs, DataField, ErrorState, GovBrHeader, LoadingState, MobileShell, formatCpf, formatDate, queryCpf, useCnhRecord } from "./shared";

export default function CNHCondutor() {
  const cpf = queryCpf();
  const { record, loading, error } = useCnhRecord(cpf);

  if (loading) {
    return <div className="min-h-screen bg-[#0d1117]"><GovBrHeader /><LoadingState label="Carregando dados do condutor..." /></div>;
  }

  if (error || !record) {
    return <div className="min-h-screen bg-[#0d1117]"><GovBrHeader /><ErrorState message={error || "CNH não encontrada."} /></div>;
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <GovBrHeader />
      <MobileShell>
        <div className="flex-1 px-4 py-6 sm:px-6">
          <div className="rounded-[2rem] border border-white/10 bg-[#1a1a2e] p-5 shadow-2xl shadow-black/30">
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-[1.5rem] border border-emerald-400/20 bg-white/5">
                {record.fotoUrl ? (
                  <img src={record.fotoUrl} alt={record.nome || "Condutor"} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.24em] text-slate-400">Sem foto</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-300">condutor</p>
                <h1 className="mt-2 text-2xl font-semibold leading-tight">{record.nome || "Não informado"}</h1>
                <p className="mt-2 text-sm text-slate-300">CPF {formatCpf(record.cpf)}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <DataField label="RG" value={record.rg} />
              <DataField label="Data de nascimento" value={formatDate(record.dataNascimento)} />
              <DataField label="Nacionalidade" value={record.nacionalidade} />
              <DataField label="Local de nascimento" value={[record.localNascimento, record.ufNascimento].filter(Boolean).join("/")} />
              <DataField label="Nome da mãe" value={record.nomeMae} />
              <DataField label="Nome do pai" value={record.nomePai} />
              <DataField label="Órgão emissor" value={[record.orgaoEmissor, record.ufRG].filter(Boolean).join("/")} />
              {(record.assDigital2 || record.renach) && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span className="text-gray-400 text-sm">RENACH</span>
                    <span className="text-white font-mono">{record.assDigital2 || record.renach}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <BottomTabs active="condutor" cpf={record.cpf || cpf} />
      </MobileShell>
    </div>
  );
}
