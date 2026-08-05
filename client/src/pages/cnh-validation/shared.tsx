import { type ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";

export interface CNHValidationRecord {
  id?: string;
  codigoQR?: string;
  codigo_qr?: string;
  codigo_validacao?: string;
  nome?: string;
  cpf?: string;
  rg?: string;
  orgaoEmissor?: string;
  ufRG?: string;
  sexo?: string;
  nacionalidade?: string;
  dataNascimento?: string;
  localNascimento?: string;
  ufNascimento?: string;
  nomePai?: string;
  nomeMae?: string;
  categoria?: string;
  tipo?: string;
  registro?: string;
  espelho?: string;
  validade?: string;
  dataEmissao?: string;
  primeiraHabilitacao?: string;
  localEmissao?: string;
  ufEmissao?: string;
  observacoes?: string;
  fotoUrl?: string;
  assinaturaUrl?: string;
  status?: string;
  created_at?: string;
}

export function queryCpf() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("cpf") || "";
}

export function cleanCpf(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCpf(value?: string) {
  const digits = cleanCpf(value || "");
  if (digits.length !== 11) return value || "Não informado";
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatDate(value?: string) {
  if (!value) return "Não informado";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
}

export function isExpired(value?: string) {
  if (!value) return false;
  const normalized = value.includes("/") ? value.split("/").reverse().join("-") : value.slice(0, 10);
  const target = new Date(`${normalized}T23:59:59`);
  if (Number.isNaN(target.getTime())) return false;
  return target.getTime() < Date.now();
}

export function statusLabel(value?: string) {
  return isExpired(value) ? "Vencida" : "Válida";
}

export function categoryRows(category = "", validade?: string) {
  let normalized = category.toUpperCase().replace(/[^A-Z]/g, "");
  if (normalized.includes("E")) normalized += "DCB";
  else if (normalized.includes("D")) normalized += "CB";
  else if (normalized.includes("C")) normalized += "B";
  const enabled = new Set<string>();
  ["ACC", "A", "B", "C", "D", "E"].forEach((item) => {
    if (item === "ACC") {
      if (normalized.includes("ACC")) enabled.add("ACC");
      return;
    }
    if (normalized.includes(item)) enabled.add(item);
  });
  return ["ACC", "A", "B", "C", "D", "E"].map((item) => ({
    categoria: item,
    validade: enabled.has(item) ? formatDate(validade) : "—",
  }));
}

export function resolveValidationCode(record?: CNHValidationRecord | null) {
  return record?.codigo_validacao || record?.codigo_qr || record?.codigoQR || record?.id || "";
}

export function validationUrl(record?: CNHValidationRecord | null) {
  const code = resolveValidationCode(record);
  if (!code) return "";
  if (typeof window === "undefined") return `/verificar/${code}`;
  return `${window.location.origin}/verificar/${code}`;
}

export function normalizeRecord(payload: any): CNHValidationRecord {
  const root = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const nested = root?.data && typeof root.data === "object" ? root.data : {};
  return {
    ...root,
    ...nested,
    nome: root?.nome || nested?.nome || nested?.nomeCompleto || "",
    cpf: root?.cpf || nested?.cpf || "",
    rg: root?.rg || nested?.rg || "",
    orgaoEmissor: root?.orgaoEmissor || nested?.orgaoEmissor || "",
    ufRG: root?.ufRG || nested?.ufRG || nested?.ufRg || "",
    sexo: root?.sexo || nested?.sexo || "",
    nacionalidade: root?.nacionalidade || nested?.nacionalidade || "BRASILEIRA",
    dataNascimento: root?.dataNascimento || nested?.dataNascimento || nested?.nascimento || "",
    localNascimento: root?.localNascimento || nested?.localNascimento || "",
    ufNascimento: root?.ufNascimento || nested?.ufNascimento || "",
    nomePai: root?.nomePai || nested?.nomePai || nested?.filiacaoPai || "",
    nomeMae: root?.nomeMae || nested?.nomeMae || nested?.filiacaoMae || "",
    categoria: root?.categoria || nested?.categoria || nested?.cat || "",
    tipo: root?.tipo || nested?.tipo || "",
    registro: root?.registro || nested?.registro || nested?.nRegistro || nested?.numRegistro || "",
    espelho: root?.espelho || nested?.espelho || nested?.numeroFormulario || "",
    validade: root?.validade || nested?.validade || "",
    dataEmissao: root?.dataEmissao || nested?.dataEmissao || nested?.emissao || "",
    primeiraHabilitacao: root?.primeiraHabilitacao || nested?.primeiraHabilitacao || nested?.primeiraHab || "",
    localEmissao: root?.localEmissao || nested?.localEmissao || nested?.local || "",
    ufEmissao: root?.ufEmissao || nested?.ufEmissao || "",
    observacoes: root?.observacoes || nested?.observacoes || nested?.obs || "",
    fotoUrl: root?.fotoUrl || nested?.fotoUrl || nested?.foto || "",
    assinaturaUrl: root?.assinaturaUrl || nested?.assinaturaUrl || nested?.assinatura || "",
    codigoQR: root?.codigoQR || nested?.codigoQR || root?.codigo_qr || nested?.codigo_qr || root?.codigo_validacao || nested?.codigo_validacao || root?.id || nested?.id || "",
    codigo_qr: root?.codigo_qr || nested?.codigo_qr || "",
    codigo_validacao: root?.codigo_validacao || nested?.codigo_validacao || "",
    status: root?.status || nested?.status || "emitido",
  };
}

export function useCnhRecord(cpf: string) {
  const [record, setRecord] = useState<CNHValidationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = cleanCpf(cpf);
    if (!value) {
      setLoading(false);
      setError("CPF não informado.");
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/cnh/validate?cpf=${value}`)
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok || !json?.success) {
          throw new Error(json?.error || "CNH não encontrada");
        }
        return normalizeRecord(json.data);
      })
      .then((data) => {
        if (!active) return;
        setRecord(data);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || "Erro ao consultar CNH.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cpf]);

  return { record, loading, error };
}

export function GovBrHeader() {
  return (
    <header className="bg-[#071D41] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <img src="/assets/govbr-logo.png" alt="gov.br" className="h-8 w-auto" />
          <div className="hidden h-6 w-px bg-white/20 sm:block" />
          <span className="hidden text-sm font-medium text-blue-100 sm:inline">Carteira Digital de Trânsito</span>
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">acesso seguro</div>
      </div>
    </header>
  );
}

export function GovBrFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>Gov.br · Secretaria Nacional de Trânsito</span>
        <div className="flex gap-4">
          <span>Termo de Responsabilidade</span>
          <span>Política de Privacidade</span>
        </div>
      </div>
    </footer>
  );
}

export function MobileShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-md flex-col">{children}</div>;
}

export function LoadingState({ label = "Carregando CNH digital..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-emerald-500/20 bg-[#131c2e] px-8 py-10 text-center text-white shadow-2xl shadow-black/30">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-400/30 border-t-emerald-400" />
        <p className="text-sm text-slate-300">{label}</p>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  const [, setLocation] = useLocation();
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-[#131c2e] p-8 text-center text-white shadow-2xl shadow-black/30">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 text-2xl">!</div>
        <p className="mb-6 text-sm text-slate-300">{message}</p>
        <button
          onClick={() => setLocation("/")}
          className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          Voltar ao início
        </button>
      </div>
    </div>
  );
}

export function BottomTabs({ active, cpf }: { active: "condutor" | "habilitacao"; cpf: string }) {
  const [, setLocation] = useLocation();
  const base = `?cpf=${encodeURIComponent(cleanCpf(cpf))}`;
  const itemClass = (selected: boolean) =>
    `flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${selected ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25" : "bg-white/5 text-slate-300 hover:bg-white/10"}`;

  return (
    <div className="sticky bottom-0 mt-8 border-t border-white/10 bg-[#0d1117]/95 px-4 py-4 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-md gap-3">
        <button className={itemClass(active === "condutor")} onClick={() => setLocation(`/condutor${base}`)}>Condutor</button>
        <button className={itemClass(active === "habilitacao")} onClick={() => setLocation(`/habilitacao${base}`)}>Habilitação</button>
      </div>
    </div>
  );
}

export function DataField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="text-sm font-medium text-white">{value || "Não informado"}</div>
    </div>
  );
}
