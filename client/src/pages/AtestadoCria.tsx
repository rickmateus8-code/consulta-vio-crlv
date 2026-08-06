import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import AttestationDocument from "@/components/AttestationDocument";
import type { AttestationData } from "@/data/attestations";
import { exportElementToPDF, generatePDFFilename } from "@/lib/pdfExport";
import { useAuth } from "@/contexts/AuthContext";
import { validarCPF } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";

// ─── SearchSelect: select com campo de busca integrado no dropdown ────────────
function SearchSelect({
  label, value, options, placeholder, disabled, onChange, onFocus
}: {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  onFocus?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = options.filter(o => !search || o.toUpperCase().includes(search.toUpperCase()));

  const triggerStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 28px 6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    background: disabled ? "#f3f4f6" : "#fff",
    color: value ? "#000" : "#9ca3af",
    cursor: disabled ? "not-allowed" : "pointer",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
    position: "relative" as const,
    userSelect: "none" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 32,
    outline: open ? "2px solid #005CA9" : "none",
    borderColor: open ? "#005CA9" : "#d1d5db",
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  return (
    <div style={{ position: "relative" }} ref={ref} onFocus={onFocus}>
      <div
        style={triggerStyle}
        onClick={() => { if (!disabled) { setOpen(o => !o); setSearch(""); if (!open && onFocus) onFocus(); } }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || placeholder || label + "..."}
        </span>
        <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 4 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "#fff",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
            <input
              autoFocus
              style={{
                width: "100%",
                padding: "4px 8px",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 12,
                outline: "none",
                boxSizing: "border-box" as const,
              }}
              placeholder="🔍 Pesquisar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  if (filtered.length > 0) handleSelect(filtered[0]);
                }
                if (e.key === "Escape") {
                  setOpen(false);
                  setSearch("");
                }
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            <div
              style={{ padding: "6px 12px", fontSize: 13, color: "#9ca3af", cursor: "pointer" }}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(""); }}
            >
              {placeholder || label + "..."}
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: "6px 12px", fontSize: 12, color: "#9ca3af" }}>Nenhum resultado</div>
            )}
            {filtered.map(o => (
              <div
                key={o}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                  background: o === value ? "#dbeafe" : "transparent",
                  fontWeight: o === value ? 700 : 400,
                  color: "#000",
                }}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(o); }}
                onMouseEnter={(e) => (e.currentTarget.style.background = o === value ? "#dbeafe" : "#f3f4f6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = o === value ? "#dbeafe" : "transparent")}
              >
                {o}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── API de Médicos (Cloudflare D1 — banco unificado) ─────────────────────────
async function apiFetch(path: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(`/api/medicos${path}`, {
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`API HTTP ${res.status}`);
    return res.json();
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("Timeout: servidor demorou demais. Tente novamente.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Constantes ────────────────────────────────────────────────────────────────
const ESTADOS_SIGLAS: Record<string, string> = {
  "ACRE": "AC", "ALAGOAS": "AL", "AMAPA": "AP", "AMAZONAS": "AM", "BAHIA": "BA",
  "CEARA": "CE", "DISTRITO FEDERAL": "DF", "ESPIRITO SANTO": "ES", "GOIAS": "GO",
  "MARANHAO": "MA", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS", "MINAS GERAIS": "MG",
  "PARA": "PA", "PARAIBA": "PB", "PARANA": "PR", "PERNAMBUCO": "PE", "PIAUI": "PI",
  "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS",
  "RONDONIA": "RO", "RORAIMA": "RR", "SANTA CATARINA": "SC", "SAO PAULO": "SP",
  "SERGIPE": "SE", "TOCANTINS": "TO"
};

function converterEstadoParaSigla(nomeEstado: string): string {
  if (!nomeEstado) return "";
  const nomeNorm = nomeEstado.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  return ESTADOS_SIGLAS[nomeNorm] || nomeNorm;
}

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const ESPECIALIDADES = [
  { value: "", label: "Todas as Áreas" },
  { value: "CLINICO GERAL", label: "Médico Geral" },
  { value: "PEDIATRIA", label: "Pediatria" },
  { value: "GINECOLOGIA", label: "Ginecologia" },
  { value: "CARDIOLOGIA", label: "Cardiologia" },
  { value: "ORTOPEDIA", label: "Ortopedia" },
  { value: "OFTALMOLOGIA", label: "Oftalmologia" },
  { value: "PSIQUIATRIA", label: "Psiquiatria" },
  { value: "DERMATOLOGIA", label: "Dermatologia" },
  { value: "CIRURGIA GERAL", label: "Cirurgia Geral" },
];

const CIDS_CATEGORIZADOS = [
  {
    grupo: "Infecciosos (3-7 dias)",
    itens: [
      { code: "A09", desc: "Diarreia / Gastroenterite" },
      { code: "A90", desc: "Dengue" },
      { code: "B34.9", desc: "Virose não especificada" },
      { code: "H10", desc: "Conjuntivite" },
      { code: "J11", desc: "Gripe (Influenza)" },
    ],
  },
  {
    grupo: "Respiratórios (2-5 dias)",
    itens: [
      { code: "J00", desc: "Resfriado comum" },
      { code: "J01", desc: "Sinusite aguda" },
      { code: "J03", desc: "Amigdalite" },
      { code: "J06", desc: "Infecção Vias Aéreas" },
      { code: "J30", desc: "Rinite Alérgica" },
    ],
  },
  {
    grupo: "Dores e Ortopedia",
    itens: [
      { code: "M54.2", desc: "Dor no Pescoço" },
      { code: "M54.5", desc: "Dor Lombar" },
      { code: "S93", desc: "Entorse Tornozelo" },
      { code: "R51", desc: "Dor de Cabeça" },
      { code: "G43", desc: "Enxaqueca" },
    ],
  },
  {
    grupo: "Outros",
    itens: [
      { code: "K29", desc: "Gastrite" },
      { code: "R10", desc: "Dor Abdominal" },
      { code: "N39.0", desc: "Infecção Urinária" },
      { code: "Z76.3", desc: "Acompanhante" },
      { code: "T78.0", desc: "Reação Anafilática (Ovo)" },
      { code: "L50", desc: "Urticária" },
      { code: "J45", desc: "Asma" },
    ],
  },
];

// ─── Logos padrão disponíveis ──────────────────────────────────────────────────
const LOGOS_PADRAO = [
  { id: "logo1",      label: "Logo 1",       src: "/logos/logo1.png" },
  { id: "logo2",      label: "Logo 2",       src: "/logos/logo2.png" },
  { id: "logo3",      label: "Logo 3",       src: "/logos/logo3.jpg" },
  { id: "amil",       label: "Amil",         src: "/logos/amil.png" },
  { id: "hapvida",    label: "Hapvida",      src: "/logos/hapvida.png" },
  { id: "notredame",  label: "Notre Dame",   src: "/logos/notredame.png" },
  { id: "sulamerica", label: "Sul América",  src: "/logos/sulamerica.png" },
  { id: "unimed",     label: "Unimed",       src: "/logos/unimed.png" },
];

// ─── Mapeamento de dias por extenso ───────────────────────────────────────────
const DIAS_EXTENSO: Record<number, { num: string; ext: string }> = {
  1:  { num: "01", ext: "um" },
  2:  { num: "02", ext: "dois" },
  3:  { num: "03", ext: "três" },
  4:  { num: "04", ext: "quatro" },
  5:  { num: "05", ext: "cinco" },
  6:  { num: "06", ext: "seis" },
  7:  { num: "07", ext: "sete" },
  8:  { num: "08", ext: "oito" },
  9:  { num: "09", ext: "nove" },
  10: { num: "10", ext: "dez" },
  11: { num: "11", ext: "onze" },
  12: { num: "12", ext: "doze" },
  13: { num: "13", ext: "treze" },
  14: { num: "14", ext: "quatorze" },
  15: { num: "15", ext: "quinze" },
};

function gerarTextoAfastamento(dias: number): string {
  const d = DIAS_EXTENSO[dias];
  if (!d) return "";
  const unidade = dias === 1 ? "dia" : "dias";
  return `Necessita de ${d.num} (${d.ext}) ${unidade} de afastamento de suas atividades laborais para repouso e tratamento de saúde.`;
}

// ─── Texto padrão do atestado ─────────────────────────────────────────────────
const TEXTO_PADRAO = `Atesto para os devidos fins que o(a) paciente acima identificado(a) compareceu a esta unidade de saúde na data de hoje para atendimento médico. Necessita de 03 (três) dia(s) de afastamento de suas atividades laborais para repouso e tratamento de saúde.`;

// ─── Texto padrão do laudo ─────────────────────────────────────────────────
const TEXTO_LAUDO = `Declaro, para os devidos fins, que a paciente acima mencionada apresenta limitações físicas decorrentes de procedimento cirúrgico na coluna vertebral.

Atualmente, a mesma não possui condições de exercer atividades laborativas, devido às seguintes restrições:
• Necessidade de uso de apoio para deambulação (locomoção);
• Dificuldade para permanecer em pé por períodos prolongados;
• Limitação funcional que compromete atividades que exigem esforço físico ou permanência contínua em postura ortostática (em pé).

Diante do quadro apresentado, recomenda-se afastamento de atividades trabalhistas por tempo indeterminado, devendo ser reavaliada periodicamente conforme evolução clínica.`;

// ─── Texto padrão do relatório médico ─────────────────────────────────────────
const TEXTO_RELATORIO_TEMPLATE = (sexoLabel: string) => `A paciente apresenta quadro clínico que causa incapacidade temporária para o exercício de suas atividades laborais habituais, necessitando de afastamento do trabalho para realização de tratamento médico adequado.

Encontra-se em tratamento oncológico, necessitando acompanhamento contínuo, repouso e afastamento laboral, considerando as limitações físicas e emocionais decorrentes da doença e do tratamento realizado.`.replace("A paciente", sexoLabel === "M" ? "O paciente" : "A paciente");

// ─── Máscaras ─────────────────────────────────────────────────────────────────
function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function maskCNS(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 15);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0,3)} ${d.slice(3)}`;
  if (d.length <= 11) return `${d.slice(0,3)} ${d.slice(3,7)} ${d.slice(7)}`;
  return `${d.slice(0,3)} ${d.slice(3,7)} ${d.slice(7,11)} ${d.slice(11)}`;
}

function handleDateInput(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`;
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`;
}

function todayBR() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function optimizeImageForUpload(file: File, options?: { maxWidth?: number; maxHeight?: number; quality?: number }) {
  const { maxWidth = 1400, maxHeight = 1400, quality = 0.82 } = options || {};

  if (!file.type.startsWith("image/")) {
    return readFileAsBase64(file);
  }

  const originalDataUrl = await readFileAsBase64(file);

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.width || maxWidth;
      const height = img.height || maxHeight;
      const ratio = Math.min(1, maxWidth / width, maxHeight / height);
      const targetWidth = Math.max(1, Math.round(width * ratio));
      const targetHeight = Math.max(1, Math.round(height * ratio));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(originalDataUrl);
        return;
      }

      // IMPORTANTE: Preencher com branco para evitar fundo preto em transparências (especialmente ao converter para JPEG)
      // Se for PNG, mantemos transparente. Para todos os outros (JPG, WebP, etc), forçamos fundo branco.
      const isPng = file.type === "image/png";
      if (!isPng) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
      }

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const preferredType = isPng ? "image/png" : "image/jpeg";
      const optimizedDataUrl = canvas.toDataURL(preferredType, quality);

      resolve(optimizedDataUrl.length < originalDataUrl.length ? optimizedDataUrl : originalDataUrl);
    };
    img.onerror = () => resolve(originalDataUrl);
    img.src = originalDataUrl;
  });
}

async function parseJsonResponseSafely(res: Response) {
  const rawText = await res.text();
  const trimmed = rawText.trim();

  if (!trimmed) {
    throw new Error("O servidor retornou uma resposta vazia ao emitir o documento.");
  }

  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith("<")) {
    throw new Error(`O servidor retornou HTML em vez de JSON (HTTP ${res.status}). Isso normalmente indica falha de rota ou deploy no Cloudflare.`);
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(`Resposta inválida do servidor (HTTP ${res.status}).`);
  }
}

function getUploadSizeInBytes(value?: string) {
  if (!value) return 0;
  const base64 = value.includes(",") ? value.split(",")[1] || "" : value;
  return Math.ceil((base64.length * 3) / 4);
}

// ─── Tipos ─────────────────────────────────────────────────────────────────────
interface MedicoDB {
  id: number;
  nome_medico: string;
  crm: string;
  uf_crm: string;
  especialidade: string;
  local_trabalho: string;
  cidade: string;
  uf_local: string;
  endereco: string;
  bairro: string;
  telefone?: string;
}

// ─── Componente ────────────────────────────────────────────────────────────────
export default function AtestadoCria() {
  const { user, updateBalance } = useAuth();
  const { validityDays } = useSettings();
  const [, navigate] = useLocation();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [autoDownloadTriggered, setAutoDownloadTriggered] = useState(false);

  // ── Logos ──────────────────────────────────────────────────────────────────
  const [logoLeft, setLogoLeft] = useState<string>("");
  const [logoRight, setLogoRight] = useState<string>("");
  const [logoSide, setLogoSide] = useState<"left" | "right">("left");
  const logoLeftRef = useRef<HTMLInputElement>(null);
  const logoRightRef = useRef<HTMLInputElement>(null);

  // ── Escala e posição dos logos ─────────────────────────────────────────────
  const [logoLeftScale, setLogoLeftScale] = useState<number>(1);
  const [logoRightScale, setLogoRightScale] = useState<number>(1);
  const [logoLeftX, setLogoLeftX] = useState<number>(0);
  const [logoLeftY, setLogoLeftY] = useState<number>(0);
  const [logoRightX, setLogoRightX] = useState<number>(0);
  const [logoRightY, setLogoRightY] = useState<number>(0);

  // helpers de ajuste
  const SCALE_STEP = 0.05;
  const POS_STEP = 2;
  const adjustScale = (side: "left" | "right", delta: number) => {
    if (side === "left") setLogoLeftScale(v => Math.max(0.1, Math.min(3, parseFloat((v + delta).toFixed(2)))));
    else setLogoRightScale(v => Math.max(0.1, Math.min(3, parseFloat((v + delta).toFixed(2)))));
  };
  const adjustX = (side: "left" | "right", delta: number) => {
    if (side === "left") setLogoLeftX(v => v + delta);
    else setLogoRightX(v => v + delta);
  };
  const adjustY = (side: "left" | "right", delta: number) => {
    if (side === "left") setLogoLeftY(v => v + delta);
    else setLogoRightY(v => v + delta);
  };
  const resetLogoTransform = (side: "left" | "right") => {
    if (side === "left") { setLogoLeftScale(1); setLogoLeftX(0); setLogoLeftY(0); }
    else { setLogoRightScale(1); setLogoRightX(0); setLogoRightY(0); }
  };

  // ── Assinatura ─────────────────────────────────────────────────────────────
  const [signatureColor, setSignatureColor] = useState<string>("#000000"); // PRETA fixa por padrão
  const [signatureImage, setSignatureImage] = useState<string>("");
  const signatureRef = useRef<HTMLInputElement>(null);

  // ── Carimbo Interativo Elite 2.0 ───────────────────────────────────────────
  const [stampScale, setStampScale] = useState<number>(1.20);
  const [stampX, setStampX] = useState<number>(141); 
  const [stampY, setStampY] = useState<number>(-120); 
  const [stampRotate, setStampRotate] = useState<number>(-3);
  const [hideQRCode, setHideQRCode] = useState<boolean>(false);
  const [showStampInfo, setShowStampInfo] = useState<boolean>(true);

  // Giro aleatório a cada emissão para realismo
  const generateRandomGiro = () => {
    // Retorna um valor entre -10 e 10 graus
    return parseFloat((Math.random() * (10 - (-10)) + (-10)).toFixed(1));
  };

  // Gerador de posições randômicas para o botão RESET (conforme solicitado)
  const generateRandomPos = () => {
    const rx = Math.floor(Math.random() * (141 - (-131) + 1)) + (-131);
    const ry = Math.floor(Math.random() * ((-120) - (-208) + 1)) + (-208);
    return { x: rx, y: ry };
  };

  // Alternância automática de coordenadas baseada no modo Ocultar QR
  useEffect(() => {
    if (hideQRCode) {
      setStampX(-3);
      setStampY(-64);
      setStampScale(1.10);
      setStampRotate(-3);
    } else {
      const pos = generateRandomPos();
      setStampX(pos.x);
      setStampY(pos.y);
      setStampScale(1.20);
      setStampRotate(generateRandomGiro());
    }
  }, [hideQRCode]);

  const resetStampTransform = () => {
    setStampScale(1.20);
    setStampX(141);
    setStampY(-120);
    setStampRotate(-3);
  };

  const STAMP_POS_STEP = 8; // Rápido
  const STAMP_ROTATE_STEP = 1;

  // ── Tipo de documento do paciente ──────────────────────────────────────────
  const [tipoDoc, setTipoDoc] = useState<"CPF" | "CNS">("CPF");

  // ── Tipo de documento (Atestado, Laudo ou Relatório) ───────────────────────
  const [documentType, setDocumentType] = useState<'atestado' | 'laudo' | 'relatorio'>('atestado');

  // ── API de CPF ─────────────────────────────────────────────────────────────
  const [cpfLoading, setCpfLoading] = useState(false);
  const [cpfStatus, setCpfStatus] = useState<"idle" | "ok" | "error" | "not_found">("idle");
  const [cpfMsg, setCpfMsg] = useState("");

  const buscarDadosCPF = async (cpfMasked: string) => {
    const cpfLimpo = cpfMasked.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) return;
    // Validação básica antes de chamar a API
    if (!validarCPF(cpfMasked)) {
      setCpfStatus("error");
      setCpfMsg("CPF inválido.");
      return;
    }
    setCpfLoading(true);
    setCpfStatus("idle");
    setCpfMsg("");
    try {
      const res = await fetch(`/api/cpf-lookup?cpf=${cpfLimpo}`, { credentials: "include" });
      const data = await res.json() as any;
      if (!res.ok || !data.success) {
        setCpfStatus(res.status === 404 ? "not_found" : "error");
        setCpfMsg(data.error || "Erro ao consultar CPF.");
        return;
      }
      const d = data.data;
      // Preencher dados do paciente
      const siglaUF = converterEstadoParaSigla(d.uf || "");
      setForm(p => ({
        ...p,
        paciente: d.nome || p.paciente,
        nascimento: d.nascimento || p.nascimento,
        sexo: (d.sexo as "MALE" | "FEMALE") || p.sexo,
        nomeMae: d.nomeMae || p.nomeMae,
        // Formato final: {ENDEREÇO}, {NUMERO} - {BAIRRO}, {CIDADE}/{UF}
        endereco: d.endereco
          ? [
              `${d.endereco}${d.numero ? `, ${d.numero}` : ", S/N"}`,
              [d.bairro, d.cidade && siglaUF ? `${d.cidade}/${siglaUF}` : (d.cidade || "")].filter(Boolean).join(", "),
            ].filter(Boolean).join(" - ").toUpperCase()
          : p.endereco,
        // Preencher cidade de emissão se disponivel
        cidade: d.cidade ? d.cidade.toUpperCase() : p.cidade,
      }));
      // Preencher UF se disponivel
      if (siglaUF) setCepUFPreenchida(siglaUF);
      // Preencher CEP do paciente se disponivel
      if (d.cep) {
        const cepNum = d.cep.replace(/\D/g, "");
        if (cepNum.length === 8) {
          setCepPaciente(`${cepNum.slice(0,5)}-${cepNum.slice(5)}`);
        }
      }
      const source = data.source === "snoop" ? "Base de Dados Unificada" : "BrasilAPI";
      setCpfStatus("ok");
      setCpfMsg(`✅ Dados preenchidos via ${source}.`);
    } catch {
      setCpfStatus("error");
      setCpfMsg("Erro ao consultar CPF. Preencha manualmente.");
    } finally {
      setCpfLoading(false);
    }
  };

  // ── Busca de médicos ────────────────────────────────────────────────────────
  const [filtroUF, setFiltroUF] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroBairro, setFiltroBairro] = useState("");
  const [filtroLocal, setFiltroLocal] = useState("");
  const [filtroEsp, setFiltroEsp] = useState("");
  const [termoBusca, setTermoBusca] = useState("");
  const [cidades, setCidades] = useState<string[]>([]);
  const [bairros, setBairros] = useState<string[]>([]);
  const [locais, setLocais] = useState<string[]>([]);
  const [resultados, setResultados] = useState<MedicoDB[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState("");
  const [showResultados, setShowResultados] = useState(false);
  const [showEditar, setShowEditar] = useState(true); // Sempre expandido por padrão
  const skipClearUnidade = useRef(false);

  // ── Formulário ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    instituicao: "",
    unidade: "",
    enderecoEmitente: "",
    medico: "",
    crm: "",
    especialidade: "",
    paciente: "",
    sexo: "FEMALE" as "MALE" | "FEMALE",
    nascimento: "",
    docValue: "",  // CPF ou CNS conforme tipoDoc
    nomeMae: "",
    endereco: "",
    cid: "",
    cidDisplay: "",
    cidNome: "",
    afastamento: "3",
    textoAtestado: TEXTO_PADRAO,
    dataAssinatura: todayBR(),
    horaAssinatura: nowTime(),
    dataEmissao: todayBR(),
    cidade: "",
    modoCarimbo: false,
    hideSignatureLine: false,
    hidePatientSignature: false,
    hideAfastamentoText: false,
  });

  // ── Importação rápida ───────────────────────────────────────────────────────
  const [importTexto, setImportTexto] = useState("");
  const [showImport, setShowImport] = useState(false);

  // ── CEP do paciente ─────────────────────────────────────────────────────────
  const [cepPaciente, setCepPaciente] = useState("");
  const [cepNumero, setCepNumero] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepUFPreenchida, setCepUFPreenchida] = useState(""); // UF preenchida via CEP

  const [searchUF, setSearchUF] = useState("");
  const [searchCidade, setSearchCidade] = useState("");
  const [searchBairro, setSearchBairro] = useState("");
  // ── Modal de confirmação de preço ─────────────────────────────────────────
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [documentPrice, setDocumentPrice] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState<boolean>(false);

  // ── Lógica de Preview Inteligente com Zoom Dinâmico ─────────────────────────
  const [zoomScale, setZoomScale] = useState(0.65);
  const [zoomTranslateY, setZoomTranslateY] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [previewMode, setPreviewMode] = useState<"auto" | "full">("auto");
  const [currentSection, setCurrentSection] = useState<"top" | "bottom">("top");

  // Calcula a escala "Fit" exata para o container atual
  const getFitScale = useCallback(() => {
    const container = document.getElementById("preview-container");
    if (!container) return 0.65;
    const padding = 20; 
    const availableWidth = container.offsetWidth - padding;
    const availableHeight = container.offsetHeight - padding;
    const scaleX = availableWidth / 794;
    const scaleY = availableHeight / 1123;
    return Math.min(scaleX, scaleY, 1.0);
  }, []);

  // Função para calcular o Zoom e Deslocamento dividindo o Layout em CIMA / BAIXO
  const scrollToPreviewSection = useCallback((section: "top" | "bottom") => {
    if (previewMode === "full") return;

    const container = document.getElementById("preview-container");
    if (container) {
      const containerHeight = container.offsetHeight;
      const containerWidth = container.offsetWidth;
      const padding = 15; // Reduzido para ganhar espaço
      
      // Zoom focado: aproveita a largura mas mantém margem lateral pequena
      const focusScale = Math.min((containerWidth - 30) / 794, 1.05);
      
      let targetY = 0;
      if (section === "top") {
        // Alinha o topo do A4 exatamente com o topo do container (com margem mínima)
        // O transformOrigin é 'top center', então targetY é o deslocamento físico
        targetY = padding; 
      } else {
        // Alinha o fundo do A4 com o fundo do container
        // O documento escalado tem 1123 * focusScale de altura
        const scaledHeight = 1123 * focusScale;
        targetY = containerHeight - scaledHeight - padding;
      }

      setZoomScale(focusScale);
      setZoomTranslateY(targetY);
      setCurrentSection(section);
      setIsFocused(true);
    }
  }, [previewMode]);

  // Wrapper para compatibilidade e setas
  const handleFocusSection = (sectionId: string) => {
    const isTop = sectionId === "preview-header" || sectionId === "preview-patient" || sectionId === "preview-top";
    scrollToPreviewSection(isTop ? "top" : "bottom");
  };

  const togglePreviewSection = () => {
    scrollToPreviewSection(currentSection === "top" ? "bottom" : "top");
  };

  // Retornar ao estado original (Ver documento inteiro)
  const resetPreviewZoom = () => {
    setZoomScale(getFitScale());
    setZoomTranslateY(0);
    setIsFocused(false);
    setCurrentSection("top");
  };

  // Resetar zoom quando alternar para modo "Ver Inteiro"
  useEffect(() => {
    if (previewMode === "full") {
      resetPreviewZoom();
    }
  }, [previewMode, getFitScale]);

  // Ajustar escala inicial e ao redimensionar
  useEffect(() => {
    const handleResize = () => {
      if (!isFocused || previewMode === "full") setZoomScale(getFitScale());
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [getFitScale, isFocused, previewMode]);

  // ── Atualizar texto do atestado quando dias mudam ──────────────────────────
  useEffect(() => {
    const dias = parseInt(form.afastamento);
    if (!isNaN(dias) && dias >= 1 && dias <= 15) {
      const d = DIAS_EXTENSO[dias];
      if (!d) return;
      const unidade = dias === 1 ? "dia" : "dias";
      const novotextoFrase = `Necessita de ${d.num} (${d.ext}) ${unidade} de afastamento de suas atividades laborais para repouso e tratamento de saúde.`;

      if (documentType === 'relatorio') {
        // Para relatório médico, o texto é dinâmico apenas pelo sexo
        setForm(p => ({
          ...p,
          textoAtestado: TEXTO_RELATORIO_TEMPLATE(p.sexo === "MALE" ? "M" : "F")
        }));
      } else if (documentType === 'atestado') {
        setForm(p => {
          const actualText = p.textoAtestado || "";
          const regexFrase = /Necessita de [\s\S]*? de afastamento de suas atividades laborais para repouso e tratamento de saúde\.?/gi;
          const regexGenerica = /Necessita de \d+ \([^)]+\) dia\(s\)? de afastamento/gi;

          if (regexFrase.test(actualText)) {
            return { ...p, textoAtestado: actualText.replace(regexFrase, novotextoFrase) };
          } else if (regexGenerica.test(actualText)) {
            return { ...p, textoAtestado: actualText.replace(regexGenerica, `Necessita de ${d.num} (${d.ext}) ${unidade} de afastamento`) };
          } else {
            const textoBase = `Atesto para os devidos fins que o(a) paciente acima identificado(a) compareceu a esta unidade de saúde na data de hoje para atendimento médico. ${novotextoFrase}`;
            return { ...p, textoAtestado: textoBase };
          }
        });
      }
    }
  }, [form.afastamento, documentType]);

  // ── Mudar texto quando documentType muda (ATESTADO, LAUDO ou RELATORIO) ─────
  useEffect(() => {
    if (documentType === 'laudo') {
      setForm(p => ({ ...p, textoAtestado: TEXTO_LAUDO, modoCarimbo: true }));
    } else if (documentType === 'relatorio') {
      setForm(p => ({
        ...p,
        textoAtestado: TEXTO_RELATORIO_TEMPLATE(p.sexo === "MALE" ? "M" : "F"),
        modoCarimbo: false
      }));
    } else {
      // Atestado
      const dias = parseInt(form.afastamento);
      const d = DIAS_EXTENSO[dias] || DIAS_EXTENSO[3];
      const unidade = dias === 1 ? "dia" : "dias";
      const textoBase = `Atesto para os devidos fins que o(a) paciente acima identificado(a) compareceu a esta unidade de saúde na data de hoje para atendimento médico. Necessita de ${d.num} (${d.ext}) ${unidade} de afastamento de suas atividades laborais para repouso e tratamento de saúde.`;
      setForm(p => ({ ...p, textoAtestado: textoBase, modoCarimbo: true }));
    }
  }, [documentType]);

  // ── Carregar cidades quando UF muda ────────────────────────────────────────
  useEffect(() => {
    if (!filtroUF) { setCidades([]); setBairros([]); return; }
    apiFetch(`?action=cidades&uf=${filtroUF}`)
      .then((data: string[]) => {
        setCidades(data || []);
      })
      .catch(() => setCidades([]));
    setFiltroCidade("");
    setFiltroBairro("");
    setBairros([]);
    setLocais([]);
  }, [filtroUF]);

  // ── Carregar bairros e locais quando cidade muda ─────────────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!filtroUF || !filtroCidade) { setBairros([]); setLocais([]); return; }
    apiFetch(`?action=bairros&uf=${filtroUF}&cidade=${encodeURIComponent(filtroCidade)}`)
      .then((data: string[]) => setBairros(data || []))
      .catch(() => setBairros([]));
    // Carregar locais de trabalho
    apiFetch(`?action=locais&uf=${filtroUF}&cidade=${encodeURIComponent(filtroCidade)}`)
      .then((data: string[]) => setLocais(data || []))
      .catch(() => setLocais([]));
    setFiltroBairro("");
    setFiltroLocal("");
    // Preencher automaticamente instituicao como PREFEITURA DE {CIDADE}
    // unidade será preenchida ao selecionar o médico (local_trabalho)
    if (skipClearUnidade.current) {
      skipClearUnidade.current = false;
      setForm(p => ({
        ...p,
        instituicao: `PREFEITURA DE ${filtroCidade.toUpperCase()}`,
        cidade: filtroCidade.toUpperCase(),
      }));
    } else {
      setForm(p => ({
        ...p,
        instituicao: `PREFEITURA DE ${filtroCidade.toUpperCase()}`,
        unidade: "",
        cidade: filtroCidade.toUpperCase(),
      }));
    }
  }, [filtroUF, filtroCidade]);

  // ── Busca de médicos ─────────────────────────────────────────────────────────────────────────────────────
  const buscarMedicos = useCallback(async (autoSearch = false) => {
    const termo = termoBusca.trim().toUpperCase().replace(/[.\-]/g, "");
    if (!filtroUF) { if (!autoSearch) setErroBusca("Selecione a UF antes de buscar."); return; }
    // Permite busca sem termo se tiver cidade selecionada (igual ao elitedoc)
    if (termo.length < 3 && !filtroCidade) {
      if (!autoSearch) setErroBusca("Digite ao menos 3 caracteres do nome/CRM, ou selecione uma Cidade.");
      return;
    }
    setBuscando(true);
    setErroBusca("");
    setShowResultados(true);
    try {
      let params = `?uf=${filtroUF}&limit=50`;
      if (termo.length >= 3) {
        // Busca por nome ou CRM (igual ao elitedoc)
        params += `&q=${encodeURIComponent(termo)}`;
      } else if (filtroCidade) {
        // Sem termo: lista médicos da cidade (igual ao elitedoc)
        params += `&cidade=${encodeURIComponent(filtroCidade)}`;
        if (filtroBairro) params += `&bairro=${encodeURIComponent(filtroBairro)}`;
      }
      if (filtroEsp) params += `&esp=${encodeURIComponent(filtroEsp)}`;
      const data: MedicoDB[] = await apiFetch(params);
      setResultados(data);
      if (data.length === 0) setErroBusca("Nenhum médico encontrado. Tente outro nome ou preencha manualmente.");
    } catch {
      setErroBusca("Erro ao buscar. Verifique a conexão ou preencha manualmente.");
    } finally {
      setBuscando(false);
    }
  }, [termoBusca, filtroUF, filtroEsp, filtroCidade, filtroBairro]);

  // ── Busca automática ao selecionar cidade (igual ao elitedoc) ────────────────────────
  useEffect(() => {
    if (filtroUF && filtroCidade) {
      const timer = setTimeout(() => buscarMedicos(true), 300);
      return () => clearTimeout(timer);
    }
  }, [filtroUF, filtroCidade, buscarMedicos]);

  const selecionarMedico = (m: MedicoDB) => {
    const localTrabalho = m.local_trabalho?.toUpperCase() || "";
    const cidadeMedico = m.cidade?.toUpperCase() || "";
    setForm((p) => ({
      ...p,
      medico: m.nome_medico.toUpperCase(),
      crm: `CRM/${m.uf_crm || m.uf_local} ${m.crm}`,
      especialidade: (m.especialidade || "CLÍNICO GERAL").toUpperCase(),
      // instituicao = PREFEITURA DE {CIDADE} (sempre, pois é o órgão empregador pública)
      // unidade = local_trabalho do médico (UBS, UPA, Hospital, Clínica etc.)
      instituicao: cidadeMedico ? `PREFEITURA DE ${cidadeMedico}` : (p.instituicao || "CONSULTÓRIO MÉDICO"),
      unidade: localTrabalho || p.unidade,
      enderecoEmitente: (() => {
        const rua = (m.endereco || "").toUpperCase();
        const bairroM = (m.bairro || "").toUpperCase();
        const cidadeM = (m.cidade || "").toUpperCase();
        const ufM = (m.uf_local || "").toUpperCase();
        const parteRua = rua;
        const parteFinal = bairroM ? `${bairroM}, ${cidadeM}/${ufM}` : `${cidadeM}/${ufM}`;
        return parteRua ? `${parteRua} - ${parteFinal}` : parteFinal;
      })(),
      cidade: cidadeMedico || p.cidade,
    }));
    setShowResultados(false);
    setTermoBusca("");
    setShowEditar(true);
  };

  // ── Buscar CEP do paciente ─────────────────────────────────────────────────────────
  const buscarCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) return;
      const numero = cepNumero.trim();
      const parteRua = [data.logradouro, numero].filter(Boolean).join(", ");
      const parteBairro = data.bairro || "";
      const parteCidade = `${data.localidade}/${data.uf}`;
      const endFormatado = [parteRua, parteBairro ? `${parteBairro}, ${parteCidade}` : parteCidade]
        .filter(Boolean).join(" - ").toUpperCase();
      // Preencher cidade de emissão e UF automaticamente
      setCepUFPreenchida(data.uf?.toUpperCase() || "");
      setForm(p => ({
        ...p,
        endereco: endFormatado,
        cidade: data.localidade?.toUpperCase() || p.cidade,
      }));
    } catch { /* ignora erro silencioso */ }
    finally { setCepLoading(false); }
  };

  // ── Upload de logos ─────────────────────────────────────────────────────────────────
  const handleLogoUpload = async (side: "left" | "right", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const optimized = await optimizeImageForUpload(file, { maxWidth: 1200, maxHeight: 500, quality: 0.9 });
    if (side === "left") setLogoLeft(optimized);
    else setLogoRight(optimized);
  };

  // ── Upload de assinatura ────────────────────────────────────────────────────
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const optimized = await optimizeImageForUpload(file, { maxWidth: 1200, maxHeight: 350, quality: 0.88 });
    setSignatureImage(optimized);
  };

  // ── Máscara do documento do paciente ──────────────────────────────────────────
  const handleDocInput = (v: string) => {
    const masked = tipoDoc === "CPF" ? maskCPF(v) : maskCNS(v);
    setForm(p => ({ ...p, docValue: masked }));
    // Ao completar CPF (14 chars com máscara = 11 dígitos), buscar dados automaticamente
    if (tipoDoc === "CPF") {
      const digits = masked.replace(/\D/g, "");
      if (digits.length === 11) {
        setCpfStatus("idle");
        setCpfMsg("");
        buscarDadosCPF(masked);
      } else {
        setCpfStatus("idle");
        setCpfMsg("");
      }
    }
  };

  // ── Importação rápida ─────────────────────────────────────────────────────────────
  const processarImportacao = () => {
    if (!importTexto.trim()) return;

    // IMPORTANTE: Array ordenado — entradas mais específicas PRIMEIRO
    // Evita matches parciais (ex: "nome da mae" não deve ser capturado por "nome")
    // Evita "cidade de emissao" ser capturado por "cid"
    const mapaOrdenado: Array<[string, string]> = [
      // Paciente
      ["nome completo", "paciente"],
      ["nome da mae", "nomeMae"],
      ["tipo de doc (cpf ou cns)", "_tipoDoc"],
      ["tipo de doc", "_tipoDoc"],
      ["tipo doc", "_tipoDoc"],
      ["numero do doc", "docValue"],
      ["numero doc", "docValue"],
      ["data de nascimento", "nascimento"],
      ["data nascimento", "nascimento"],
      // Atestado
      ["dias de afastamento", "afastamento"],
      ["dias afastamento", "afastamento"],
      ["afastamento", "afastamento"],
      ["data do atestado", "dataAssinatura"],
      ["data atestado", "dataAssinatura"],
      ["horario do atendimento", "horaAssinatura"],
      ["horario atendimento", "horaAssinatura"],
      ["hora do atendimento", "horaAssinatura"],
      ["hora atendimento", "horaAssinatura"],
      // Paciente - endereço
      ["endereco do paciente", "endereco"],
      ["endereco paciente", "endereco"],
      ["cid (codigo da doenca)", "cid"],
      ["cid codigo da doenca", "cid"],
      ["cidade de emissao", "cidade"],
      ["cidade emissao", "cidade"],
      // Local de atendimento (emitente)
      ["local de atendimento", "unidade"],
      ["local atendimento", "unidade"],
      ["unidade de saude", "unidade"],
      ["unidade saude", "unidade"],
      ["unidade", "unidade"],
      ["endereco completo", "enderecoEmitente"],
      ["endereco emitente", "enderecoEmitente"],
      ["endereco da clinica", "enderecoEmitente"],
      // Médico
      ["especialidade", "especialidade"],
      ["nome completo medico", "medico"],
      ["nome medico", "medico"],
      ["medico", "medico"],
      ["crm", "crm"],
      // Genéricos por último
      ["nascimento", "nascimento"],
      ["sexo", "sexo"],
      ["mae", "nomeMae"],
      ["endereco", "endereco"],
      ["cid", "cid"],
      ["cidade", "cidade"],
      ["cpf", "docValue"],
      ["cns", "docValue"],
      ["nome", "paciente"],
      ["horario", "horaAssinatura"],
      ["hora", "horaAssinatura"],
      ["data", "dataAssinatura"],
    ];

    const normalize = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const updates: Partial<typeof form> = {};
    let newTipoDoc: "CPF" | "CNS" | null = null;

    importTexto.split("\n").forEach((linha) => {
      // Usar indexOf (PRIMEIRO ':') para separar chave de valor
      // Isso evita que "Horário do Atendimento: 14:35" seja cortado em "35"
      const idx = linha.indexOf(":");
      if (idx === -1) return;
      const chave = normalize(linha.substring(0, idx));
      // Pegar tudo após o primeiro ':' como valor
      const valor = linha.substring(idx + 1).trim().toUpperCase();
      if (!valor) return;

      for (const [label, field] of mapaOrdenado) {
        const labelNorm = normalize(label);
        // Match EXATO apenas (sem startsWith para evitar colisões)
        if (chave === labelNorm) {
          if (field === "_tipoDoc") {
            if (valor.includes("CNS")) newTipoDoc = "CNS";
            else if (valor.includes("CPF")) newTipoDoc = "CPF";
          } else if (field === "sexo") {
            (updates as any)[field] = valor.startsWith("M") ? "MALE" : "FEMALE";
          } else if (field === "nascimento" || field === "dataAssinatura") {
            const d = valor.replace(/\D/g, "");
            (updates as any)[field] = d.length === 8 ? `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4,8)}` : valor;
          } else if (field === "horaAssinatura") {
            // Formatar hora: pegar HH:MM do início do valor
            const h = valor.replace(/[^0-9:]/g, "");
            (updates as any)[field] = h.length >= 4 ? h.substring(0, 5) : valor;
          } else if (field === "docValue") {
            const digitsOnly = valor.replace(/\D/g, "");
            const isCNS = digitsOnly.length > 11;
            if (isCNS) { newTipoDoc = "CNS"; (updates as any)[field] = maskCNS(valor); }
            else { newTipoDoc = "CPF"; (updates as any)[field] = maskCPF(valor); }
          } else if (field === "afastamento") {
            // Extrair número de dias (1-15) do valor
            const diasMatch = valor.match(/(\d+)/);
            if (diasMatch) {
              const dias = parseInt(diasMatch[1]);
              if (dias >= 1 && dias <= 15) {
                (updates as any)["afastamento"] = String(dias);
                // Atualizar texto do atestado automaticamente
                const d = DIAS_EXTENSO[dias];
                if (d) {
                  const unidade = dias === 1 ? "dia" : "dias";
                  (updates as any)["textoAtestado"] = `Atesto para os devidos fins que o(a) paciente acima identificado(a) compareceu a esta unidade de saúde na data de hoje para atendimento médico. Necessita de ${d.num} (${d.ext}) ${unidade} de afastamento de suas atividades laborais para repouso e tratamento de saúde.`;
                }
              }
            }
          } else if (field === "cid") {
            // Para CID: extrair código e nome separadamente
            const cidRaw = valor; // Ex: "M54.5 (DOR LOMBAR BAIXA)"
            const cidCodeMatch = cidRaw.match(/^([A-Z]\d{2}\.?\d?)/i);
            const cidCode = cidCodeMatch ? cidCodeMatch[1].toUpperCase() : cidRaw.split(" ")[0];
            const cidNameMatch = cidRaw.match(/\(([^)]+)\)/);
            const cidName = cidNameMatch ? cidNameMatch[1] : "";
            (updates as any)["cid"] = cidCode;
            (updates as any)["cidDisplay"] = cidRaw;
            if (cidName) (updates as any)["cidNome"] = cidName;
          } else {
            (updates as any)[field as keyof typeof form] = valor;
          }
          break; // Parar no primeiro match
        }
      }
    });

    // Aplicar tipo de documento se detectado
    if (newTipoDoc) setTipoDoc(newTipoDoc);

    setForm((p) => ({ ...p, ...updates }));

    // 🔄 Sincronização de UF e Cidade para gatilhos de busca e fallbacks
    if (updates.cidade) {
      const cid = updates.cidade.toUpperCase();
      setFiltroCidade(cid);
      setForm(p => ({ ...p, instituicao: `PREFEITURA DE ${cid}`, cidade: cid }));
    }
    if ((updates as any)._uf) {
      setFiltroUF((updates as any)._uf.toUpperCase());
      setCepUFPreenchida((updates as any)._uf.toUpperCase());
    }
    if (updates.dataEmissao) {
      setForm(p => ({ ...p, dataAssinatura: updates.dataEmissao as string }));
    }

    setImportTexto("");
    setShowImport(false);
    // Feedback de quantos campos foram preenchidos
    const count = Object.keys(updates).filter(k => !k.startsWith("cid") || k === "cid").length;
    if (count > 0) {
      alert(`✅ ${count} campo(s) importado(s) com sucesso!`);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  //  // ── Download PDF ────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    try {
      setIsExporting(true);
      
      // Criar container isolado para exportação 1:1 (Padrão Atestados Salvos)
      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:white;";
      document.body.appendChild(container);
      
      // Clonar o documento para o container
      const clone = previewRef.current.cloneNode(true) as HTMLElement;
      clone.style.transform = "none";
      clone.style.margin = "0";
      container.appendChild(clone);

      await new Promise(r => setTimeout(r, 500));

      const docType = documentType === 'laudo' ? 'laudo' : 'atestado';
      const filename = generatePDFFilename(form.paciente || "PACIENTE", docType);
      
      await exportElementToPDF(clone, { 
        filename, 
        docType, 
        scale: 2, 
        quality: 0.92 
      });

      document.body.removeChild(container);
      setIsExporting(false);
    } catch (err) {
      setIsExporting(false);
      alert(`Erro ao gerar PDF: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  };

  // ── Auto-download do PDF após sucesso e redirecionamento ─────────────────
  useEffect(() => {
    if (showSuccessModal && !autoDownloadTriggered && previewRef.current) {
      setAutoDownloadTriggered(true);
      setIsDownloadingPdf(true);
      
      setTimeout(async () => {
        try {
          // Criar container isolado para exportação 1:1 (Padrão Atestados Salvos)
          const container = document.createElement("div");
          container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:white;";
          document.body.appendChild(container);
          
          const clone = previewRef.current!.cloneNode(true) as HTMLElement;
          clone.style.transform = "none";
          clone.style.margin = "0";
          container.appendChild(clone);

          await new Promise(r => setTimeout(r, 800));

          const docTypeForName = documentType === 'laudo' ? 'laudo' : documentType === 'relatorio' ? 'relatorio' : 'atestado';
          const filename = documentType === 'relatorio' 
            ? `RELATORIO_MEDICO_${(form.paciente || "PACIENTE").trim().toUpperCase().replace(/\s+/g, "_")}.pdf`
            : generatePDFFilename(form.paciente || "PACIENTE", docTypeForName as any);
          
          await exportElementToPDF(clone, { 
            filename, 
            docType: docTypeForName as any, 
            scale: 2, 
            quality: 0.92 
          });

          document.body.removeChild(container);

          // Após download, redireciona
          setTimeout(() => {
            setShowSuccessModal(false);
            navigate("/atestadosalvos");
          }, 800);
        } catch (err) {
          console.error("Erro ao fazer download automático:", err);
          setTimeout(() => {
            setShowSuccessModal(false);
            navigate("/atestadosalvos");
          }, 1500);
        } finally {
          setIsDownloadingPdf(false);
        }
      }, 300);
    }
  }, [showSuccessModal, autoDownloadTriggered, form.paciente, documentType, navigate, previewRef]);

  // ── Submit — EMISSÃO REAL (backend gera QR Code) ────────────────────────────
  // ── Buscar preço e mostrar modal de confirmação ──────────────────────────
  const handleShowConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { alert("Você precisa estar logado para emitir."); return; }
    // Validação de CPF universal
    if (tipoDoc === "CPF" && form.docValue && !validarCPF(form.docValue)) {
      alert("CPF inválido! Verifique os dígitos informados.");
      return;
    }

    if (hideQRCode) {
      // MODO OFFLINE / SEM QR CODE: Apenas gera PDF local sem bater no banco
      setIsLoading(true);
      await handleDownloadPdf();
      setIsLoading(false);
      setAutoDownloadTriggered(true); // Evita loop
      setShowSuccessModal(true);
      return;
    }

    // Buscar preço antes de mostrar o modal
    setPriceLoading(true);
    try {
      const res = await fetch("/api/pricing", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.pricing?.atestado) {
          setDocumentPrice(data.pricing.atestado.price);
        } else {
          setDocumentPrice(0);
        }
      } else {
        setDocumentPrice(0);
      }
    } catch {
      setDocumentPrice(0);
    } finally {
      setPriceLoading(false);
    }
    setShowConfirmModal(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) { alert("Você precisa estar logado para emitir."); return; }
    setShowConfirmModal(false);
    setIsLoading(true);
    try {
      const payload = {
        paciente: form.paciente.toUpperCase(),
        sexo: form.sexo,
        nascimento: form.nascimento,
        cpf: tipoDoc === "CPF" ? form.docValue : "",
        cns: tipoDoc === "CNS" ? form.docValue : "",
        tipoDoc,
        nomeMae: form.nomeMae.toUpperCase(),
        endereco: form.endereco.toUpperCase(),
        cid: form.cid.toUpperCase(),
        cidDisplay: form.cidDisplay,
        cidNome: form.cidNome,
        medico: form.medico.toUpperCase(),
        crm: form.crm,
        especialidade: form.especialidade.toUpperCase(),
        dataAssinatura: form.dataAssinatura,
        horaAssinatura: form.horaAssinatura,
        dataEmissao: form.dataEmissao,
        logoUrl: logoLeft || "",
        logoRight: logoRight || "",
        instituicao: form.instituicao || (form.cidade ? `PREFEITURA DE ${form.cidade.toUpperCase()}` : "CLÍNICA / HOSPITAL"),
        unidade: form.unidade,
        enderecoEmitente: form.enderecoEmitente,
        textoAtestado: form.textoAtestado,
        afastamento: form.afastamento,
        cidade: form.cidade,
        signatureColor,
        signatureImage,
        modoCarimbo: form.modoCarimbo,
        logoLeftScale,
        logoRightScale,
        logoLeftX,
        logoLeftY,
        logoRightX,
        logoRightY,
        stampScale,
        stampX,
        stampY,
        stampRotate,
        hideQRCode,
        showStampInfo,
        hideSignatureLine: form.hideSignatureLine,
        hidePatientSignature: form.hidePatientSignature,
        hideAfastamentoText: form.hideAfastamentoText,
        documentType,
      };

      const approxPayloadBytes = [logoLeft, logoRight, signatureImage].reduce((sum, item) => sum + getUploadSizeInBytes(item), 0);
      if (approxPayloadBytes > 3 * 1024 * 1024) {
        throw new Error("As imagens anexadas ficaram grandes demais para envio. Reduza logos/assinatura e tente novamente.");
      }

      const res = await fetch("/api/attestations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await parseJsonResponseSafely(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao emitir atestado");
      }

      const emittedCode = data.codigoQR || data.data?.codigoQR;
      setCreatedCode(emittedCode);
      if (data.newBalance !== undefined) updateBalance(data.newBalance);
      // Atualizar o preview com o código real para desbloquear o QR Code
      if (emittedCode) {
        setForm(prev => ({ ...prev, _emittedCode: emittedCode }));
      }
      setShowSuccessModal(true);
      setAutoDownloadTriggered(false); // Reset para próxima emissão
    } catch (error) {
      alert(`Erro ao emitir: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isFree = user?.role === 'admin' || (Array.isArray(user?.free_documents) && (
    (documentType === 'atestado' && user.free_documents.includes('atestado')) ||
    (documentType === 'laudo' && (user.free_documents.includes('laudocria') || user.free_documents.includes('toxicria')))
  ));

  console.log(`[AtestadoCria] documentType: ${documentType}, isFree: ${isFree}, Balance: ${user?.balance}`);

  // ── Preview data ────────────────────────────────────────────────────────────
  const previewData: AttestationData & Record<string, any> = {
    id: "XXXX.XXXX",
    paciente: form.paciente || "NOME DO PACIENTE",
    sexo: form.sexo,
    nascimento: form.nascimento || "DD/MM/AAAA",
    cpf: tipoDoc === "CPF" ? (form.docValue || "XXX.XXX.XXX-XX") : "",
    cns: tipoDoc === "CNS" ? (form.docValue || "XXX XXXX XXXX XXXX") : "",
    tipoDoc,
    nomeMae: form.nomeMae || "NOME DA MÃE",
    endereco: form.endereco || "ENDEREÇO COMPLETO",
    condicao: "",
    vacinacao: "",
    cid: form.cid,
    codigoQR: (form as any)._emittedCode || createdCode || "XXXX.XXXX",
    dataAssinatura: form.dataAssinatura || "DD/MM/AAAA",
    horaAssinatura: form.horaAssinatura || "HH:MM",
    medico: form.medico || "NOME DO MÉDICO",
    crm: form.crm || "CRM/UF 00000",
    especialidade: form.especialidade || "ESPECIALIDADE",
    dataEmissao: form.dataEmissao || "DD/MM/AAAA",
    dataEmissaoFormatada: (() => {
      if (!form.dataEmissao || form.dataEmissao.length < 10) return "";
      const [dd, mm, yyyy] = form.dataEmissao.split("/");
      const meses = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
      const m = parseInt(mm) - 1;
      const cidadeRaw = form.cidade || "";
      const cidadeLimpa = cidadeRaw.split("/")[0].trim().toUpperCase();
      return cidadeLimpa ? `${cidadeLimpa}, ${parseInt(dd)} DE ${meses[m] || mm} DE ${yyyy}` : `${parseInt(dd)} DE ${meses[m] || mm} DE ${yyyy}`;
    })(),
    logoUrl: logoLeft,
    logoRight: logoRight,
    instituicao: form.instituicao || (form.cidade ? `PREFEITURA DE ${form.cidade.toUpperCase()}` : "INSTITUÇÃO"),
    afastamento: form.afastamento,
    unidade: form.unidade || "LOCAL DE ATENDIMENTO",
    enderecoEmitente: form.enderecoEmitente || "ENDEREÇO COMPLETO",
    signatureColor,
    signatureImage,
    textoAtestado: form.textoAtestado,
    cidDisplay: form.cidDisplay || form.cid,
    cidNome: form.cidNome,
    cidade: form.cidade,
    uf: filtroUF,
    modoCarimbo: form.modoCarimbo,
    documentType,
    logoLeftScale,
    logoRightScale,
    logoLeftX,
    logoLeftY,
    logoRightX,
    logoRightY,
    hideAfastamentoText: form.hideAfastamentoText,
  };

  // ── Estilos ─────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    padding: "14px 16px",
    marginBottom: 12,
  };
  const secTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    color: "#005CA9",
    borderBottom: "2px solid #005CA9",
    paddingBottom: 5,
    marginBottom: 10,
  };
  const lbl: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#000",
    marginBottom: 3,
  };
  const inp: React.CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
    color: "#000",
  };
  const sel: React.CSSProperties = { ...inp, background: "#fff" };
  const btnBlue: React.CSSProperties = {
    background: "#005CA9",
    color: "#fff",
    border: "none",
    borderRadius: 7,
    padding: "8px 16px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    letterSpacing: 0.5,
  };
  const btnGreen: React.CSSProperties = {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 7,
    padding: "8px 16px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  };
  const btnGray: React.CSSProperties = {
    background: "#e2e8f0",
    color: "#000",
    border: "1px solid #cbd5e1",
    borderRadius: 7,
    padding: "8px 16px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  };  // ── Render ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", overflow: "hidden", background: "#fff", fontFamily: "Roboto, sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        /* Responsividade mobile para AtestadoCria */
        @media (max-width: 900px) {
          .atestado-layout { flex-direction: column !important; padding: 8px !important; overflow-y: auto !important; height: auto !important; }
          .atestado-form-col { width: 100% !important; max-height: none !important; overflow-y: visible !important; }
          .atestado-preview-col { display: none !important; }
          .atestado-header { flex-direction: column !important; gap: 6px !important; align-items: flex-start !important; flex-shrink: 0 !important; }
          .atestado-header-title { font-size: 13px !important; }
          .atestado-import-grid { grid-template-columns: 1fr !important; }
          .atestado-grid-2 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .atestado-card { padding: 10px 10px !important; }
          .atestado-btn-row { flex-direction: column !important; }
          .atestado-btn-row button { width: 100% !important; }
        }

        /* Modern Scrollbar para a coluna do formulário */
        .atestado-form-col::-webkit-scrollbar {
          width: 6px;
        }
        .atestado-form-col::-webkit-scrollbar-track {
          background: transparent;
        }
        .atestado-form-col::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .atestado-form-col::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        /* Garantir que o layout ocupe o espaço restante */
        .atestado-layout {
          height: calc(100vh - 60px);
          overflow: hidden;
        }
      `}</style>

      {/* ── Splash de Sucesso ── */}
      {showSuccessModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(255,255,255,0.92)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, padding: "48px 40px 36px",
            textAlign: "center", maxWidth: 340, width: "88%",
            boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
            animation: "fadeInScale 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            <style>{`
              @keyframes fadeInScale {
                from { opacity: 0; transform: scale(0.7); }
                to { opacity: 1; transform: scale(1); }
              }
              @keyframes drawCheck {
                from { stroke-dashoffset: 60; }
                to { stroke-dashoffset: 0; }
              }
            `}</style>
            {/* Círculo verde com checkmark animado */}
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              border: "3px solid #86efac",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", background: "#f0fdf4",
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="60" strokeDashoffset="0"
                  style={{ animation: "drawCheck 0.5s ease 0.2s both" }}
                />
              </svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>Sucesso!</h2>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 28px" }}>Documento emitido com sucesso!</p>
            <button
              style={{
                background: isDownloadingPdf ? "#9ca3af" : "#7c3aed", color: "#fff", border: "none",
                borderRadius: 10, padding: "12px 40px",
                fontWeight: 700, fontSize: 15, cursor: isDownloadingPdf ? "not-allowed" : "pointer",
                width: "100%",
              }}
              onClick={() => { setShowSuccessModal(false); navigate("/atestadosalvos"); }}
              disabled={isDownloadingPdf}
            >
              {isDownloadingPdf ? "⏳ Baixando PDF..." : "OK"}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmação de Preço ── */}
      {showConfirmModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9998, backdropFilter: "blur(3px)",
        }}>
          <div style={{
            background: "#fff", borderRadius: 18, padding: "36px 32px 28px",
            textAlign: "center", maxWidth: 380, width: "90%",
            boxShadow: "0 12px 48px rgba(0,0,0,0.18)",
          }}>
            {/* Ícone de documento */}
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "#fef3c7", border: "3px solid #fcd34d",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 18px", fontSize: 32,
            }}>📄</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>Confirmar Emissão</h2>
            <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.5 }}>
              Você está prestes a emitir um <strong>Atestado Médico</strong>.
            </p>
            {/* Tabela de custo */}
            <div style={{
              background: "#ffffff", borderRadius: 10, padding: "14px 18px",
              marginBottom: 20, border: "1px solid #e2e8f0",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Custo do documento:</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: (isFree || documentPrice === 0) ? "#16a34a" : "#dc2626" }}>
                  {isFree ? "Grátis (Plano Admin)" : documentPrice > 0 ? `R$ ${(documentPrice / 100).toFixed(2)}` : "Grátis"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>Seu saldo atual:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: (isFree || (user && user.balance >= documentPrice)) ? "#16a34a" : "#dc2626" }}>
                  R$ {user ? (user.balance / 100).toFixed(2) : "0,00"}
                </span>
              </div>
              {!isFree && documentPrice > 0 && user && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>Saldo após emissão:</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: user.balance - documentPrice >= 0 ? "#374151" : "#dc2626" }}>
                    R$ {((user.balance - documentPrice) / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            {/* Aviso de saldo insuficiente */}
            {!isFree && user && documentPrice > 0 && user.balance < documentPrice && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
                ⚠️ Saldo insuficiente! Recarregue seu saldo para continuar.
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #d1d5db", background: "#f9fafb", color: "#374151", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                onClick={() => setShowConfirmModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!!(!isFree && user && documentPrice > 0 && user.balance < documentPrice) || isLoading}
                style={{
                  flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
                  background: (!isFree && user && documentPrice > 0 && user.balance < documentPrice) || isLoading ? "#9ca3af" : "#16a34a",
                  color: "#fff", fontWeight: 700, fontSize: 14,
                  cursor: (!isFree && user && documentPrice > 0 && user.balance < documentPrice) || isLoading ? "not-allowed" : "pointer",
                }}
                onClick={() => handleSubmit()}
              >
                {isLoading ? "⏳ Emitindo..." : "✅ Confirmar e Emitir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="atestado-header" style={{ background: "#005CA9", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ ...btnGray, padding: "5px 12px", fontSize: 11 }} onClick={() => navigate("/dashboard")}>← VOLTAR</button>
          <h1 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>DocMaster — EMITIR ATESTADO</h1>
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", background: "rgba(0,0,0,0.15)", padding: "4px 12px", borderRadius: 6, fontWeight: 600 }}>
          🔒 Dados excluídos automaticamente após {validityDays} dias
        </span>
      </div>

      <div className="atestado-layout" style={{ display: "flex", gap: 10, padding: "10px", width: "100%", margin: 0, justifyContent: "flex-start" }}>

        {/* ═══ COLUNA ESQUERDA — FORMULÁRIO ═══ */}
        <div 
          className="atestado-form-col" 
          style={{ width: 612, flexShrink: 0, overflowY: "auto", maxHeight: "calc(100vh - 70px)" }}
          onClick={(e) => {
            // Se clicar na div de fundo (não nos inputs/botões), reseta o zoom
            if (e.target === e.currentTarget) resetPreviewZoom();
          }}
        >
          <form onSubmit={handleShowConfirm}>

            {/* ── Importação Rápida ── */}
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <p style={{ ...secTitle, margin: 0, border: "none", padding: 0 }}>📋 Importação Rápida de Dados</p>
                <button type="button" style={{ ...btnGray, padding: "3px 10px", fontSize: 11 }} onClick={() => setShowImport(!showImport)}>
                  {showImport ? "▲" : "▼"}
                </button>
              </div>
              {showImport && (
                <div className="atestado-import-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {/* Painel 1 — Modelo para enviar ao cliente */}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#005CA9", marginBottom: 6, textTransform: "uppercase" as const }}>1. Envie para o Cliente</p>
                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "8px 10px", fontFamily: "monospace", fontSize: 11, color: "#374151", lineHeight: 1.8, whiteSpace: "pre" as const }}>{`Nome Completo: \nTipo de Doc (CPF ou CNS): \nNúmero do Doc: \nNascimento: \nSexo (M/F): \nNome da Mãe: \nEndereço do Paciente: \nCID (Código da Doença): \nDias de Afastamento: \nCidade de Emissão: \nData do Atestado: \nHorário do Atendimento: \n\nLocal de Atendimento: \nEndereço Emitente: \nEspecialidade: \nMédico: \nCRM:`}</div>
                    <button
                      type="button"
                      style={{ ...btnBlue, width: "100%", marginTop: 8, fontSize: 11 }}
                      onClick={() => {
                        const modelo = `Nome Completo: \nTipo de Doc (CPF ou CNS): \nNúmero do Doc: \nNascimento: \nSexo (M/F): \nNome da Mãe: \nEndereço do Paciente: \nCID (Código da Doença): \nDias de Afastamento: \nCidade de Emissão: \nData do Atestado: \nHorário do Atendimento: \n\nLocal de Atendimento: \nEndereço Emitente: \nEspecialidade: \nMédico: \nCRM: `;
                        navigator.clipboard.writeText(modelo)
                          .then(() => alert("✅ Modelo copiado! Envie para o cliente preencher."))
                          .catch(() => {
                            const el = document.createElement("textarea");
                            el.value = modelo;
                            document.body.appendChild(el);
                            el.select();
                            document.execCommand("copy");
                            document.body.removeChild(el);
                            alert("✅ Modelo copiado!");
                          });
                      }}
                    >
                      📋 COPIAR MODELO
                    </button>
                  </div>
                  {/* Painel 2 — Colar resposta do cliente */}
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#005CA9", marginBottom: 6, textTransform: "uppercase" as const }}>2. Cole a Resposta</p>
                    <textarea
                      value={importTexto}
                      onChange={(e) => setImportTexto(e.target.value)}
                      rows={9}
                      placeholder={"Cole aqui os dados preenchidos..."}
                      style={{ ...inp, resize: "none", fontFamily: "monospace", fontSize: 11, height: 180 }}
                    />
                    <button type="button" style={{ ...btnBlue, width: "100%", marginTop: 8, fontSize: 11, background: "#16a34a" }} onClick={processarImportacao}>
                      ⚡ PROCESSAR DADOS
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── 1. Buscar Médico ── */}
            <div style={card}>
              <p style={secTitle}>🔍 1. Buscar Médico</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                <div>
                  <label style={lbl}>UF *</label>
                  <SearchSelect
                    label="UF"
                    value={filtroUF}
                    options={UFS}
                    placeholder="UF..."
                    onFocus={() => handleFocusSection("preview-header")}
                    onChange={(v) => { setFiltroUF(v); setFiltroCidade(""); setFiltroBairro(""); }}
                  />
                </div>
                <div>
                  <label style={lbl}>Cidade</label>
                  <SearchSelect
                    label="Cidade"
                    value={filtroCidade}
                    options={cidades}
                    placeholder={filtroUF ? "Cidade..." : "Selecione UF primeiro..."}
                    disabled={!filtroUF}
                    onFocus={() => handleFocusSection("preview-header")}
                    onChange={(v) => { setFiltroCidade(v); setFiltroBairro(""); }}
                  />
                </div>
                <div>
                  <label style={lbl}>Bairro</label>
                  <SearchSelect
                    label="Bairro"
                    value={filtroBairro}
                    options={bairros}
                    placeholder={filtroCidade ? "Bairro..." : "Selecione cidade primeiro..."}
                    disabled={!filtroCidade}
                    onFocus={() => handleFocusSection("preview-header")}
                    onChange={(v) => setFiltroBairro(v)}
                  />
                </div>
                <div>
                  <label style={lbl}>Especialidade</label>
                  <select style={sel} value={filtroEsp} onChange={(e) => setFiltroEsp(e.target.value)}>
                    {ESPECIALIDADES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={lbl}>Local (UPA, Clínica, Hospital...)</label>
                  <select style={sel} value={filtroLocal} onChange={(e) => setFiltroLocal(e.target.value)}>
                    <option value="">Todos os locais...</option>
                    {locais.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
                <input
                style={{ ...inp, marginBottom: 8 }}
                placeholder="DIGITE NOME OU CRM..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), buscarMedicos(false))}
              />
              <button type="button" style={{ ...btnBlue, width: "100%" }} onClick={() => buscarMedicos(false)} disabled={buscando}>
                {buscando ? "🔄 Buscando..." : "🔍 BUSCAR NO BANCO DE DADOS"}
              </button>
              {erroBusca && (
                <p style={{ fontSize: 11, color: "#dc2626", marginTop: 6, padding: "5px 8px", background: "#fef2f2", borderRadius: 6 }}>
                  {erroBusca}
                </p>
              )}
              {showResultados && resultados.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#005CA9", textAlign: "center", marginBottom: 4, textTransform: "uppercase" }}>
                    Médicos encontrados ({resultados.length})
                  </p>
                  <div style={{ maxHeight: 250, overflowY: "auto", border: "1px solid #005CA9", borderRadius: 8, background: "#fff" }}>
                    {resultados.map((m, i) => (
                      <div
                        key={m.id}
                        onClick={() => selecionarMedico(m)}
                        style={{
                          padding: "6px 12px",
                          borderBottom: "1px solid #eff6ff",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: i % 2 === 0 ? "#fff" : "#f8fafc",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f8fafc")}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <strong style={{ color: "#005CA9", fontSize: 12.5, textTransform: "uppercase" }}>{m.nome_medico}</strong>
                            <span style={{ color: "#666", fontSize: 11, fontWeight: 600 }}>CRM/{m.uf_crm || m.uf_local} {m.crm}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1.5 }}>
                            <span style={{ color: "#059669", fontSize: 10.5, fontWeight: 600 }}>{(m.especialidade || "CLINICO GERAL").toUpperCase()}</span>
                            {m.local_trabalho && <span style={{ color: "#64748b", fontSize: 10.5 }}>• {m.local_trabalho.toUpperCase()}</span>}
                          </div>
                        </div>
                        <button 
                          type="button" 
                          style={{ 
                            background: "#005CA9", 
                            color: "#fff", 
                            border: "none", 
                            borderRadius: 6, 
                            padding: "4px 10px", 
                            fontSize: 10, 
                            fontWeight: 700,
                            marginLeft: 12,
                            cursor: "pointer"
                          }}
                        >
                          SELECIONAR
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Editar Médico */}
              <details open={showEditar} style={{ marginTop: 10 }}>
                <summary
                  style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#005CA9", padding: "6px 0", listStyle: "none" }}
                  onClick={() => setShowEditar(!showEditar)}
                >
                  ✏️ EDITAR MÉDICO / LOCAL / ASSINATURA
                </summary>
                <div style={{ paddingTop: 10, display: "grid", gap: 8 }}>
                  <p style={{ ...secTitle, fontSize: 10 }}>Dados do Local</p>
                  <div>
                    <label style={lbl}>Instituição</label>
                    <input
                      style={inp}
                      value={form.instituicao}
                      onFocus={() => scrollToPreviewSection("top")}
                      onChange={(e) => setForm(p => ({ ...p, instituicao: e.target.value.toUpperCase() }))}
                      placeholder="Ex: PREFEITURA DE VOTORANTIM"
                    />
                  </div>
                  <div>
                    <label style={lbl}>Local de Atendimento</label>
                      <input
                        style={inp}
                        value={form.unidade}
                        onFocus={() => scrollToPreviewSection("top")}
                        onChange={(e) => setForm(p => ({ ...p, unidade: e.target.value }))}
                        placeholder="Ex: UBS CENTRO, UPA NORTE, HOSPITAL MUNICIPAL"
                      />
                    </div>
                    <div>
                      <label style={lbl}>Endereço Completo</label>
                      <input
                        style={{ ...inp, background: form.enderecoEmitente ? "#fff" : "#f8fafc" }}
                        value={form.enderecoEmitente}
                        onFocus={() => scrollToPreviewSection("top")}
                        onChange={(e) => setForm(p => ({ ...p, enderecoEmitente: e.target.value }))}
                        placeholder="Ex: RUA ANTÔNIO WALTER, 66 – CENTRO, VOTORANTIM/SP"
                      />
                      <span style={{ fontSize: 10, color: "#666", marginTop: 2, display: "block" }}>Preenchido automaticamente ao selecionar médico. Edite se necessário.</span>
                    </div>
                    <div>
                      <label style={lbl}>Especialidade</label>
                      <input
                        style={inp}
                        value={form.especialidade}
                        onFocus={() => scrollToPreviewSection("bottom")}
                        onChange={(e) => setForm(p => ({ ...p, especialidade: e.target.value }))}
                        placeholder="Ex: CLÍNICO GERAL, PEDIATRA"
                      />
                    </div>
                    <p style={{ ...secTitle, fontSize: 10 }}>Dados do Médico</p>
                    <div>
                      <label style={lbl}>Nome Completo</label>
                      <input
                        style={inp}
                        value={form.medico}
                        onFocus={() => scrollToPreviewSection("bottom")}
                        onChange={(e) => setForm(p => ({ ...p, medico: e.target.value }))}
                        placeholder="DR. NOME SOBRENOME"
                      />
                    </div>
                    <div>
                      <label style={lbl}>CRM (Ex: CRM/SP 12345)</label>
                      <input
                        style={inp}
                        value={form.crm}
                        onFocus={() => scrollToPreviewSection("bottom")}
                        onChange={(e) => setForm(p => ({ ...p, crm: e.target.value }))}
                        placeholder="CRM/SP 00000"
                      />
                    </div>
                    <p style={{ ...secTitle, fontSize: 10 }}>ASSINATURA & CARIMBO</p>
                    
                    {/* Modo Carimbo (Movido para cima de COR DA TINTA) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0 8px 0" }} onClick={() => scrollToPreviewSection("bottom")}>
                    <label style={{ ...lbl, margin: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={form.modoCarimbo}
                        onChange={(e) => setForm(p => ({ ...p, modoCarimbo: e.target.checked }))}
                        style={{ width: 16, height: 16 }}
                      />
                      Modo Carimbo (Elite 2.0)
                    </label>
                    </div>

                    <div>
                      <label style={lbl}>COR DA TINTA</label>
                      <select
                        style={sel}
                        value={signatureColor}
                        onFocus={() => scrollToPreviewSection("bottom")}
                        onChange={(e) => setSignatureColor(e.target.value)}
                      >
                        <option value="#0b109f">🔵 Azul Caneta (Padrão)</option>
                        <option value="#000000">⚫ Preto (Xerox)</option>
                      </select>
                    </div>

                    {/* Upload de Carimbo PNG */}
                    <div style={{ marginTop: 8 }}>
                      <label style={{ ...btnBlue, width: "100%", display: "block", textAlign: "center", padding: "8px 0", cursor: "pointer" }}>
                        📁 UPLOAD CARIMBO (PNG)
                        <input 
                          type="file" 
                          ref={signatureRef} 
                          accept="image/png" 
                          style={{ display: "none" }} 
                          onChange={handleSignatureUpload} 
                        />
                      </label>
                      {signatureImage && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                          <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>✅ Carimbo carregado</span>
                          <button type="button" style={{ background: "none", border: "none", color: "#dc2626", fontSize: 10, fontWeight: 700, cursor: "pointer" }} onClick={() => setSignatureImage("")}>Remover</button>
                        </div>
                      )}
                    </div>

                    {/* Ajuste de Carimbo Elite 2.0 */}
                    {form.modoCarimbo && (
                      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, background: "#f8fafc", marginTop: 8 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#005CA9", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                          🎮 AJUSTE DO CARIMBO ELITE
                        </p>

                        {/* Identificador de Coordenadas Elite */}
                        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "6px 8px", marginBottom: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px" }}>
                          <div style={{ fontSize: 10, color: "#1e40af", fontWeight: 700 }}>X: <span style={{ color: "#000" }}>{stampX}px</span></div>
                          <div style={{ fontSize: 10, color: "#1e40af", fontWeight: 700 }}>Y: <span style={{ color: "#000" }}>{stampY}px</span></div>
                          <div style={{ fontSize: 10, color: "#1e40af", fontWeight: 700 }}>ESCALA: <span style={{ color: "#000" }}>{Math.round(stampScale * 100)}%</span></div>
                          <div style={{ fontSize: 10, color: "#1e40af", fontWeight: 700 }}>GIRO: <span style={{ color: "#000" }}>{stampRotate}°</span></div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {/* Toggles */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px" }}>
                            <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                              <input type="checkbox" checked={hideQRCode} onChange={e => setHideQRCode(e.target.checked)} />
                              Ocultar QR Code
                            </label>
                            <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                              <input type="checkbox" checked={showStampInfo} onChange={e => setShowStampInfo(e.target.checked)} />
                              Dados Médico
                            </label>
                            <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                              <input 
                                type="checkbox" 
                                checked={form.hideSignatureLine} 
                                onChange={e => setForm(p => ({ ...p, hideSignatureLine: e.target.checked }))} 
                              />
                              Ocultar Assinatura e Carimbo
                            </label>
                            <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                              <input 
                                type="checkbox" 
                                checked={form.hidePatientSignature} 
                                onChange={e => setForm(p => ({ ...p, hidePatientSignature: e.target.checked }))} 
                              />
                              Ocultar Assin. Paciente
                            </label>
                          </div>

                          {/* Controles de Escala */}
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" onClick={() => setStampScale(v => Math.max(0.1, v + 0.1))} style={{ ...btnGray, flex: 1, padding: "5px 0", fontSize: 10 }}>🔍+ ZOOM</button>
                            <button type="button" onClick={() => setStampScale(v => Math.max(0.1, v - 0.1))} style={{ ...btnGray, flex: 1, padding: "5px 0", fontSize: 10 }}>🔍- ZOOM</button>
                          </div>

                          {/* Controles de Rotação */}
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" onClick={() => setStampRotate(v => v - 1)} style={{ ...btnGray, flex: 1, padding: "5px 0", fontSize: 10 }}>↺ GIRAR</button>
                            <button type="button" onClick={() => setStampRotate(v => v + 1)} style={{ ...btnGray, flex: 1, padding: "5px 0", fontSize: 10 }}>↻ GIRAR</button>
                          </div>

                          {/* Controles de Posição (Setas Rápidas) */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, width: "100%", maxWidth: 180, margin: "0 auto" }}>
                            <div />
                            <button type="button" onClick={() => setStampY(v => v - STAMP_POS_STEP)} style={{ ...btnGray, padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>▲</button>
                            <div />
                            
                            <button type="button" onClick={() => setStampX(v => v - STAMP_POS_STEP)} style={{ ...btnGray, padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>◀</button>
                            <button type="button" onClick={resetStampTransform} style={{ ...btnGray, padding: "6px 0", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>RESET</button>
                            <button type="button" onClick={() => setStampX(v => v + STAMP_POS_STEP)} style={{ ...btnGray, padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>▶</button>
                            
                            <div />
                            <button type="button" onClick={() => setStampY(v => v + STAMP_POS_STEP)} style={{ ...btnGray, padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>▼</button>
                            <div />
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                    </details>
                    </div>

                    {/* ── 2. Dados do Paciente ── */}
                    <div style={card}>
                    <p style={secTitle}>👤 2. Dados do Paciente</p>
                    <div style={{ display: "grid", gap: 8 }}>

                    {/* CPF ou CNS — PRIMEIRO para permitir preenchimento automático */}
                    <div>
                    <label style={lbl}>Tipo de Documento *</label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <button
                        type="button"
                        onClick={() => { setTipoDoc("CPF"); setForm(p => ({ ...p, docValue: "" })); setCpfStatus("idle"); setCpfMsg(""); scrollToPreviewSection("top"); }}
                        style={{
                          flex: 1, padding: "7px 0", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer",
                          background: tipoDoc === "CPF" ? "#005CA9" : "#e2e8f0",
                          color: tipoDoc === "CPF" ? "#fff" : "#374151",
                          border: tipoDoc === "CPF" ? "2px solid #005CA9" : "2px solid #d1d5db",
                        }}
                      >
                        CPF
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTipoDoc("CNS"); setForm(p => ({ ...p, docValue: "" })); setCpfStatus("idle"); setCpfMsg(""); scrollToPreviewSection("top"); }}
                        style={{
                          flex: 1, padding: "7px 0", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer",
                          background: tipoDoc === "CNS" ? "#005CA9" : "#e2e8f0",
                          color: tipoDoc === "CNS" ? "#fff" : "#374151",
                          border: tipoDoc === "CNS" ? "2px solid #005CA9" : "2px solid #d1d5db",
                        }}
                      >
                        CNS — Cartão Nacional de Saúde
                      </button>
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        style={{
                          ...inp,
                          borderColor: cpfStatus === "error" ? "#dc2626" : cpfStatus === "ok" ? "#16a34a" : undefined,
                          paddingRight: tipoDoc === "CPF" && cpfLoading ? 32 : undefined,
                        }}
                        value={form.docValue}
                        onFocus={() => scrollToPreviewSection("top")}
                        onChange={(e) => handleDocInput(e.target.value)}
                        placeholder={tipoDoc === "CPF" ? "000.000.000-00" : "000 0000 0000 0000"}
                        inputMode="numeric"
                        required
                      />
                      {tipoDoc === "CPF" && cpfLoading && (
                        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>⏳</span>
                      )}
                    </div>
                    {/* Botão de preenchimento manual via CPF */}
                    {tipoDoc === "CPF" && !cpfLoading && validarCPF(form.docValue) && cpfStatus !== "ok" && (
                      <button
                        type="button"
                        onClick={() => { buscarDadosCPF(form.docValue); scrollToPreviewSection("top"); }}
                        style={{
                          marginTop: 6, width: "100%", padding: "8px 0",
                          borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer",
                          background: "#005CA9", color: "#fff",
                          border: "2px solid #005CA9",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          transition: "background 0.2s",
                        }}
                      >
                        🔍 Buscar dados via CPF
                      </button>
                    )}
                    </div>

                    <div>
                    <label style={lbl}>Nome Completo *</label>
                    <input
                      style={{ ...inp, background: cpfStatus === "ok" && form.paciente ? "#f0fdf4" : undefined }}
                      value={form.paciente}
                      onFocus={() => scrollToPreviewSection("top")}
                      onChange={(e) => setForm(p => ({ ...p, paciente: e.target.value }))}
                      placeholder="Nome Completo do Paciente"
                      required
                    />
                    {cpfStatus === "ok" && form.paciente && (
                      <span style={{ fontSize: 10, color: "#16a34a", marginTop: 2, display: "block" }}>✅ Preenchido via CPF</span>
                    )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={lbl}>Sexo</label>
                      <select
                        style={{ ...sel, background: cpfStatus === "ok" ? "#f0fdf4" : undefined }}
                        value={form.sexo}
                        onFocus={() => scrollToPreviewSection("top")}
                        onChange={(e) => setForm(p => ({ ...p, sexo: e.target.value as "MALE" | "FEMALE" }))}
                      >
                        <option value="FEMALE">Feminino (F)</option>
                        <option value="MALE">Masculino (M)</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Data de Nascimento *</label>
                      <input
                        style={{ ...inp, background: cpfStatus === "ok" && form.nascimento ? "#f0fdf4" : undefined }}
                        value={form.nascimento}
                        onFocus={() => scrollToPreviewSection("top")}
                        onChange={(e) => setForm(p => ({ ...p, nascimento: handleDateInput(e.target.value) }))}
                        placeholder="DD/MM/AAAA"
                        maxLength={10}
                        inputMode="numeric"
                        required
                      />
                    </div>
                    </div>

                    <div>
                    <label style={lbl}>Nome da Mãe *</label>
                    <input
                      style={{ ...inp, background: cpfStatus === "ok" && form.nomeMae ? "#f0fdf4" : undefined }}
                      value={form.nomeMae}
                      onFocus={() => scrollToPreviewSection("top")}
                      onChange={(e) => setForm(p => ({ ...p, nomeMae: e.target.value }))}
                      placeholder="Nome da Mãe"
                      required
                    />
                    </div>
                    {/* CEP + Nº do paciente */}
                    <div>
                    <label style={lbl}>CEP do Paciente</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 6, alignItems: "center" }}>
                      <input
                        style={inp}
                        value={cepPaciente}
                        onFocus={() => scrollToPreviewSection("top")}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                          const fmt = v.length > 5 ? `${v.slice(0,5)}-${v.slice(5)}` : v;
                          setCepPaciente(fmt);
                          if (v.length === 8) buscarCEP(v);
                        }}
                        placeholder="00000-000"
                        inputMode="numeric"
                      />
                      <input
                        style={{ ...inp, width: 80 }}
                        value={cepNumero}
                        onFocus={() => scrollToPreviewSection("top")}
                        onChange={(e) => setCepNumero(e.target.value)}
                        placeholder="Nº"
                      />
                      <button
                        type="button"
                        style={{ ...btnBlue, padding: "6px 10px", fontSize: 11, whiteSpace: "nowrap" }}
                        onClick={() => { buscarCEP(cepPaciente); scrollToPreviewSection("top"); }}
                        disabled={cepLoading}
                      >
                        {cepLoading ? "🔄" : "🔍 CEP"}
                      </button>
                    </div>
                    </div>
                    <div>
                    <label style={lbl}>Endereço do Paciente *</label>
                    <input
                      style={inp}
                      value={form.endereco}
                      onFocus={() => scrollToPreviewSection("top")}
                      onChange={(e) => setForm(p => ({ ...p, endereco: e.target.value }))}
                      placeholder="Rua, Número, Bairro, Cidade/UF"
                      required
                    />
                    </div>
                    </div>
                    </div>

                    {/* ── 3. Dados Médicos ── */}
                    <div style={card}>
                    <p style={secTitle}>🩺 3. Dados Médicos</p>
                    <div style={{ display: "grid", gap: 8 }}>

                    {/* Tipo de Documento: Atestado ou Laudo */}
                    <div>
                    <label style={lbl}>Tipo de Documento *</label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <button
                        type="button"
                        onClick={() => { setDocumentType('atestado'); scrollToPreviewSection("bottom"); }}
                        style={{
                          flex: 1, padding: "7px 0", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer",
                          background: documentType === 'atestado' ? "#005CA9" : "#e2e8f0",
                          color: documentType === 'atestado' ? "#fff" : "#374151",
                          border: documentType === 'atestado' ? "2px solid #005CA9" : "2px solid #d1d5db",
                        }}
                      >
                        ATESTADO MÉDICO
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDocumentType('laudo'); scrollToPreviewSection("bottom"); }}
                        style={{
                          flex: 1, padding: "7px 0", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer",
                          background: documentType === 'laudo' ? "#005CA9" : "#e2e8f0",
                          color: documentType === 'laudo' ? "#fff" : "#374151",
                          border: documentType === 'laudo' ? "2px solid #005CA9" : "2px solid #d1d5db",
                        }}
                      >
                        LAUDO MÉDICO
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDocumentType('relatorio'); scrollToPreviewSection("bottom"); }}
                        style={{
                          flex: 1, padding: "7px 0", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer",
                          background: documentType === 'relatorio' ? "#005CA9" : "#e2e8f0",
                          color: documentType === 'relatorio' ? "#fff" : "#374151",
                          border: documentType === 'relatorio' ? "2px solid #005CA9" : "2px solid #d1d5db",
                        }}
                      >
                        RELATÓRIO MÉDICO
                      </button>
                    </div>
                    </div>

                    {/* Dias de Afastamento */}
                    <div>
                    <label style={lbl}>Dias de Afastamento (1-15)</label>
                    <select
                      style={sel}
                      value={form.afastamento}
                      onFocus={() => handleFocusSection("preview-top")}
                      onChange={(e) => setForm(p => ({ ...p, afastamento: e.target.value }))}
                    >
                      {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => {
                        const d = DIAS_EXTENSO[n];
                        const unidade = n === 1 ? "dia" : "dias";
                        return (
                          <option key={n} value={String(n)}>
                            {d.num} ({d.ext}) {unidade}
                          </option>
                        );
                      })}
                    </select>
                    {documentType === 'relatorio' && (
                      <label style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginTop: 6 }}>
                        <input 
                          type="checkbox" 
                          checked={!form.hideAfastamentoText} 
                          onChange={e => setForm(p => ({ ...p, hideAfastamentoText: !e.target.checked }))} 
                        />
                        Exibir prazo no Relatório
                      </label>
                    )}
                    </div>

                    {/* Texto do Atestado */}
                    <div>
                    <label style={lbl}>Texto do Atestado</label>
                    <textarea
                      value={form.textoAtestado}
                      onFocus={() => scrollToPreviewSection("bottom")}
                      onChange={(e) => setForm(p => ({ ...p, textoAtestado: e.target.value }))}
                      rows={5}
                      style={{ ...inp, resize: "vertical", lineHeight: 1.6 }}
                    />
                    </div>

                    {/* CID */}
                    <div>
                    <label style={lbl}>CID — Diagnóstico Rápido</label>
                    <select style={{ ...sel, marginBottom: 6 }} value=""
                      onFocus={() => scrollToPreviewSection("bottom")}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const [code, ...rest] = e.target.value.split(" ");
                        setForm(p => ({ ...p, cidDisplay: code, cidNome: rest.join(" "), cid: e.target.value }));
                      }}>
                      <option value="">Selecione um diagnóstico...</option>
                      {CIDS_CATEGORIZADOS.map((g) => (
                        <optgroup key={g.grupo} label={g.grupo}>
                          {g.itens.map((c) => (
                            <option key={c.code} value={`${c.code} ${c.desc.toUpperCase()}`}>
                              {c.code} — {c.desc}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 6 }}>
                      <input style={inp} value={form.cidDisplay} onFocus={() => scrollToPreviewSection("bottom")} onChange={(e) => setForm(p => ({ ...p, cidDisplay: e.target.value }))} placeholder="Código (Ex: J11)" />
                      <input style={inp} value={form.cidNome} onFocus={() => scrollToPreviewSection("bottom")} onChange={(e) => setForm(p => ({ ...p, cidNome: e.target.value }))} placeholder="Nome do CID" />
                    </div>
                    </div>
                    </div>
                    </div>

                    {/* ── 4. Data de Emissão ── */}
                    <div style={card}>
                    <p style={secTitle}>📅 4. Data de Emissão</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                    <label style={lbl}>Cidade de Emissão</label>
                    <div style={{ position: "relative" }}>
                      <input
                        style={{ ...inp, paddingRight: cepUFPreenchida ? 28 : undefined }}
                        value={form.cidade}
                        onFocus={() => scrollToPreviewSection("bottom")}
                        onChange={(e) => setForm(p => ({ ...p, cidade: e.target.value.toUpperCase() }))}
                        placeholder="Ex: SÃO PAULO"
                      />
                    </div>
                    </div>
                    <div>
                    <label style={lbl}>UF</label>
                    <div style={{ position: "relative" }}>
                      <input
                        style={{ ...inp, textTransform: "uppercase" }}
                        value={cepUFPreenchida}
                        onFocus={() => scrollToPreviewSection("bottom")}
                        onChange={(e) => setCepUFPreenchida(e.target.value.toUpperCase().slice(0, 2))}
                        placeholder="Ex: SP"
                        maxLength={2}
                      />
                    </div>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                    <label style={lbl}>Data de Emissão *</label>
                    <input
                      style={inp}
                      type="date"
                      value={(() => {
                        if (!form.dataEmissao || form.dataEmissao.length < 10) return "";
                        const [dd, mm, yyyy] = form.dataEmissao.split("/");
                        return `${yyyy}-${mm}-${dd}`;
                      })()}
                      onFocus={() => scrollToPreviewSection("bottom")}
                      onChange={(e) => {
                        const val = e.target.value; // YYYY-MM-DD
                        if (!val) return;
                        const [yyyy, mm, dd] = val.split("-");
                        const formatted = `${dd}/${mm}/${yyyy}`;
                        setForm(p => ({ ...p, dataEmissao: formatted, dataAssinatura: formatted }));
                      }}
                      required
                    />
                    </div>
                    <div>
                    <label style={lbl}>Hora da Assinatura</label>
                    <input style={inp} type="time" value={form.horaAssinatura} onFocus={() => scrollToPreviewSection("bottom")} onChange={(e) => setForm(p => ({ ...p, horaAssinatura: e.target.value }))} />
                    </div>
                    </div>

                    {/* ── Logos ── */}
                    <div style={{ marginTop: 16 }}>
                    <p style={{ ...secTitle, marginBottom: 10 }}>🖼 Logos do Documento</p>

                    {/* Seletor de lado */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <button
                      type="button"
                      onClick={() => { setLogoSide("left"); scrollToPreviewSection("top"); }}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer",
                        background: logoSide === "left" ? "#005CA9" : "#e2e8f0",
                        color: logoSide === "left" ? "#fff" : "#374151",
                        border: "none",
                      }}
                    >
                      ← LOGO ESQUERDA
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLogoSide("right"); scrollToPreviewSection("top"); }}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer",
                        background: logoSide === "right" ? "#005CA9" : "#e2e8f0",
                        color: logoSide === "right" ? "#fff" : "#374151",
                        border: "none",
                      }}
                    >
                      LOGO DIREITA →
                    </button>
                    </div>

                    {/* Preview do lado selecionado */}
                    <div style={{
                    width: "100%", height: 80, border: "2px dashed #d1d5db", borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", background: "#f9fafb", marginBottom: 8,
                    }} onClick={() => scrollToPreviewSection("top")}>
                    {(logoSide === "left" ? logoLeft : logoRight) ? (
                      <img
                        src={logoSide === "left" ? logoLeft : logoRight}
                        alt="Logo"
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ textAlign: "center" }}>
                        <p style={{ fontSize: 11, color: "#000", fontWeight: 700, margin: 0 }}>SEM LOGO</p>
                      </div>
                    )}
                    </div>

                    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <label style={{ ...btnBlue, flex: 1, display: "block", textAlign: "center", padding: "7px 0", cursor: "pointer", fontSize: 11 }}>
                      📁 ENVIAR LOGO
                      <input
                        type="file" accept="image/*" style={{ display: "none" }}
                        onChange={(e) => { handleLogoUpload(logoSide, e); scrollToPreviewSection("top"); }}
                      />
                    </label>
                    <button
                      type="button"
                      style={{ ...btnGray, flex: 1, fontSize: 11, padding: "7px 0" }}
                      onClick={() => {
                        if (logoSide === "left") { setLogoLeft(""); if (logoLeftRef.current) logoLeftRef.current.value = ""; }
                        else { setLogoRight(""); if (logoRightRef.current) logoRightRef.current.value = ""; }
                        scrollToPreviewSection("top");
                      }}
                    >
                      ✕ REMOVER
                    </button>
                    </div>

                    {/* Ajuste de Posição e Escala (Restaurado) */}
                    <div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 12, marginBottom: 12 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#005CA9", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                        🎮 AJUSTE DE POSIÇÃO ({logoSide === "left" ? "ESQUERDA" : "DIREITA"})
                      </p>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {/* Controles de Escala */}
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => adjustScale(logoSide, SCALE_STEP)} style={{ ...btnGray, flex: 1, padding: "5px 0", fontSize: 10 }}>🔍+ ZOOM</button>
                          <button type="button" onClick={() => adjustScale(logoSide, -SCALE_STEP)} style={{ ...btnGray, flex: 1, padding: "5px 0", fontSize: 10 }}>🔍- ZOOM</button>
                        </div>

                        {/* Controles de Posição (Setas) */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, width: "100%", maxWidth: 180, margin: "0 auto" }}>
                          <div />
                          <button type="button" onClick={() => adjustY(logoSide, -POS_STEP)} style={{ ...btnGray, padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>▲</button>
                          <div />
                          
                          <button type="button" onClick={() => adjustX(logoSide, -POS_STEP)} style={{ ...btnGray, padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>◀</button>
                          <button type="button" onClick={() => resetLogoTransform(logoSide)} style={{ ...btnGray, padding: "6px 0", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>RESET</button>
                          <button type="button" onClick={() => adjustX(logoSide, POS_STEP)} style={{ ...btnGray, padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>▶</button>
                          
                          <div />
                          <button type="button" onClick={() => adjustY(logoSide, POS_STEP)} style={{ ...btnGray, padding: "6px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>▼</button>
                          <div />
                        </div>
                      </div>
                    </div>

                    {/* Galeria de Logos Padrão */}
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                    Logos Padrão — Clique para aplicar no lado selecionado ({logoSide === "left" ? "Esquerda" : "Direita"})
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {LOGOS_PADRAO.map((logo) => {
                      const currentLogo = logoSide === "left" ? logoLeft : logoRight;
                      const isSelected = currentLogo === logo.src;
                      return (
                        <div
                          key={logo.id}
                          onClick={() => { logoSide === "left" ? setLogoLeft(logo.src) : setLogoRight(logo.src); scrollToPreviewSection("top"); }}
                          style={{
                            border: isSelected ? "2px solid #005CA9" : "1px solid #e5e7eb",
                            borderRadius: 6, padding: 4, cursor: "pointer", background: isSelected ? "#eff6ff" : "#fff",
                            height: 44, display: "flex", alignItems: "center", justifyContent: "center",
                            overflow: "hidden",
                          }}
                          title={logo.label}
                        >
                          <img src={logo.src} alt={logo.label} style={{ maxWidth: "100%", maxHeight: 36, objectFit: "contain" }} />
                        </div>
                      );
                    })}
                    </div>
                    </div>
                    </div>
            {/* Botões de Ação */}
            <div style={{ display: "flex", gap: 10, paddingBottom: 20 }}>
              <button type="button" style={{ ...btnGray, flex: 1 }} onClick={() => navigate("/dashboard")}>CANCELAR</button>
              <button
                type="submit"
                disabled={isLoading || priceLoading}
                style={{ ...btnGreen, flex: 2, opacity: (isLoading || priceLoading) ? 0.7 : 1, fontSize: 14, padding: "12px 0" }}
              >
                {isLoading ? "⏳ Emitindo..." : priceLoading ? "⏳ Verificando..." : "✅ CONFIRMAR E EMITIR"}
              </button>
            </div>

          </form>
        </div>

        {/* ═══ COLUNA DIREITA — PREVIEW ═══ */}
        <div className="atestado-preview-col" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
          
          {/* Controles Flutuantes do Preview Inteligente */}
          <div style={{ 
            position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)", 
            display: "flex", flexDirection: "column", gap: 10, zIndex: 100 
          }}>
            <button
              type="button"
              onClick={() => scrollToPreviewSection("top")}
              style={{
                width: 44, height: 44, borderRadius: "50%", background: currentSection === "top" ? "#005CA9" : "#fff",
                color: currentSection === "top" ? "#fff" : "#005CA9", border: "2px solid #005CA9",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 20, transition: "all 0.2s"
              }}
              title="Ver Parte Superior"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={resetPreviewZoom}
              style={{
                width: 44, height: 44, borderRadius: "50%", background: !isFocused ? "#005CA9" : "#fff",
                color: !isFocused ? "#fff" : "#005CA9", border: "2px solid #005CA9",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 18, transition: "all 0.2s"
              }}
              title="Ver Documento Inteiro"
            >
              🔍
            </button>
            <button
              type="button"
              onClick={() => scrollToPreviewSection("bottom")}
              style={{
                width: 44, height: 44, borderRadius: "50%", background: currentSection === "bottom" ? "#005CA9" : "#fff",
                color: currentSection === "bottom" ? "#fff" : "#005CA9", border: "2px solid #005CA9",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: 20, transition: "all 0.2s"
              }}
              title="Ver Parte Inferior"
            >
              ▼
            </button>
          </div>

          <div id="preview-container" style={{ 
            flex: 1, overflow: "hidden", background: "#ffffff", borderRadius: 10, 
            padding: "0", maxHeight: "calc(100vh - 84px)", // Altura maximizada
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            position: "relative"
          }}>
            {/* A4: 794px x 1123px @ 96dpi */}
            <div style={{ 
              width: 794, 
              flexShrink: 0,
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)", // Sombra mais elegante
              transform: `scale(${zoomScale}) translateY(${zoomTranslateY}px)`,
              transformOrigin: "top center",
              transition: "transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
            }}>
              <AttestationDocument
                ref={previewRef}
                data={previewData}
                logoLeft={logoLeft}
                logoRight={logoRight}
                signatureColor={signatureColor}
                signatureImage={signatureImage}
                documentType={documentType}
                logoLeftScale={logoLeftScale}
                logoRightScale={logoRightScale}
                logoLeftX={logoLeftX}
                logoLeftY={logoLeftY}
                logoRightX={logoRightX}
                logoRightY={logoRightY}
                stampScale={stampScale}
                stampX={stampX}
                stampY={stampY}
                stampRotate={stampRotate}
                hideQRCode={hideQRCode}
                showStampInfo={showStampInfo}
                hideSignatureLine={form.hideSignatureLine}
                hidePatientSignature={form.hidePatientSignature}
                hideAfastamentoText={form.hideAfastamentoText}
                isExporting={isExporting}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
