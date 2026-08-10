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
    validade: enabled.has(item) ? (formatDate(validade) || validade || "—") : "—",
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
  let data = raw?.data && typeof raw.data === "object" ? raw.data : {};
  if (data?.data && typeof data.data === "object") {
    data = { ...data, ...data.data };
  }
  const merged = { ...raw, ...data };
  
  const rawValidade = merged.validade || merged.dataValidade || merged.validadeCNH || merged.validadeCNH2 || merged.val || "";
  const rawEmissao = merged.dataEmissao || merged.emissao || merged.data_emissao || merged.dtEmissao || "";

  return {
    ...merged,
    nome: merged.nome || merged.nomeCompleto || "",
    cpf: merged.cpf || "",
    rg: merged.rg || "",
    orgaoEmissor: merged.orgaoEmissor || "",
    ufRG: merged.ufRG || merged.ufRg || "",
    sexo: (merged.sexo || "").toUpperCase(),
    nacionalidade: (merged.nacionalidade || "").toUpperCase(),
    dataNascimento: formatDate(merged.dataNascimento || merged.nascimento) || merged.dataNascimento || "",
    localNascimento: merged.localNascimento || "",
    ufNascimento: merged.ufNascimento || "",
    nomePai: merged.nomePai || merged.filiacaoPai || "",
    nomeMae: merged.nomeMae || merged.filiacaoMae || "",
    categoria: (merged.categoria || merged.cat || "").toUpperCase(),
    tipo: merged.tipo || "",
    registro: merged.registro || merged.nRegistro || merged.numRegistro || "",
    espelho: merged.espelho || merged.numeroFormulario || "",
    validade: formatDate(rawValidade) || rawValidade || "",
    dataEmissao: formatDate(rawEmissao) || rawEmissao || "",
    primeiraHabilitacao: formatDate(merged.primeiraHabilitacao || merged.primeiraHab) || merged.primeiraHabilitacao || "",
    localEmissao: merged.localEmissao || merged.local || "",
    ufEmissao: (merged.ufEmissao || merged.uf || merged.ufEmissor || "").toUpperCase(),
    observacoes: merged.observacoes || merged.obs || "",
    fotoUrl: merged.fotoUrl || merged.foto || "",
    assinaturaUrl: merged.assinaturaUrl || merged.assinatura || "",
    assDigital1: merged.assDigital1 || "",
    assDigital2: merged.assDigital2 || merged.renach || "",
    renach: merged.renach || merged.assDigital2 || "",
    codigoQR: merged.codigo_validacao || merged.codigo_qr || merged.codigoQR || merged.id || "",
    codigo_qr: merged.codigo_qr || "",
    codigo_validacao: merged.codigo_validacao || "",
    status: merged.status || "emitido",
  };
}

export function useCnhRecord(cpf: string) {
  const [record, setRecord] = useState<CNHValidationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const value = cleanCpf(cpf);
    if (!value) {
      setLoading(false);
      setError("CPF não informado.");
      if (typeof window !== "undefined") setLocation("/");
      return;
    }

    // Security Guard: Verify password authentication session
    if (typeof window !== "undefined") {
      const sessionStr = sessionStorage.getItem("cnh_auth_session") || localStorage.getItem("cnh_auth_session_" + value);
      let session: any = null;
      try { session = JSON.parse(sessionStr || "{}"); } catch {}

      if (!session || session.cpf !== value || !session.token || (session.expiresAt && Date.now() > session.expiresAt)) {
        setLocation(`/senha?cpf=${encodeURIComponent(value)}`);
        return;
      }
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
        if (!response.ok || !json?.success || !json?.data) {
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
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("cnh_auth_session");
          localStorage.removeItem("cnh_auth_session_" + value);
          setTimeout(() => setLocation("/"), 1500);
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cpf, setLocation]);

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
