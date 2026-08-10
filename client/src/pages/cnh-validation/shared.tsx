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

export function formatDate(value?: string): string {
  if (!value || value === "-") return "";
  const str = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [year, month, day] = str.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }
  if (/^\d{4}\/\d{2}\/\d{2}/.test(str)) {
    const [year, month, day] = str.slice(0, 10).split("/");
    return `${day}/${month}/${year}`;
  }
  return str;
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
    validade: enabled.has(item) ? (formatDate(validade) || "—") : "—",
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
  
  // Resolving raw values from emission payload
  const rawEmissao = data?.dataEmissao || data?.emissao || data?.data_emissao || data?.dtEmissao || data?.primeiraHabilitacao || raw?.dataEmissao || raw?.created_at;
  const formattedEmissao = formatDate(rawEmissao) || formatDate(new Date().toISOString().slice(0, 10));

  let rawValidade = data?.validade || data?.dataValidade || data?.validadeCNH || data?.validadeCNH2 || data?.val || raw?.validade;
  let formattedValidade = formatDate(rawValidade);

  // If validade was left empty during /cnhcria emission, calculate 10 years from emission date
  if (!formattedValidade && formattedEmissao) {
    const parts = formattedEmissao.split("/");
    if (parts.length === 3) {
      const year = parseInt(parts[2], 10) + 10;
      formattedValidade = `${parts[0]}/${parts[1]}/${year}`;
    }
  }

  return {
    ...raw,
    ...data,
    nome: raw?.nome || data?.nome || data?.nomeCompleto || "",
    cpf: raw?.cpf || data?.cpf || "",
    rg: raw?.rg || data?.rg || "",
    orgaoEmissor: raw?.orgaoEmissor || data?.orgaoEmissor || "",
    ufRG: raw?.ufRG || data?.ufRG || data?.ufRg || "",
    sexo: (data?.sexo || raw?.sexo || "MASCULINO").toUpperCase(),
    nacionalidade: (data?.nacionalidade || raw?.nacionalidade || "BRASILEIRA").toUpperCase(),
    dataNascimento: formatDate(data?.dataNascimento || raw?.dataNascimento || data?.nascimento),
    localNascimento: data?.localNascimento || raw?.localNascimento || "",
    ufNascimento: data?.ufNascimento || raw?.ufNascimento || "",
    nomePai: data?.nomePai || raw?.nomePai || data?.filiacaoPai || "",
    nomeMae: data?.nomeMae || raw?.nomeMae || data?.filiacaoMae || "",
    categoria: (data?.categoria || raw?.categoria || data?.cat || "B").toUpperCase(),
    tipo: data?.tipo || raw?.tipo || "Definitiva",
    registro: data?.registro || raw?.registro || data?.nRegistro || data?.numRegistro || "",
    espelho: data?.espelho || raw?.espelho || data?.numeroFormulario || "",
    validade: formattedValidade,
    dataEmissao: formattedEmissao,
    primeiraHabilitacao: formatDate(data?.primeiraHabilitacao || raw?.primeiraHabilitacao || data?.primeiraHab) || formattedEmissao,
    localEmissao: data?.localEmissao || raw?.localEmissao || data?.local || "BRASÍLIA",
    ufEmissao: (data?.ufEmissao || raw?.ufEmissao || data?.uf || "DF").toUpperCase(),
    observacoes: data?.observacoes || raw?.observacoes || data?.obs || "",
    fotoUrl: data?.fotoUrl || raw?.fotoUrl || data?.foto || "",
    assinaturaUrl: data?.assinaturaUrl || raw?.assinaturaUrl || data?.assinatura || "",
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
