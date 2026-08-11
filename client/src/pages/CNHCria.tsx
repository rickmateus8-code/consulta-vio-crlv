/**
 * CNHCria — Gerador de CNH Digital em Etapas (1:1 ELITEDOC.STORE / DOCMASTER.STORE)
 *
 * Etapas:
 * 1. AUTOMAÇÃO (WhatsApp Copiar / Colar e Preencher)
 * 2. 1. PESSOAIS (Nome, CPF, Sexo, RG, Órgão, UF, Nascimento, Pai, Mãe)
 * 3. 2. CNH (Nº Registro, Nº Espelho, Categorias, Tipo, Datas, Assinaturas Digitais)
 * 4. 3. FINALIZAÇÃO (Foto 3x4 + Controles, Assinatura por Texto/Foto + Posição/Zoom, Senha App & Observações EAR)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import CNHDocument, { type CNHDocumentHandle, type CNHDocumentProps } from "../components/CNHDocument";
import { toast } from "sonner";
import { validarCPF, formatarCPF as formatarCPFUtil, displayDateToHtml } from "@/lib/utils";
import EmissionModal from "@/components/EmissionModal";
import { snoopPerfilCPF } from "@/lib/snoopApi";
import {
  ArrowLeft, Save, Download, MessageCircle, Copy, Zap,
  Upload, Lock, Check, User, Camera, Car, RefreshCw, ZoomIn, ZoomOut,
  RotateCcw, AlertTriangle, ArrowRight, ArrowUp, ArrowDown, Maximize2, Sparkles, Search
} from "lucide-react";

// ─── Constantes ──────────────────────────────────────────────────────────────
const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const MODELO_TEXTO = `Nome Completo: 
CPF: 
Sexo: 
RG: 
Orgão Emissor: 
UF RG: 
Nacionalidade: BRASILEIRO(A)
Data Nascimento: 
Local Nascimento: 
UF Nasc: 
Nome do Pai: 
Nome da Mãe: 
Categoria: 
Tipo: 
Validade: 
Emissão: 
1ª Habilitação: 
Local Emissão: 
UF Emissão: 
Senha App: 
Observações: `;

const ESTILOS_ASS = [
  { label: "Estilo 1 (Dancing Script - Cursiva Clássica)", font: "'Dancing Script', cursive" },
  { label: "Estilo 2 (Great Vibes - Caligrafia Oficial)", font: "'Great Vibes', cursive" },
  { label: "Estilo 3 (Sacramento - Cursiva Fina Elegante)", font: "'Sacramento', cursive" },
  { label: "Estilo 4 (Alex Brush - Assinatura Fluida)", font: "'Alex Brush', cursive" },
  { label: "Estilo 5 (Satisfy - Traço Manual Autêntico)", font: "'Satisfy', cursive" },
  { label: "Estilo 6 (Caveat - Cursiva Moderna)", font: "'Caveat', cursive" },
  { label: "Estilo 7 (Allura - Caligrafia Suave)", font: "'Allura', cursive" },
  { label: "Estilo 8 (Pinyon Script - Assinatura Formal)", font: "'Pinyon Script', cursive" },
];

function gerarNumero(len: number): string {
  let r = "";
  for (let i = 0; i < len; i++) r += Math.floor(Math.random() * 10).toString();
  return r;
}

function formatarCPFInput(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function gerarCPFValido(): string {
  let cpf = "";
  for (let i = 0; i < 9; i++) cpf += Math.floor(Math.random() * 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  cpf += d1;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  cpf += d2;
  return formatarCPFInput(cpf);
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export default function CNHCria() {
  const { user, updateBalance } = useAuth();
  const [, setLocation] = useLocation();
  const docRef = useRef<CNHDocumentHandle>(null);

  // Etapa ativa
  const [etapa, setEtapa] = useState<"automacao" | "pessoais" | "cnh" | "finalizacao">("automacao");

  // Estados do formulário
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [codigoQR, setCodigoQR] = useState("");
  const [importText, setImportText] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [documentPrice, setDocumentPrice] = useState(0);

  // Checkboxes de Categorias individuais
  const [catsSelected, setCatsSelected] = useState<Record<string, boolean>>({
    A: false, B: true, C: false, D: false, E: false
  });

  // Combo Toxicológico
  const [liberarToxicologico, setLiberarToxicologico] = useState(false);

  // Foto 3x4 ajustes
  const [fotoScale, setFotoScale] = useState(1.0);
  const [fotoOffsetX, setFotoOffsetX] = useState(0);
  const [fotoOffsetY, setFotoOffsetY] = useState(0);

  // Assinatura ajustes
  const [assModo, setAssModo] = useState<"texto" | "foto">("texto");
  const [assTexto, setAssTexto] = useState("");
  const [assEstilo, setAssEstilo] = useState(0);
  const [assScale, setAssScale] = useState(1.0);
  const [assOffsetX, setAssOffsetX] = useState(0);
  const [assOffsetY, setAssOffsetY] = useState(0);

  const [editId, setEditId] = useState<string | null>(null);
  const [origemTabela, setOrigemTabela] = useState<string | null>(null);

  const [data, setData] = useState<CNHDocumentProps>({
    nome: "", cpf: "", rg: "", orgaoEmissor: "", ufRG: "",
    sexo: "", nacionalidade: "BRASILEIRO(A)", dataNascimento: "",
    localNascimento: "", ufNascimento: "", nomePai: "", nomeMae: "",
    categoria: "B", tipo: "Definitiva", registro: "", espelho: "",
    validade: "", validadeCNH2: "", dataEmissao: "", primeiraHabilitacao: "",
    localEmissao: "", ufEmissao: "SP", assDigital1: "", assDigital2: "",
    senhaApp: "", observacoes: "", fotoUrl: "", assinaturaUrl: "",
    codigoQR: "PREVIEW", blurred: true,
  });

  const routeParams = useParams<{ id?: string }>();

  // Carregar documento se em edição (suporta /cnh/editar/:id ou ?edit_id=UUID)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get("edit_id");
    const routeId = routeParams?.id;
    const id = routeId || queryId;
    const orig = urlParams.get("origem_tabela");

    if (id) {
      setEditId(id);
      if (orig) setOrigemTabela(orig);
      setLoading(true);
      fetch(`/api/documents/${id}`, { credentials: "include" })
        .then(res => res.json())
        .then(result => {
          if (result.success && result.data) {
            const doc = result.data;
            let docData: any = {};
            try { docData = typeof doc.data === "string" ? JSON.parse(doc.data) : (doc.data || {}); } catch { docData = {}; }
            const mergedData = {
              ...docData,
              nome: doc.nome || docData.nome || "",
              cpf: doc.cpf || docData.cpf || "",
              categoria: doc.categoria || docData.categoria || "B",
              codigoQR: doc.codigo_qr || doc.codigo_validacao || doc.id || "PREVIEW",
              blurred: false,
            };
            setData(mergedData);
            setCodigoQR(doc.codigo_qr || doc.codigo_validacao || doc.id);
            setSaved(true);

            if (docData.fotoScale !== undefined) setFotoScale(docData.fotoScale);
            if (docData.fotoOffsetX !== undefined) setFotoOffsetX(docData.fotoOffsetX);
            if (docData.fotoOffsetY !== undefined) setFotoOffsetY(docData.fotoOffsetY);
            if (docData.assScale !== undefined) setAssScale(docData.assScale);
            if (docData.assOffsetX !== undefined) setAssOffsetX(docData.assOffsetX);
            if (docData.assOffsetY !== undefined) setAssOffsetY(docData.assOffsetY);
            if (docData.liberarToxicologico !== undefined) setLiberarToxicologico(docData.liberarToxicologico);
          }
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }
  }, [routeParams?.id]);

  const update = useCallback((field: keyof CNHDocumentProps) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let val = e.target.value;
    if (field === "cpf") val = formatarCPFInput(val);
    if (field === "rg") val = val.replace(/\./g, "");
    setData(d => ({ ...d, [field]: val }));
  }, []);

  const limparFormulario = () => {
    setData({
      nome: "", cpf: "", rg: "", orgaoEmissor: "", ufRG: "",
      sexo: "", nacionalidade: "BRASILEIRO(A)", dataNascimento: "",
      localNascimento: "", ufNascimento: "", nomePai: "", nomeMae: "",
      categoria: "B", tipo: "Definitiva", registro: "", espelho: "",
      validade: "", validadeCNH2: "", dataEmissao: "", primeiraHabilitacao: "",
      localEmissao: "", ufEmissao: "SP", assDigital1: "", assDigital2: "",
      senhaApp: "", observacoes: "", fotoUrl: "", assinaturaUrl: "",
      codigoQR: "PREVIEW", blurred: true,
    });
    setFotoScale(1.0); setFotoOffsetX(0); setFotoOffsetY(0);
    setAssScale(1.0); setAssOffsetX(0); setAssOffsetY(0);
    setImportText("");
    setSaved(false);
    toast.info("Formulário limpo com sucesso!");
  };

const MAPA_UFS: Record<string, string> = {
  "ACRE": "AC", "ALAGOAS": "AL", "AMAPA": "AP", "AMAZONAS": "AM", "BAHIA": "BA",
  "CEARA": "CE", "DISTRITO FEDERAL": "DF", "ESPIRITO SANTO": "ES", "GOIAS": "GO",
  "MARANHAO": "MA", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS", "MINAS GERAIS": "MG",
  "PARA": "PA", "PARAIBA": "PB", "PARANA": "PR", "PERNAMBUCO": "PE", "PIAUI": "PI",
  "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS",
  "RONDONIA": "RO", "RORAIMA": "RR", "SANTA CATARINA": "SC", "SAO PAULO": "SP",
  "SÃO PAULO": "SP", "SERGIPE": "SE", "TOCANTINS": "TO"
};

function normalizeUF(val?: string): string {
  if (!val) return "SP";
  const clean = val.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (clean.length === 2 && UFS.includes(clean)) return clean;
  if (MAPA_UFS[clean]) return MAPA_UFS[clean];
  const foundKey = Object.keys(MAPA_UFS).find(k => k === clean || clean.includes(k));
  if (foundKey) return MAPA_UFS[foundKey];
  return clean.slice(0, 2) || "SP";
}

  // ─── GERADORES AUTOMÁTICOS ───────────────────────────────────────────────
  const handleAutoRegistro = () => setData(d => ({ ...d, registro: gerarNumero(11) }));
  const handleAutoEspelho = () => setData(d => ({ ...d, espelho: gerarNumero(10) }));
  const handleAutoAss1 = () => setData(d => ({ ...d, assDigital1: gerarNumero(10) }));
  const handleAutoAss2 = () => {
    const ufSigla = normalizeUF(data.ufEmissao || data.ufNascimento || "SP");
    setData(d => ({ ...d, assDigital2: ufSigla + gerarNumero(8) }));
  };

  // Gerador Estimado Opcional de 1ª Habilitação
  const handleGerarPrimeiraHabEstimada = () => {
    if (!data.dataNascimento) {
      toast.error("Preencha a Data de Nascimento para calcular a 1ª Habilitação estimada!");
      return;
    }
    let dateNasc: Date | null = null;
    const cleanNasc = data.dataNascimento.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanNasc)) {
      const [y, m, d] = cleanNasc.split("-").map(Number);
      dateNasc = new Date(y, m - 1, d);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanNasc)) {
      const [d, m, y] = cleanNasc.split("/").map(Number);
      dateNasc = new Date(y, m - 1, d);
    }
    if (!dateNasc || isNaN(dateNasc.getTime())) {
      toast.error("Data de Nascimento inválida!");
      return;
    }

    const year18 = dateNasc.getFullYear() + 18;
    const month = String(dateNasc.getMonth() + 1).padStart(2, "0");
    const day = String(Math.min(dateNasc.getDate(), 28)).padStart(2, "0");
    const primeiraHabStr = `${year18}-${month}-${day}`;

    setData(d => ({ ...d, primeiraHabilitacao: primeiraHabStr }));
    toast.success(`1ª Habilitação estimada gerada: ${day}/${month}/${year18} (Aos 18 anos)`);
  };

  // ─── CÁLCULO AUTOMÁTICO DE VALIDADE DA CNH (REGRA DE TRÂNSITO BRASILEIRA) ───
  useEffect(() => {
    if (!data.dataEmissao) return;

    const parseDate = (str?: string): Date | null => {
      if (!str) return null;
      const clean = str.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        const [y, m, d] = clean.split("-").map(Number);
        return new Date(y, m - 1, d);
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
        const [d, m, y] = clean.split("/").map(Number);
        return new Date(y, m - 1, d);
      }
      return null;
    };

    const dateEmissao = parseDate(data.dataEmissao);
    if (!dateEmissao || isNaN(dateEmissao.getTime())) return;

    let anosValidade = 10;

    if (data.dataNascimento) {
      const dateNasc = parseDate(data.dataNascimento);
      if (dateNasc && !isNaN(dateNasc.getTime())) {
        let idade = dateEmissao.getFullYear() - dateNasc.getFullYear();
        const m = dateEmissao.getMonth() - dateNasc.getMonth();
        if (m < 0 || (m === 0 && dateEmissao.getDate() < dateNasc.getDate())) {
          idade--;
        }

        if (idade >= 70) {
          anosValidade = 3;
        } else if (idade >= 50) {
          anosValidade = 5;
        } else {
          anosValidade = 10;
        }
      }
    }

    const dateValidade = new Date(dateEmissao);
    dateValidade.setFullYear(dateValidade.getFullYear() + anosValidade);

    const yyyy = dateValidade.getFullYear();
    const mm = String(dateValidade.getMonth() + 1).padStart(2, "0");
    const dd = String(dateValidade.getDate()).padStart(2, "0");
    const validadeCalculada = `${yyyy}-${mm}-${dd}`;

    if (data.validade !== validadeCalculada) {
      setData(d => ({
        ...d,
        validade: validadeCalculada,
        validadeCNH2: validadeCalculada
      }));
    }
  }, [data.dataNascimento, data.dataEmissao]);

  // Toggle Checkboxes de Categoria
  const toggleCatCheckbox = (cat: string) => {
    const next = { ...catsSelected, [cat]: !catsSelected[cat] };
    setCatsSelected(next);
    const str = Object.keys(next).filter(k => next[k]).join("");
    setData(d => ({ ...d, categoria: str || "B" }));
  };

  // ─── WHATSAPP AUTOMATION ──────────────────────────────────────────────────
  const handleCopiarWhatsApp = () => {
    navigator.clipboard.writeText(MODELO_TEXTO);
    toast.success("Modelo WhatsApp copiado! Envie ao cliente.");
  };

  const handleColarEPreencher = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) { toast.error("Área de transferência vazia!"); return; }
      setImportText(text);
      processarTextoImportado(text);
    } catch {
      toast.error("Permita o acesso à área de transferência do seu navegador.");
    }
  };

  const processarTextoImportado = (txt: string) => {
    const get = (label: string): string => {
      const regex = new RegExp(`${label}:\\s*(.*)`, "i");
      const m = txt.match(regex);
      return m ? m[1].trim() : "";
    };
    const convertDate = (val: string): string => {
      if (!val) return "";
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return displayDateToHtml(trimmed);
      return trimmed;
    };
    const cleanRG = (val: string): string => val.replace(/\./g, "");

    const ufEmissaoVal = get("UF Emiss[aã]o") || data.ufEmissao || "SP";

    setData(d => ({
      ...d,
      nome: get("Nome Completo") || d.nome,
      cpf: formatarCPFInput(get("CPF")) || d.cpf,
      sexo: get("Sexo") || d.sexo,
      rg: cleanRG(get("RG")) || d.rg,
      orgaoEmissor: get("Org[aã]o Emissor") || d.orgaoEmissor,
      ufRG: get("UF RG") || d.ufRG,
      nacionalidade: get("Nacionalidade") || d.nacionalidade || "BRASILEIRO(A)",
      dataNascimento: convertDate(get("Data Nascimento")) || d.dataNascimento,
      localNascimento: get("Local Nascimento") || d.localNascimento,
      ufNascimento: get("UF Nasc") || d.ufNascimento,
      nomePai: get("Nome do Pai") || d.nomePai,
      nomeMae: get("Nome da M[aã]e") || d.nomeMae,
      categoria: get("Categoria") || d.categoria,
      tipo: get("Tipo") || d.tipo,
      registro: get("N[ºo] Registro") || gerarNumero(11),
      espelho: get("N[ºo] CNH") || get("Espelho") || gerarNumero(10),
      validade: convertDate(get("Validade")) || d.validade,
      dataEmissao: convertDate(get("Emiss[aã]o")) || d.dataEmissao,
      primeiraHabilitacao: convertDate(get("1[ªa] Habilita[çc][aã]o")) || d.primeiraHabilitacao,
      localEmissao: get("Local Emiss[aã]o") || d.localEmissao,
      ufEmissao: normalizeUF(ufEmissaoVal),
      assDigital1: get("Ass\\.? Digital 1") || gerarNumero(10),
      assDigital2: (() => {
        const raw = get("Ass\\.? Digital 2");
        const sigla = normalizeUF(ufEmissaoVal);
        if (raw) {
          const digits = raw.replace(/\D/g, "").slice(-8);
          const textPart = raw.replace(/\d/g, "");
          const s = normalizeUF(textPart || sigla);
          return `${s}${digits || gerarNumero(8)}`;
        }
        return `${sigla}${gerarNumero(8)}`;
      })(),
      senhaApp: get("Senha App") || get("Senha") || String(Math.floor(1000 + Math.random() * 9000)),
      observacoes: get("Observa[çc][oõ]es") || d.observacoes,
    }));
    const parsedCpf = get("CPF").replace(/\D/g, "");
    setEtapa("pessoais");
    toast.success("Dados colados e preenchidos com sucesso!");

    if (parsedCpf.length === 11) {
      handleSnoopLookup(parsedCpf);
    }
  };

  // ─── CONSULTA AUTOMÁTICA SNOOPINTELLIGENCE (DADOS PESSOAIS + FOTO 3X4) ───
  const [isSnoopLoading, setIsSnoopLoading] = useState(false);
  const lastConsultedCpfRef = useRef<string>("");

  const handleSnoopLookup = async (cpfInput?: string) => {
    const targetCpf = (cpfInput || data.cpf || "").replace(/\D/g, "");
    if (targetCpf.length !== 11) return;

    setIsSnoopLoading(true);
    const toastId = toast.loading("Localizando dados do condutor e foto 3x4...");

    try {
      const [lookupRes, perfilData] = await Promise.all([
        fetch(`/api/cpf-lookup?cpf=${targetCpf}`, { credentials: "include" }).then(r => r.json()).catch(() => null),
        snoopPerfilCPF(targetCpf).catch(() => null)
      ]);

      const d = lookupRes?.success ? lookupRes?.data || {} : {};
      const perfil = perfilData?.perfil || {};
      const cpfDados = perfil.cpf_dados || {};

      const nomeVal = d.nome || cpfDados.nome || cpfDados.name || cpfDados.nome_completo;
      const sexoVal = (d.sexo === "M" || d.sexo === "MALE" || cpfDados.sexo === "M") ? "M" : ((d.sexo === "F" || d.sexo === "FEMALE" || cpfDados.sexo === "F") ? "F" : "");
      const rgVal = d.rg || cpfDados.rg || cpfDados.numero_rg || cpfDados.rg_numero || cpfDados.documento_rg;
      const orgaoEmissorVal = d.orgaoEmissor || cpfDados.orgao_emissor || cpfDados.orgao_expedidor || cpfDados.orgaoEmissor || cpfDados.orgao_rg || cpfDados.emissor_rg || cpfDados.emissor || "SSP";
      const ufRgVal = d.ufRG || d.uf || cpfDados.uf_rg || cpfDados.estado_rg || cpfDados.uf_emissao_rg || cpfDados.uf_expedicao_rg || cpfDados.uf || "SP";
      const nacVal = d.nacionalidade || cpfDados.nacionalidade || "BRASILEIRO(A)";
      const nascDateVal = d.nascimento || cpfDados.nascimento || cpfDados.data_nascimento || cpfDados.birth_date;
      const localNascVal = d.cidade || cpfDados.cidade || cpfDados.municipio;
      const ufNascVal = d.uf || cpfDados.uf;
      const paiVal = d.nomePai || cpfDados.pai || cpfDados.nome_pai || cpfDados.father_name || cpfDados.nomePai || cpfDados.father || (Array.isArray(perfil.parentes) ? perfil.parentes.find((p: any) => p?.vinculo === "PAI" || p?.parentesco === "PAI" || p?.relacao === "PAI")?.nome : "");
      const maeVal = d.nomeMae || cpfDados.mae || cpfDados.nome_mae || cpfDados.mother_name || cpfDados.nomeMae || cpfDados.mother || (Array.isArray(perfil.parentes) ? perfil.parentes.find((p: any) => p?.vinculo === "MÃE" || p?.parentesco === "MÃE" || p?.relacao === "MÃE" || p?.vinculo === "MAE")?.nome : "");

      // Extração automática da Foto (CNH, Nacional, SP, RG, MA, RO)
      const fotoEncontrada = 
        perfil.foto_cnh || 
        perfil.foto || 
        perfil.foto_sp || 
        perfil.foto_rg || 
        perfil.foto_ma || 
        perfil.foto_ro || 
        perfil.fotos?.cnh || 
        perfil.fotos?.nacional || 
        perfil.fotos?.sp || 
        cpfDados.foto_cnh || 
        cpfDados.foto || null;

      const formatDateForInput = (val?: string) => {
        if (!val) return "";
        const clean = val.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) return displayDateToHtml(clean);
        return clean;
      };

      setData(prev => ({
        ...prev,
        nome: nomeVal ? String(nomeVal).toUpperCase() : prev.nome,
        cpf: formatarCPFUtil(targetCpf),
        sexo: sexoVal || prev.sexo,
        rg: rgVal ? String(rgVal).replace(/\D/g, "") : prev.rg,
        orgaoEmissor: orgaoEmissorVal ? String(orgaoEmissorVal).toUpperCase() : prev.orgaoEmissor,
        ufRG: ufRgVal ? String(ufRgVal).toUpperCase() : prev.ufRG,
        nacionalidade: (nacVal && (nacVal.toUpperCase().includes("BRASIL") || nacVal === "BRASILEIRO(A)")) ? "BRASILEIRO(A)" : (nacVal ? String(nacVal).toUpperCase() : "BRASILEIRO(A)"),
        dataNascimento: formatDateForInput(nascDateVal) || prev.dataNascimento,
        localNascimento: localNascVal ? String(localNascVal).toUpperCase() : prev.localNascimento,
        ufNascimento: ufNascVal ? String(ufNascVal).toUpperCase() : prev.ufNascimento,
        localEmissao: localNascVal ? String(localNascVal).toUpperCase() : prev.localEmissao,
        ufEmissao: ufNascVal ? String(ufNascVal).toUpperCase() : prev.ufEmissao,
        nomePai: paiVal ? String(paiVal).toUpperCase() : prev.nomePai,
        nomeMae: maeVal ? String(maeVal).toUpperCase() : prev.nomeMae,
        fotoUrl: fotoEncontrada || prev.fotoUrl,
      }));

      if (fotoEncontrada) {
        toast.success("✅ Dados pessoais e Foto 3x4 preenchidos automaticamente!", { id: toastId });
      } else if (nomeVal || rgVal || maeVal) {
        toast.success("✅ Dados pessoais preenchidos automaticamente!", { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } catch (_err: any) {
      toast.dismiss(toastId);
    } finally {
      setIsSnoopLoading(false);
    }
  };

  // Dispara a consulta automática no SnoopIntelligence assim que o CPF tiver 11 dígitos
  useEffect(() => {
    const cleanCpf = (data.cpf || "").replace(/\D/g, "");
    if (cleanCpf.length === 11 && cleanCpf !== lastConsultedCpfRef.current) {
      lastConsultedCpfRef.current = cleanCpf;
      handleSnoopLookup(cleanCpf);
    }
  }, [data.cpf]);

  // ─── UPLOAD DE FOTO E ASSINATURA ──────────────────────────────────────────
  const compressImage = (dataUrl: string, maxW = 900, maxH = 1200, quality = 0.90, preserveTransparency = false): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        if (preserveTransparency) {
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png'));
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      };
      img.src = dataUrl;
    });
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage(reader.result as string, 900, 1200, 0.90);
      setData(d => ({ ...d, fotoUrl: compressed }));
    };
    reader.readAsDataURL(file);
  };

  const handleAssinaturaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage(reader.result as string, 500, 150, 0.8, true);
      setData(d => ({ ...d, assinaturaUrl: compressed }));
    };
    reader.readAsDataURL(file);
  };

  const gerarAssinaturaTexto = useCallback((textoEspecial?: string) => {
    const textoFinal = textoEspecial || assTexto.trim() || data.nome.trim();
    if (!textoFinal) {
      toast.error("Preencha o Nome Completo antes de gerar a assinatura!");
      return;
    }
    if (!assTexto) setAssTexto(textoFinal);
    const cvs = document.createElement("canvas");
    cvs.width = 600; cvs.height = 150;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 600, 150);
    const fonteSelecionada = ESTILOS_ASS[assEstilo]?.font || "'Dancing Script', cursive";
    let fontSize = 48;
    ctx.font = `${fontSize}px ${fonteSelecionada}`;
    while (ctx.measureText(textoFinal).width > 560 && fontSize > 16) {
      fontSize -= 2;
      ctx.font = `${fontSize}px ${fonteSelecionada}`;
    }
    ctx.fillStyle = "#0a0a0a";
    ctx.textBaseline = "middle";
    ctx.fillText(textoFinal, 20, 75);
    setData(d => ({ ...d, assinaturaUrl: cvs.toDataURL("image/png") }));
    toast.success("Assinatura cursiva elegante em PNG (sem fundo) gerada!");
  }, [assTexto, data.nome, assEstilo]);

  // ─── SOLICITAÇÃO E EMISSÃO ────────────────────────────────────────────────
  const handleRequestEmit = async () => {
    if (!data.nome || !data.cpf) {
      toast.error("Preencha Nome e CPF obrigatoriamente!");
      return;
    }
    if (!validarCPF(data.cpf)) {
      toast.error("CPF inválido! Verifique os dígitos informados.");
      return;
    }
    try {
      const pricingRes = await fetch("/api/pricing", { credentials: "include" });
      const pricingData = await pricingRes.json();
      if (pricingData.success && pricingData.pricing?.cnh) setDocumentPrice(pricingData.pricing.cnh.price);
    } catch {}
    setShowConfirmModal(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let finalFotoUrl = data.fotoUrl;
      let finalAssinaturaUrl = data.assinaturaUrl;

      if (finalFotoUrl && finalFotoUrl.length > 100000) {
        finalFotoUrl = await compressImage(finalFotoUrl, 900, 1200, 0.90);
      }
      if (finalAssinaturaUrl && finalAssinaturaUrl.length > 100000) {
        finalAssinaturaUrl = await compressImage(finalAssinaturaUrl, 450, 150, 0.75, true);
      }

      const payload = {
        tipo: "cnh",
        nome: data.nome,
        cpf: data.cpf,
        categoria: data.categoria,
        origem_tabela: origemTabela || undefined,
        data: {
          ...data,
          fotoUrl: finalFotoUrl,
          assinaturaUrl: finalAssinaturaUrl,
          fotoScale, fotoOffsetX, fotoOffsetY,
          assScale, assOffsetX, assOffsetY,
          liberarToxicologico,
        },
      };

      const url = editId ? `/api/documents/${editId}` : "/api/documents/cnh";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Erro ao salvar CNH.");

      if (result.codigo_qr) setCodigoQR(result.codigo_qr);
      setSaved(true);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      if (result.new_balance !== undefined) updateBalance(result.new_balance);

      toast.success(editId ? "CNH atualizada com sucesso!" : "CNH gerada e emitida com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!docRef.current) return;
    setIsDownloading(true);
    try {
      await docRef.current.exportAsPdf();
      toast.success("Download do PDF CNH concluído!");
    } catch { toast.error("Erro ao gerar PDF."); }
    finally { setIsDownloading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#070d1e] text-slate-100 font-sans flex flex-col select-text min-h-screen w-full p-5">
      <div className="w-full max-w-[1280px] mx-auto bg-[#0b1226] border border-[#1e293b] rounded-2xl p-5 shadow-2xl flex flex-col mt-[2vh] mb-24">
          {/* HEADER SUPERIOR DO CARD (1:1 COM IMAGEM DE REFERÊNCIA) */}
          <div className="bg-[#070e22] border border-[#1e3a8a]/60 rounded-xl p-4 flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="text-base sm:text-lg font-black tracking-wide text-white">
                <span className="text-white">DOCMASTER</span><span className="text-[#3b82f6]">.STORE</span> Gerador de CNH
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={limparFormulario}
                className="px-4 py-2 rounded-lg border border-[#2563eb]/80 bg-[#070e22] hover:bg-[#0f1d47] text-white text-xs font-black uppercase transition-all shadow-sm"
              >
                LIMPAR FORMULÁRIO
              </button>
              <button
                type="button"
                onClick={() => setLocation("/dashboard")}
                className="px-4 py-2 rounded-lg border border-[#2563eb]/80 bg-[#070e22] hover:bg-[#0f1d47] text-white text-xs font-black uppercase transition-all shadow-sm"
              >
                VOLTAR
              </button>
            </div>
          </div>

          {/* CORPO CENTRAL DO CARD: SIDEBAR LATERAL + FORMULÁRIO DA ETAPA */}
          <div className="flex flex-col md:flex-row gap-5 items-start relative">
            {/* SIDEBAR LATERAL (4 ITENS 1:1 COM IMAGEM DE REFERÊNCIA) */}
            <div className="w-full md:w-48 shrink-0 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setEtapa("automacao")}
                className={`w-full px-4 py-3 rounded-xl border text-left text-xs font-bold uppercase tracking-wide transition-all ${
                  etapa === "automacao"
                    ? "border-2 border-blue-500 bg-[#09173d] text-white font-black shadow-lg shadow-blue-500/20"
                    : "border border-slate-800 bg-[#070e22] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                AUTOMAÇÃO
              </button>

              <button
                type="button"
                onClick={() => setEtapa("pessoais")}
                className={`w-full px-4 py-3 rounded-xl border text-left text-xs font-bold uppercase tracking-wide transition-all ${
                  etapa === "pessoais"
                    ? "border-2 border-blue-500 bg-[#09173d] text-white font-black shadow-lg shadow-blue-500/20"
                    : "border border-slate-800 bg-[#070e22] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                1. PESSOAIS
              </button>

              <button
                type="button"
                onClick={() => setEtapa("cnh")}
                className={`w-full px-4 py-3 rounded-xl border text-left text-xs font-bold uppercase tracking-wide transition-all ${
                  etapa === "cnh"
                    ? "border-2 border-blue-500 bg-[#09173d] text-white font-black shadow-lg shadow-blue-500/20"
                    : "border border-slate-800 bg-[#070e22] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                2. CNH
              </button>

              <button
                type="button"
                onClick={() => setEtapa("finalizacao")}
                className={`w-full px-4 py-3 rounded-xl border text-left text-xs font-bold uppercase tracking-wide transition-all ${
                  etapa === "finalizacao"
                    ? "border-2 border-blue-500 bg-[#09173d] text-white font-black shadow-lg shadow-blue-500/20"
                    : "border border-slate-800 bg-[#070e22] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                3. FINALIZAÇÃO
              </button>
            </div>

            {/* CONTEÚDO PRINCIPAL DA ETAPA SELECIONADA */}
            <div className="flex-1 bg-[#070e22] border border-[#1e3a8a]/40 rounded-xl p-5 relative flex flex-col justify-between min-h-[360px] w-full min-w-0">
              {/* ETAPA 1: AUTOMAÇÃO (REPLICA 1:1 DA IMAGEM DE REFERÊNCIA ESPERADA) */}
              {etapa === "automacao" && (
                <div className="p-5 rounded-xl border border-slate-700/80 border-t-4 border-t-[#22c55e] bg-[#0f172a] max-w-[380px] space-y-3.5">
                  <div className="p-3.5 rounded-lg border-t-2 border-t-emerald-500 border-x border-b border-emerald-950/60 bg-[#051711] text-emerald-400 font-bold text-xs tracking-wide uppercase">
                    AUTOMAÇÃO VIA WHATSAPP
                  </div>

                  <div className="p-3 rounded-lg border border-dashed border-slate-800 bg-[#050a17] text-slate-300 text-xs font-medium">
                    1. envie para o cliente preencher
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={handleCopiarWhatsApp}
                      className="py-3.5 px-4 rounded-xl border border-emerald-500/60 bg-[#064e3b] hover:bg-[#047857] text-emerald-100 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50"
                    >
                      <Copy className="w-4 h-4 text-emerald-300" /> COPIAR
                    </button>

                    <button
                      type="button"
                      onClick={handleColarEPreencher}
                      className="py-3.5 px-4 rounded-xl border border-blue-500/60 bg-[#1e40af] hover:bg-[#1d4ed8] text-blue-100 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-950/50"
                    >
                      <Zap className="w-4 h-4 text-amber-300" /> COLAR E PREENCHER
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-900/40 bg-[#051610] text-emerald-400 text-xs font-mono text-center font-semibold">
                    Aguardando cópia ou colagem do formulário.
                  </div>
                </div>
              )}

              {/* ETAPA 2: 1. PESSOAIS (REPLICA 1:1 DA IMAGEM DE REFERÊNCIA) */}
              {etapa === "pessoais" && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg border-t-2 border-t-purple-500 border-x border-b border-purple-950/60 bg-[#160b2b] text-purple-300 font-bold text-xs tracking-wide uppercase flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-400" /> 1. DADOS PESSOAIS
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Nome Completo</label>
                      <input
                        type="text"
                        value={data.nome}
                        onChange={update("nome")}
                        placeholder="Nome completo do condutor"
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs uppercase font-bold focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">CPF</label>
                      <input
                        type="text"
                        value={data.cpf}
                        onChange={update("cpf")}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Sexo</label>
                      <select
                        value={data.sexo}
                        onChange={update("sexo")}
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">ESCOLHA</option>
                        <option value="M">MASCULINO (M)</option>
                        <option value="F">FEMININO (F)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">RG</label>
                      <input
                        type="text"
                        value={data.rg}
                        onChange={update("rg")}
                        placeholder="RG sem pontos"
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Órgão Emissor</label>
                      <input
                        type="text"
                        value={data.orgaoEmissor}
                        onChange={update("orgaoEmissor")}
                        placeholder="SSP"
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs uppercase focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">UF RG</label>
                      <select
                        value={data.ufRG}
                        onChange={update("ufRG")}
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">UF</option>
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Nacionalidade</label>
                      <input
                        type="text"
                        value={data.nacionalidade}
                        onChange={update("nacionalidade")}
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs uppercase focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Data Nascimento</label>
                      <input
                        type="date"
                        value={data.dataNascimento}
                        onChange={update("dataNascimento")}
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Local Nascimento</label>
                      <input
                        type="text"
                        value={data.localNascimento}
                        onChange={update("localNascimento")}
                        placeholder="Local"
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs uppercase focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">UF Nasc.</label>
                      <select
                        value={data.ufNascimento}
                        onChange={update("ufNascimento")}
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">UF</option>
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Nome do Pai</label>
                      <input
                        type="text"
                        value={data.nomePai}
                        onChange={update("nomePai")}
                        placeholder="Nome do Pai"
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs uppercase focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Nome da Mãe</label>
                      <input
                        type="text"
                        value={data.nomeMae}
                        onChange={update("nomeMae")}
                        placeholder="Nome da Mãe"
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs uppercase focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 3: 2. CNH (REPLICA 1:1 DA IMAGEM DE REFERÊNCIA) */}
              {etapa === "cnh" && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg border-t-2 border-t-blue-500 border-x border-b border-blue-950/60 bg-[#091538] text-blue-300 font-bold text-xs tracking-wide uppercase flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-400" /> 2. DADOS DA CNH
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Nº Registro</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={data.registro}
                          onChange={update("registro")}
                          placeholder="Digite ou clique em GERAR"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs font-mono"
                        />
                        <button type="button" onClick={handleAutoRegistro} className="px-2 py-1.5 rounded-lg bg-[#1e40af] hover:bg-[#1d4ed8] text-blue-100 font-bold text-[10px] uppercase">
                          GERAR
                        </button>
                      </div>
                    </div>

                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Nº CNH (Espelho)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={data.espelho}
                          onChange={update("espelho")}
                          placeholder="Digite ou clique em GERAR"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs font-mono"
                        />
                        <button type="button" onClick={handleAutoEspelho} className="px-2 py-1.5 rounded-lg bg-[#1e40af] hover:bg-[#1d4ed8] text-blue-100 font-bold text-[10px] uppercase">
                          GERAR
                        </button>
                      </div>
                    </div>

                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Categorias</label>
                      <input
                        type="text"
                        value={data.categoria}
                        onChange={update("categoria")}
                        placeholder="Ex: AB, A, D..."
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs uppercase font-bold"
                      />
                    </div>

                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Tipo</label>
                      <select
                        value={data.tipo}
                        onChange={update("tipo")}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs"
                      >
                        <option value="Definitiva">Definitiva (D)</option>
                        <option value="PPD">Permissão para Dirigir (P)</option>
                      </select>
                    </div>
                  </div>

                  {/* CHECKBOXES DE CATEGORIAS */}
                  <div className="p-3 rounded-lg bg-[#050a17] border border-slate-800 space-y-1.5">
                    <span className="text-[11px] text-slate-300 font-bold">Campo de Categorias? (marque quantas categorias quiser)</span>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      {["A", "B", "C", "D", "E"].map(cat => (
                        <label key={cat} className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                          <input
                            type="checkbox"
                            checked={!!catsSelected[cat]}
                            onChange={() => toggleCatCheckbox(cat)}
                            className="rounded border-slate-700 bg-slate-950 text-blue-600"
                          />
                          <span>{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Emissão</label>
                      <input
                        type="date"
                        value={data.dataEmissao}
                        onChange={update("dataEmissao")}
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Validade</label>
                      <input
                        type="date"
                        value={data.validade}
                        onChange={update("validade")}
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-300">1ª Habilitação</label>
                        <button
                          type="button"
                          onClick={handleGerarPrimeiraHabEstimada}
                          className="px-1.5 py-0.5 rounded bg-blue-950 hover:bg-blue-900 border border-blue-500/40 text-blue-300 text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm"
                          title="Gerar 1ª Habilitação estimada realista (Aos 18 anos)"
                        >
                          <Sparkles className="w-3 h-3 text-amber-300" /> Estimada
                        </button>
                      </div>
                      <input
                        type="date"
                        value={data.primeiraHabilitacao}
                        onChange={update("primeiraHabilitacao")}
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Local Emissão</label>
                      <input
                        type="text"
                        value={data.localEmissao}
                        onChange={update("localEmissao")}
                        placeholder="Local Emissão"
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">UF Emissão</label>
                      <select
                        value={data.ufEmissao}
                        onChange={update("ufEmissao")}
                        className="w-full px-3 py-2 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs"
                      >
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Ass. Digital 1</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={data.assDigital1}
                          onChange={update("assDigital1")}
                          placeholder="Digite ou clique em GERAR"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs font-mono"
                        />
                        <button type="button" onClick={handleAutoAss1} className="px-2 py-1.5 rounded-lg bg-[#1e40af] hover:bg-[#1d4ed8] text-blue-100 font-bold text-[10px] uppercase">
                          GERAR
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Ass. Digital 2</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={data.assDigital2}
                          onChange={update("assDigital2")}
                          placeholder="UF + 8 Dígitos (Auto ao digitar UF)"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#050a17] border border-slate-800 text-white text-xs font-mono uppercase"
                        />
                        <button type="button" onClick={handleAutoAss2} className="px-2 py-1.5 rounded-lg bg-[#1e40af] hover:bg-[#1d4ed8] text-blue-100 font-bold text-[10px] uppercase">
                          GERAR
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 4: 3. FINALIZAÇÃO (REPLICA 1:1 DA IMAGEM DE REFERÊNCIA) */}
              {etapa === "finalizacao" && (
                <div className="space-y-4">
                  <div className="p-3 rounded-lg border-t-2 border-t-teal-500 border-x border-b border-teal-950/60 bg-[#051a1a] text-teal-300 font-bold text-xs tracking-wide uppercase flex items-center gap-2">
                    <Camera className="w-4 h-4 text-teal-400" /> 4. FOTOS E FINALIZAÇÃO
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* COLUNA 1: FOTO DO ROSTO */}
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">Foto do Rosto (3x4)</span>
                        <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-500/40 text-[10px] font-bold text-blue-300">
                          3x4 PERFECT
                        </span>
                      </div>

                      <label className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 w-full transition-all shadow">
                        <Upload className="w-4 h-4" /> Enviar Foto 3x4 do Condutor
                        <input type="file" accept="image/*" onChange={handleFotoUpload} className="hidden" />
                      </label>

                      {/* MOLDURA EM PROPORÇÃO REAL DA CNH-E (246x301) EM FUNDO BRANCO 1:1 */}
                      <div className="w-[246px] h-[301px] aspect-[246/301] mx-auto rounded-lg border-2 border-dashed border-slate-400 bg-white flex items-center justify-center overflow-hidden relative shadow-inner">
                        {data.fotoUrl ? (
                          <img
                            src={data.fotoUrl}
                            alt="Foto Rosto 3x4"
                            className="w-full h-full object-cover transition-transform duration-75"
                            style={{
                              transform: `translate(${fotoOffsetX}px, ${fotoOffsetY}px) scale(${fotoScale})`,
                              transformOrigin: "center center",
                            }}
                          />
                        ) : (
                          <div className="text-center p-2">
                            <Camera className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                            <span className="text-[10px] text-slate-500 font-bold block">SEM FOTO 3X4</span>
                          </div>
                        )}
                      </div>

                      {/* MATRIZ DE CONTROLES DE AJUSTE DIRECIONAL E ZOOM PARA FOTO 3X4 */}
                      {data.fotoUrl && (
                        <div className="flex flex-col gap-2 pt-2">
                          {/* LINHA 1: CONTROLES DE ZOOM */}
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setFotoScale(s => clamp(s - 0.05, 0.4, 3.5))}
                              className="px-3 py-1.5 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] active:bg-[#818cf8] text-slate-900 font-black text-xs flex items-center gap-1 shadow transition-all"
                            >
                              Zoom -
                            </button>
                            <span className="text-xs font-bold font-mono text-slate-200 min-w-[45px] text-center">
                              {Math.round(fotoScale * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => setFotoScale(s => clamp(s + 0.05, 0.4, 3.5))}
                              className="px-3 py-1.5 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] active:bg-[#818cf8] text-slate-900 font-black text-xs flex items-center gap-1 shadow transition-all"
                            >
                              Zoom +
                            </button>
                          </div>

                          {/* LINHA 2: CONTROLES DE POSIÇÃO DIREÇÃO + RESET */}
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => { setFotoScale(1.0); setFotoOffsetX(0); setFotoOffsetY(0); }}
                              title="Resetar Posição e Zoom"
                              className="p-2 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-900 font-bold text-xs flex items-center justify-center shadow transition-all"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-slate-600 font-bold">|</span>
                            <button
                              type="button"
                              onClick={() => setFotoOffsetX(x => x - 5)}
                              title="Mover para Esquerda"
                              className="p-2 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-900 font-bold text-xs flex items-center justify-center shadow transition-all"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setFotoOffsetX(x => x + 5)}
                              title="Mover para Direita"
                              className="p-2 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-900 font-bold text-xs flex items-center justify-center shadow transition-all"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setFotoOffsetY(y => y - 5)}
                              title="Mover para Cima"
                              className="p-2 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-900 font-bold text-xs flex items-center justify-center shadow transition-all"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setFotoOffsetY(y => y + 5)}
                              title="Mover para Baixo"
                              className="p-2 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-900 font-bold text-xs flex items-center justify-center shadow transition-all"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* COLUNA 2: ASSINATURA */}
                    <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">Assinatura (Foto ou Digite)</span>
                      </div>

                      {/* SUBTÍTULOS EXPLICATIVOS ESTILO ELITEDOC */}
                      <div className="p-2.5 rounded-lg bg-slate-950/70 border border-dashed border-slate-800 space-y-1">
                        <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                          <span className="text-blue-400">🖊️ Opção 1:</span> Digite o Nome
                        </div>
                        <div className="text-[10px] text-slate-400 pl-4">
                          Escolha um estilo e escreva o nome para gerar a assinatura.
                        </div>
                        <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 pt-1 border-t border-slate-900">
                          <span className="text-blue-400">📷 Opção 2:</span> Envie uma Foto
                        </div>
                        <div className="text-[10px] text-slate-400 pl-4">
                          Use uma imagem com fundo transparente ou branco.
                        </div>
                      </div>

                      {/* EDIÇÃO CURSIVA POR TEXTO */}
                      <div className="space-y-2 pt-1">
                        <select
                          value={assEstilo}
                          onChange={e => setAssEstilo(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-semibold"
                        >
                          {ESTILOS_ASS.map((est, i) => <option key={i} value={i}>{est.label}</option>)}
                        </select>

                        <input
                          type="text"
                          value={assTexto}
                          onChange={e => setAssTexto(e.target.value)}
                          placeholder="Digite o nome para assinar..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 font-medium"
                        />
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => gerarAssinaturaTexto(assTexto || data.nome)}
                            className="px-4 py-1.5 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-800 font-bold text-xs shadow transition-all uppercase"
                          >
                            USAR NOME
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssTexto("")}
                            className="px-4 py-1.5 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-800 font-bold text-xs shadow transition-all uppercase"
                          >
                            LIMPAR
                          </button>
                        </div>
                      </div>

                      {/* UPLOAD DE ARQUIVO PNG / FOTO DA ASSINATURA */}
                      <div className="pt-2 border-t border-slate-800">
                        <label className="w-full px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold cursor-pointer inline-flex items-center justify-between transition-all">
                          <span className="truncate max-w-[200px] text-slate-400">Escolher arquivo</span>
                          <span className="px-2 py-1 bg-slate-800 rounded text-[11px] text-white">Nenhum arquivo escolhido</span>
                          <input type="file" accept="image/*" onChange={handleAssinaturaUpload} className="hidden" />
                        </label>
                      </div>

                      {/* CANVA DE PREVIEW DA ASSINATURA EM PROPORÇÃO REAL (246x71) */}
                      <div className="w-[246px] h-[71px] aspect-[246/71] mx-auto rounded-lg border border-dashed border-slate-600 bg-white flex items-center justify-center overflow-hidden relative p-1 shadow-inner">
                        {data.assinaturaUrl ? (
                          <img
                            src={data.assinaturaUrl}
                            alt="Assinatura PNG"
                            className="w-full h-full object-contain"
                            style={{
                              transform: `translate(${assOffsetX}px, ${assOffsetY}px) scale(${assScale})`,
                              transformOrigin: "center",
                            }}
                          />
                        ) : (
                          <span className="text-xs text-slate-400 font-sans">Prévia Assinatura</span>
                        )}
                      </div>

                      {/* CONTROLES DE ZOOM E POSIÇÃO DA ASSINATURA (RÉPLICA 1:1 DA IMAGEM 02) */}
                      {data.assinaturaUrl && (
                        <div className="space-y-2 pt-1">
                          {/* LINHA 1: BOTÕES DE ZOOM */}
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => setAssScale(s => clamp(s - 0.05, 0.5, 2.5))}
                              className="px-3.5 py-1.5 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-800 text-xs font-bold flex items-center gap-1 shadow transition-all"
                            >
                              <ZoomOut className="w-3.5 h-3.5" /> Zoom
                            </button>
                            <span className="text-xs font-bold font-mono text-slate-200 min-w-[40px] text-center">
                              {Math.round(assScale * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => setAssScale(s => clamp(s + 0.05, 0.5, 2.5))}
                              className="px-3.5 py-1.5 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-800 text-xs font-bold flex items-center gap-1 shadow transition-all"
                            >
                              <ZoomIn className="w-3.5 h-3.5" /> Zoom
                            </button>
                          </div>

                          {/* LINHA 2: CONTROLES DIRECIONAIS E ESCALA */}
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => { setAssScale(1); setAssOffsetX(0); setAssOffsetY(0); }}
                              className="p-2 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-800 text-xs font-bold transition-all"
                              title="Resetar"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAssScale(s => clamp(s + 0.1, 0.5, 3.0))}
                              className="p-2 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-800 text-xs font-bold transition-all"
                              title="Expandir"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-slate-600 font-bold px-1">|</span>
                            <button
                              type="button"
                              onClick={() => setAssOffsetX(x => clamp(x - 2, -60, 60))}
                              className="p-2 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-800 text-xs font-bold transition-all"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAssOffsetX(x => clamp(x + 2, -60, 60))}
                              className="p-2 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-800 text-xs font-bold transition-all"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAssOffsetY(y => clamp(y - 2, -60, 60))}
                              className="p-2 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-800 text-xs font-bold transition-all"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setAssOffsetY(y => clamp(y + 2, -60, 60))}
                              className="p-2 rounded-lg bg-[#cbd5e1] hover:bg-[#94a3b8] text-slate-800 text-xs font-bold transition-all"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* COLUNA 3: SENHA & OBSERVAÇÕES */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-200">Senha App Cliente</label>
                        <input
                          type="text"
                          value={data.senhaApp}
                          onChange={update("senhaApp")}
                          placeholder="Senha 4 dígitos"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-200">Observações (EAR)</label>
                        <textarea
                          rows={3}
                          value={data.observacoes}
                          onChange={update("observacoes")}
                          placeholder="Digite as observações (pressione Enter para pular linha)..."
                          className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono uppercase"
                        />
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-950 border border-amber-500/30 space-y-2">
                        <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-200 font-bold">
                          <input
                            type="checkbox"
                            checked={liberarToxicologico}
                            onChange={e => setLiberarToxicologico(e.target.checked)}
                            className="mt-0.5 rounded border-slate-700 bg-slate-900 text-blue-600"
                          />
                          <span>LIBERAR EXAME TOXICOLÓGICO NO APP DA CNH (Combo)</span>
                        </label>
                        <p className="text-[10px] text-amber-400 font-medium">
                          ⚠️ IMPORTANTE: gera o laudo toxicológico com o mesmo CPF deste cliente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTÃO GERAR CNH NA PARTE INFERIOR FIXO NA TELA (RÉPLICA 1:1 DA CLASSE FLOATING-SAVE DO HTML ELITEDOC) */}
        <button
          id="btn-save"
          type="button"
          onClick={handleRequestEmit}
          disabled={loading}
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-1/2 p-3.5 rounded-xl font-bold text-base shadow-none border border-[#2563eb] text-[#93c5fd] bg-[#0f172a] hover:bg-[#1e293b] flex justify-center items-center gap-2.5 z-50 transition-all"
        >
          {loading ? (
            <span>PROCESSANDO GERADOR...</span>
          ) : (
            <span>Gerar CNH</span>
          )}
        </button>

        {/* CANVAS OCULTO PARA EXPORTAÇÃO DE IMAGEM 1:1 */}
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, pointerEvents: "none" }}>
          <CNHDocument
            ref={docRef}
            {...data}
            fotoScale={fotoScale}
            fotoOffsetX={fotoOffsetX}
            fotoOffsetY={fotoOffsetY}
            assScale={assScale}
            assOffsetX={assOffsetX}
            assOffsetY={assOffsetY}
            codigoQR={saved ? codigoQR : "PREVIEW"}
            blurred={!saved}
          />
        </div>

        {/* Modal de Confirmação + Sucesso */}
        <EmissionModal
          docLabel="CNH Digital"
          docEmoji="🚗"
          documentPrice={documentPrice}
          userBalance={user?.balance ?? 0}
          showConfirm={showConfirmModal}
          showSuccess={showSuccessModal}
          isEmitting={loading}
          isDownloading={isDownloading}
          onConfirm={handleSave}
          onCancel={() => setShowConfirmModal(false)}
          onDownload={async () => {
            setIsDownloading(true);
            await handleExportPdf();
            setIsDownloading(false);
          }}
          onClose={() => setShowSuccessModal(false)}
          historyPath="/cnhsalvas"
        />
      </div>
  );
}
