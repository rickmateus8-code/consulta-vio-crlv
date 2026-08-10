import { type ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";

export interface CNHValidationRecord {
  id?: string;
  codigoQR?: string;
  codigo_qr?: string;
  codigo_validacao?: string;
  assDigital1?: string;
  assDigital2?: string;
  renach?: string;
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
  if (!value || value === "-") return "Não informado";
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
  const raw = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const data = raw?.data && typeof raw.data === "object" ? raw.data : {};
  
  const rawValidade = raw?.validade || data?.validade || data?.dataValidade || data?.validadeCNH || raw?.dataValidade;
  const rawEmissao = raw?.dataEmissao || data?.dataEmissao || data?.emissao || data?.data_emissao || data?.dtEmissao || raw?.emissao;

  return {
    ...raw,
    ...data,
    nome: raw?.nome || data?.nome || data?.nomeCompleto || "",
    cpf: raw?.cpf || data?.cpf || "",
    rg: raw?.rg || data?.rg || "",
    orgaoEmissor: raw?.orgaoEmissor || data?.orgaoEmissor || "",
    ufRG: raw?.ufRG || data?.ufRG || data?.ufRg || "",
    sexo: raw?.sexo || data?.sexo || "MASCULINO",
    nacionalidade: raw?.nacionalidade || data?.nacionalidade || "BRASILEIRA",
    dataNascimento: raw?.dataNascimento || data?.dataNascimento || data?.nascimento || "",
    localNascimento: raw?.localNascimento || data?.localNascimento || "",
    ufNascimento: raw?.ufNascimento || data?.ufNascimento || "",
    nomePai: raw?.nomePai || data?.nomePai || data?.filiacaoPai || "",
    nomeMae: raw?.nomeMae || data?.nomeMae || data?.filiacaoMae || "",
    categoria: raw?.categoria || data?.categoria || data?.cat || "B",
    tipo: raw?.tipo || data?.tipo || "",
    registro: raw?.registro || data?.registro || data?.nRegistro || data?.numRegistro || "",
    espelho: raw?.espelho || data?.espelho || data?.numeroFormulario || "",
    validade: formatDate(rawValidade) !== "Não informado" ? rawValidade : "2030-05-22",
    dataEmissao: formatDate(rawEmissao) !== "Não informado" ? rawEmissao : "2026-03-21",
    primeiraHabilitacao: raw?.primeiraHabilitacao || data?.primeiraHabilitacao || data?.primeiraHab || "",
    localEmissao: raw?.localEmissao || data?.localEmissao || data?.local || "",
    ufEmissao: raw?.ufEmissao || data?.ufEmissao || "DF",
    observacoes: raw?.observacoes || data?.observacoes || data?.obs || "",
    fotoUrl: raw?.fotoUrl || data?.fotoUrl || data?.foto || "",
    assinaturaUrl: raw?.assinaturaUrl || data?.assinaturaUrl || data?.assinatura || "",
    assDigital1: data?.assDigital1 || raw?.assDigital1 || "",
    assDigital2: data?.assDigital2 || raw?.assDigital2 || data?.renach || raw?.renach || "",
    renach: data?.renach || raw?.renach || data?.assDigital2 || raw?.assDigital2 || "",
    codigoQR: raw?.codigo_validacao || raw?.codigo_qr || raw?.codigoQR || data?.codigo_validacao || data?.codigo_qr || data?.codigoQR || "",
    codigo_qr: raw?.codigo_qr || data?.codigo_qr || "",
    codigo_validacao: raw?.codigo_validacao || data?.codigo_validacao || "",
    status: raw?.status || data?.status || "emitido",
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
    const searchParams = new URLSearchParams(window.location.search);
    const orig = searchParams.get("origem_tabela");
    const origParam = orig ? `&origem_tabela=${orig}` : "";
    fetch(`/api/cnh/validate?cpf=${value}${origParam}`)
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
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cpf]);

  return { record, loading, error };
}

export function GovBrHeader() {
  return (
    <header className="border-b border-slate-200 bg-white py-4 px-6 shadow-sm">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/assets/govbr.png" alt="gov.br" className="h-7 w-auto object-contain" />
        </div>
      </div>
    </header>
  );
}

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white min-h-screen sm:min-h-[800px] sm:rounded-3xl sm:shadow-2xl overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  const [, setLocation] = useLocation();
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-2xl mb-4">
        !
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Atenção</h2>
      <p className="text-slate-600 mb-6">{message}</p>
      <button
        onClick={() => setLocation("/")}
        className="px-6 py-3 bg-[#002e6e] text-white font-bold text-sm rounded-full uppercase tracking-wider shadow-md hover:bg-[#001f4c] transition"
      >
        Voltar ao início
      </button>
    </div>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-[#002e6e]/20 border-t-[#002e6e] rounded-full animate-spin mb-4" />
      <p className="text-slate-600 font-semibold text-sm">{label}</p>
    </div>
  );
}
