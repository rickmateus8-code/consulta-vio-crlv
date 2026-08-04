/**
 * CNHCria — Editor e Emissor da CNH Digital (Estado de Ouro)
 *
 * Características:
 * - Live Split-View Preview em tempo real (Formulário à Esquerda, Canvas 1:1 à Direita)
 * - Navegação por Abas (Importação, Pessoais, CNH, Segurança, Mídia)
 * - Controles de Zoom Dinâmico (🔍 380px a 850px) e Navegação por Foco (▲ Frente / ▼ Verso MRZ)
 * - Geradores Automáticos Inteligentes (CPF Válido, Validade por Idade, Registro, Espelho, Assinaturas Digitais)
 * - Ajustes Finos de Foto 3x4 e Assinatura com IA Gemini Nano
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import CNHDocument, { type CNHDocumentHandle, type CNHDocumentProps } from "../components/CNHDocument";
import { toast } from "sonner";
import { validarCPF, formatarCPF as formatarCPFUtil, formatarRG, displayDateToHtml } from "@/lib/utils";
import EmissionModal from "@/components/EmissionModal";
import {
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Save, Download, MessageCircle, Copy, Zap,
  Upload, Type, Lock, AlertCircle, Car, Eye, ZoomIn, ZoomOut, RotateCcw, Shield,
  Sparkles, FileText, User, Camera, Check, RefreshCw
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
Nacionalidade: BRASILEIRA
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
  { label: "Estilo 1 (Cursiva Elegante)", font: "'Dancing Script', cursive" },
  { label: "Estilo 2 (Bradley Hand)", font: "'Caveat', cursive" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // Estados de Interface e Abas
  const [activeTab, setActiveTab] = useState<"pessoais" | "cnh" | "seguranca" | "midia" | "import">("pessoais");
  const [mobileMode, setMobileMode] = useState<"form" | "preview">("form");
  const [zoomWidth, setZoomWidth] = useState(580);

  // Estados de Dados
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [codigoQR, setCodigoQR] = useState("");
  const [importText, setImportText] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isApplyingAI, setIsApplyingAI] = useState(false);
  const [documentPrice, setDocumentPrice] = useState(0);

  // Ajustes de Foto e Assinatura
  const [fotoScale, setFotoScale] = useState(1.0);
  const [fotoOffsetX, setFotoOffsetX] = useState(0);
  const [fotoOffsetY, setFotoOffsetY] = useState(0);
  const [assScale, setAssScale] = useState(1.0);
  const [assOffsetX, setAssOffsetX] = useState(0);
  const [assOffsetY, setAssOffsetY] = useState(0);

  const [editId, setEditId] = useState<string | null>(null);
  const [origemTabela, setOrigemTabela] = useState<string | null>(null);

  const [data, setData] = useState<CNHDocumentProps>({
    nome: "", cpf: "", rg: "", orgaoEmissor: "", ufRG: "",
    sexo: "", nacionalidade: "BRASILEIRA", dataNascimento: "",
    localNascimento: "", ufNascimento: "", nomePai: "", nomeMae: "",
    categoria: "AB", tipo: "Definitiva", registro: "", espelho: "",
    validade: "", validadeCNH2: "", dataEmissao: "", primeiraHabilitacao: "",
    localEmissao: "", ufEmissao: "SP", assDigital1: "", assDigital2: "",
    senhaApp: "", observacoes: "", fotoUrl: "", assinaturaUrl: "",
    codigoQR: "PREVIEW", blurred: true,
  });

  // Carregar documento para edição se houver edit_id na URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("edit_id");
    const orig = params.get("origem_tabela");
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
            try {
              docData = typeof doc.data === "string" ? JSON.parse(doc.data) : (doc.data || {});
            } catch { docData = {}; }
            const mergedData = {
              ...docData,
              nome: doc.nome || docData.nome || "",
              cpf: doc.cpf || docData.cpf || "",
              categoria: doc.categoria || docData.categoria || "",
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
          } else {
            toast.error("Documento não encontrado para edição.");
          }
        })
        .catch(() => toast.error("Erro ao carregar documento."))
        .finally(() => setLoading(false));
    }
  }, []);

  const update = useCallback((field: keyof CNHDocumentProps) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let val = e.target.value;
    if (field === "cpf") val = formatarCPFInput(val);
    if (field === "rg") val = val.replace(/\./g, "");
    setData(d => ({ ...d, [field]: val }));
  }, []);

  // ─── AUTO Generators ──────────────────────────────────────────────────────
  const handleAutoCPF = () => setData(d => ({ ...d, cpf: gerarCPFValido() }));
  const handleAutoRegistro = () => setData(d => ({ ...d, registro: gerarNumero(11) }));
  const handleAutoEspelho = () => setData(d => ({ ...d, espelho: gerarNumero(10) }));
  const handleAutoAss1 = () => setData(d => ({ ...d, assDigital1: gerarNumero(10) }));
  const handleAutoAss2 = () => {
    const uf = data.ufEmissao || "SP";
    setData(d => ({ ...d, assDigital2: uf + gerarNumero(8) }));
  };
  const handleAutoSenha = () => setData(d => ({ ...d, senhaApp: String(Math.floor(1000 + Math.random() * 9000)) }));

  const handleAutoValidade = () => {
    let anosValidade = 10;
    if (data.dataNascimento) {
      const year = parseInt(data.dataNascimento.slice(0, 4));
      if (!isNaN(year)) {
        const idade = new Date().getFullYear() - year;
        if (idade >= 50 && idade < 70) anosValidade = 5;
        else if (idade >= 70) anosValidade = 3;
      }
    }
    const hoje = new Date();
    const validadeDate = new Date(hoje.getFullYear() + anosValidade, hoje.getMonth(), hoje.getDate());
    const yyyy = validadeDate.getFullYear();
    const mm = String(validadeDate.getMonth() + 1).padStart(2, '0');
    const dd = String(validadeDate.getDate()).padStart(2, '0');
    setData(d => ({ ...d, validade: `${yyyy}-${mm}-${dd}` }));
    toast.success(`Validade calculada (+${anosValidade} anos)!`);
  };

  const handleAutoTudo = () => {
    const uf = data.ufEmissao || "SP";
    setData(d => ({
      ...d,
      cpf: d.cpf || gerarCPFValido(),
      registro: d.registro || gerarNumero(11),
      espelho: d.espelho || gerarNumero(10),
      assDigital1: d.assDigital1 || gerarNumero(10),
      assDigital2: d.assDigital2 || (uf + gerarNumero(8)),
      senhaApp: d.senhaApp || String(Math.floor(1000 + Math.random() * 9000)),
    }));
    toast.success("Campos automáticos gerados com sucesso!");
  };

  // ─── Importação Rápida ──────────────────────────────────────────────────────
  const handleCopiarModelo = () => {
    navigator.clipboard.writeText(MODELO_TEXTO);
    toast.success("Modelo copiado!");
  };

  const handleProcessarImportacao = () => {
    if (!importText.trim()) { toast.error("Cole os dados primeiro!"); return; }
    const get = (label: string): string => {
      const regex = new RegExp(`${label}:\\s*(.*)`, "i");
      const m = importText.match(regex);
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
    const autoRegistro = get("N[ºo] Registro") || gerarNumero(11);
    const autoEspelho = get("N[ºo] CNH") || get("Espelho") || gerarNumero(10);
    const autoAss1 = get("Ass\\.? Digital 1") || gerarNumero(10);
    const autoAss2 = get("Ass\\.? Digital 2") || (ufEmissaoVal + gerarNumero(8));
    const autoSenha = get("Senha App") || get("Senha") || String(Math.floor(1000 + Math.random() * 9000));

    setData(d => ({
      ...d,
      nome: get("Nome Completo") || d.nome,
      cpf: formatarCPFInput(get("CPF")) || d.cpf,
      sexo: get("Sexo") || d.sexo,
      rg: cleanRG(get("RG")) || d.rg,
      orgaoEmissor: get("Org[aã]o Emissor") || d.orgaoEmissor,
      ufRG: get("UF RG") || d.ufRG,
      nacionalidade: get("Nacionalidade") || d.nacionalidade || "BRASILEIRA",
      dataNascimento: convertDate(get("Data Nascimento")) || d.dataNascimento,
      localNascimento: get("Local Nascimento") || d.localNascimento,
      ufNascimento: get("UF Nasc") || d.ufNascimento,
      nomePai: get("Nome do Pai") || d.nomePai,
      nomeMae: get("Nome da M[aã]e") || d.nomeMae,
      categoria: get("Categoria") || d.categoria,
      tipo: get("Tipo") || d.tipo,
      registro: autoRegistro,
      espelho: autoEspelho,
      validade: convertDate(get("Validade")) || d.validade,
      dataEmissao: convertDate(get("Emiss[aã]o")) || d.dataEmissao,
      primeiraHabilitacao: convertDate(get("1[ªa] Habilita[çc][aã]o")) || d.primeiraHabilitacao,
      localEmissao: get("Local Emiss[aã]o") || d.localEmissao,
      ufEmissao: ufEmissaoVal,
      assDigital1: autoAss1,
      assDigital2: autoAss2,
      senhaApp: autoSenha,
      observacoes: get("Observa[çc][oõ]es") || d.observacoes,
    }));
    setActiveTab("pessoais");
    toast.success("Dados importados com sucesso!");
  };

  // ─── Foto & Assinatura Upload ──────────────────────────────────────────────
  const compressImage = (dataUrl: string, maxW = 400, maxH = 500, quality = 0.7, preserveTransparency = false): Promise<string> => {
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
      const compressed = await compressImage(reader.result as string);
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

  // ─── Assinatura por Texto ──────────────────────────────────────────────────
  const [assTexto, setAssTexto] = useState("");
  const [assEstilo, setAssEstilo] = useState(0);

  const gerarAssinaturaTexto = useCallback(() => {
    if (!assTexto.trim()) return;
    const cvs = document.createElement("canvas");
    cvs.width = 600;
    cvs.height = 150;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 600, 150);
    const fonteSelecionada = ESTILOS_ASS[assEstilo]?.font || "'Dancing Script', cursive";
    let fontSize = 48;
    ctx.font = `${fontSize}px ${fonteSelecionada}`;
    while (ctx.measureText(assTexto).width > 560 && fontSize > 16) {
      fontSize -= 2;
      ctx.font = `${fontSize}px ${fonteSelecionada}`;
    }
    ctx.fillStyle = "black";
    ctx.textBaseline = "middle";
    ctx.fillText(assTexto, 20, 75);
    setData(d => ({ ...d, assinaturaUrl: cvs.toDataURL("image/png") }));
    toast.success("Assinatura gerada!");
  }, [assTexto, assEstilo]);

  // ─── Zoom & Foco ────────────────────────────────────────────────────────────
  const handleFocusTop = () => {
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFocusBottom = () => {
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollTo({ top: previewScrollRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  // ─── Solicitacao de Emissao / Salvar ──────────────────────────────────────
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
        finalFotoUrl = await compressImage(finalFotoUrl, 350, 450, 0.7);
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
        },
      };

      const url = editId ? `/api/documents/${editId}` : "/api/documents";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Erro ao salvar documento.");
      }

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

  // ─── Exportações ───────────────────────────────────────────────────────────
  const handleExportJpeg = async () => {
    if (!docRef.current) return;
    setIsDownloading(true);
    try {
      const blob = await docRef.current.exportAsBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `CNH_${data.nome.replace(/\s+/g, "_") || "Digital"}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Download da imagem CNH concluído!");
      }
    } catch { toast.error("Erro ao exportar JPEG."); }
    finally { setIsDownloading(false); }
  };

  const handleExportPdf = async () => {
    if (!docRef.current) return;
    setIsDownloading(true);
    try {
      await docRef.current.exportAsPdf();
      toast.success("Download do PDF concluído!");
    } catch { toast.error("Erro ao gerar PDF."); }
    finally { setIsDownloading(false); }
  };

  const handleExportCrop = async (modo: "frente" | "verso") => {
    if (!docRef.current) return;
    setIsDownloading(true);
    try {
      const blob = modo === "frente"
        ? await docRef.current.exportCropBlob(0, 0, 2461, 1700)
        : await docRef.current.exportCropBlob(0, 1700, 2461, 1796);

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `CNH_${modo.toUpperCase()}_${data.nome.replace(/\s+/g, "_") || "Digital"}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Crop ${modo.toUpperCase()} baixado!`);
      }
    } catch { toast.error("Erro ao exportar crop."); }
    finally { setIsDownloading(false); }
  };

  const handleWhatsAppShare = () => {
    const text = `Documento CNH Digital de ${data.nome} (CPF: ${data.cpf}) gerado com sucesso no DocMaster.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="h-screen w-full flex flex-col bg-[#070a19] text-slate-100 font-sans overflow-hidden select-text">
        {/* HEADER SUPERIOR */}
        <div className="h-16 border-b border-slate-800/80 bg-slate-950/90 px-6 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/dashboard")}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all"
              title="Voltar ao Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                  Emissor CNH Digital
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 border border-blue-500/30 text-blue-300 font-mono font-bold">
                    1:1 SENATRAN / SERPRO
                  </span>
                </h1>
                <p className="text-xs text-slate-400">Estado de Ouro com Live Preview em Tempo Real</p>
              </div>
            </div>
          </div>

          {/* BOTOES DE ACAO DO HEADER */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleAutoTudo}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow"
              title="Gerar automaticamente Registro, Espelho, Assinaturas Digitais e Senha App"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Gerar Tudo AUTO</span>
            </button>

            {/* Alternador Mobile (Form / Preview) */}
            <div className="lg:hidden flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setMobileMode("form")}
                className={`px-3 py-1 text-xs font-bold rounded-lg ${mobileMode === "form" ? "bg-blue-600 text-white" : "text-slate-400"}`}
              >
                Formulário
              </button>
              <button
                onClick={() => setMobileMode("preview")}
                className={`px-3 py-1 text-xs font-bold rounded-lg ${mobileMode === "preview" ? "bg-blue-600 text-white" : "text-slate-400"}`}
              >
                Prévia CNH
              </button>
            </div>

            {!saved ? (
              <button
                onClick={handleRequestEmit}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? "Processando..." : "EMITIR CNH"}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPdf}
                  disabled={isDownloading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={handleWhatsAppShare}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BODY DE CONTEUDO (SPLIT-VIEW) */}
        <div className="flex-1 flex overflow-hidden">
          {/* COLUNA ESQUERDA: FORMULARIO COM ABAS */}
          <div className={`w-full lg:w-1/2 flex flex-col border-r border-slate-800/80 bg-slate-900/40 ${mobileMode === "preview" ? "hidden lg:flex" : "flex"}`}>
            {/* BARRA DE ABAS DO FORMULARIO */}
            <div className="flex items-center gap-1.5 p-2 bg-slate-950/80 border-b border-slate-800/80 overflow-x-auto no-scrollbar shrink-0">
              <button
                onClick={() => setActiveTab("pessoais")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${activeTab === "pessoais" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Dados Pessoais</span>
              </button>
              <button
                onClick={() => setActiveTab("cnh")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${activeTab === "cnh" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Dados CNH</span>
              </button>
              <button
                onClick={() => setActiveTab("seguranca")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${activeTab === "seguranca" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Segurança</span>
              </button>
              <button
                onClick={() => setActiveTab("midia")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${activeTab === "midia" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Foto & Assinatura</span>
              </button>
              <button
                onClick={() => setActiveTab("import")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${activeTab === "import" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Importação Rápida</span>
              </button>
            </div>

            {/* PAINEL SCROLLABLE DO FORMULARIO */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ABA: DADOS PESSOAIS */}
              {activeTab === "pessoais" && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Nome Completo do Condutor</label>
                    <input
                      type="text"
                      value={data.nome}
                      onChange={update("nome")}
                      placeholder="Ex: SILVA SANTOS SILVA"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none uppercase font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">CPF</label>
                        <button
                          type="button"
                          onClick={handleAutoCPF}
                          className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" /> AUTO CPF
                        </button>
                      </div>
                      <input
                        type="text"
                        value={data.cpf}
                        onChange={update("cpf")}
                        placeholder="000.000.000-00"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Sexo</label>
                      <select
                        value={data.sexo}
                        onChange={update("sexo")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Selecione...</option>
                        <option value="M">MASCULINO (M)</option>
                        <option value="F">FEMININO (F)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-300">RG (Sem Pontos)</label>
                      <input
                        type="text"
                        value={data.rg}
                        onChange={update("rg")}
                        placeholder="123456789"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-300">Órgão Emissor</label>
                      <input
                        type="text"
                        value={data.orgaoEmissor}
                        onChange={update("orgaoEmissor")}
                        placeholder="SSP"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none uppercase"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-300">UF RG</label>
                      <select
                        value={data.ufRG}
                        onChange={update("ufRG")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">UF</option>
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-300">Data Nascimento</label>
                      <input
                        type="date"
                        value={data.dataNascimento}
                        onChange={update("dataNascimento")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-300">Local Nascimento</label>
                      <input
                        type="text"
                        value={data.localNascimento}
                        onChange={update("localNascimento")}
                        placeholder="SÃO PAULO"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none uppercase"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-300">UF Nasc.</label>
                      <select
                        value={data.ufNascimento}
                        onChange={update("ufNascimento")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">UF</option>
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Nome do Pai</label>
                      <input
                        type="text"
                        value={data.nomePai}
                        onChange={update("nomePai")}
                        placeholder="NOME DO PAI"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Nome da Mãe</label>
                      <input
                        type="text"
                        value={data.nomeMae}
                        onChange={update("nomeMae")}
                        placeholder="NOME DA MÃE"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ABA: DADOS CNH */}
              {activeTab === "cnh" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Categoria Habilitação</label>
                      <input
                        type="text"
                        value={data.categoria}
                        onChange={update("categoria")}
                        placeholder="Ex: AB, B, E"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none font-bold uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Tipo de CNH</label>
                      <select
                        value={data.tipo}
                        onChange={update("tipo")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Definitiva">Definitiva (D)</option>
                        <option value="PPD">Permissão para Dirigir (P)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">Nº Registro (11 Digs)</label>
                        <button type="button" onClick={handleAutoRegistro} className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1">
                          <Zap className="w-3 h-3" /> AUTO
                        </button>
                      </div>
                      <input
                        type="text"
                        value={data.registro}
                        onChange={update("registro")}
                        placeholder="00000000000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">Nº CNH / Espelho (10 Digs)</label>
                        <button type="button" onClick={handleAutoEspelho} className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1">
                          <Zap className="w-3 h-3" /> AUTO
                        </button>
                      </div>
                      <input
                        type="text"
                        value={data.espelho}
                        onChange={update("espelho")}
                        placeholder="0000000000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">Validade CNH</label>
                        <button type="button" onClick={handleAutoValidade} className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1">
                          <Zap className="w-3 h-3" /> AUTO IDADE
                        </button>
                      </div>
                      <input
                        type="date"
                        value={data.validade}
                        onChange={update("validade")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">1ª Habilitação</label>
                      <input
                        type="date"
                        value={data.primeiraHabilitacao}
                        onChange={update("primeiraHabilitacao")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-300">Data Emissão</label>
                      <input
                        type="date"
                        value={data.dataEmissao}
                        onChange={update("dataEmissao")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-300">Local Emissão</label>
                      <input
                        type="text"
                        value={data.localEmissao}
                        onChange={update("localEmissao")}
                        placeholder="SÃO PAULO"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none uppercase"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-xs font-bold text-slate-300">UF Emissão</label>
                      <select
                        value={data.ufEmissao}
                        onChange={update("ufEmissao")}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none"
                      >
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA: SEGURANÇA */}
              {activeTab === "seguranca" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">Assinatura Digital 1</label>
                        <button type="button" onClick={handleAutoAss1} className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1">
                          <Zap className="w-3 h-3" /> AUTO
                        </button>
                      </div>
                      <input
                        type="text"
                        value={data.assDigital1}
                        onChange={update("assDigital1")}
                        placeholder="10 dígitos"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">Assinatura Digital 2 (com UF)</label>
                        <button type="button" onClick={handleAutoAss2} className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1">
                          <Zap className="w-3 h-3" /> AUTO
                        </button>
                      </div>
                      <input
                        type="text"
                        value={data.assDigital2}
                        onChange={update("assDigital2")}
                        placeholder="UF + 8 dígitos"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">Senha App Cliente (4 Dígitos)</label>
                      <button type="button" onClick={handleAutoSenha} className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1">
                        <Zap className="w-3 h-3" /> AUTO SENHA
                      </button>
                    </div>
                    <input
                      type="text"
                      value={data.senhaApp}
                      onChange={update("senhaApp")}
                      placeholder="Ex: 1234"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Observações (EAR / Restrições)</label>
                    <textarea
                      value={data.observacoes}
                      onChange={update("observacoes")}
                      rows={3}
                      placeholder="Ex: EXERCE ATIVIDADE REMUNERADA (EAR)..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-blue-500/40 text-white text-sm focus:border-blue-400 focus:outline-none font-mono uppercase"
                    />
                  </div>
                </div>
              )}

              {/* ABA: FOTO & ASSINATURA */}
              {activeTab === "midia" && (
                <div className="space-y-6">
                  {/* FOTO 3X4 */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-blue-400" /> Foto 3x4 do Condutor
                      </span>
                      <button
                        type="button"
                        onClick={handleApplyAI}
                        disabled={isApplyingAI || !data.fotoUrl}
                        className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isApplyingAI ? "Processando IA..." : "Melhorar com IA"}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all">
                        <Upload className="w-3.5 h-3.5 text-blue-400" /> Upload Foto 3x4
                        <input type="file" accept="image/*" onChange={handleFotoUpload} className="hidden" />
                      </label>
                      {data.fotoUrl && (
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Foto Carregada
                        </span>
                      )}
                    </div>

                    {data.fotoUrl && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                          <span>Escala: {Math.round(fotoScale * 100)}%</span>
                          <span>X: {fotoOffsetX}px | Y: {fotoOffsetY}px</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setFotoScale(s => clamp(s - 0.05, 0.5, 2))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"><ZoomOut className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setFotoScale(s => clamp(s + 0.05, 0.5, 2))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"><ZoomIn className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setFotoOffsetX(x => clamp(x - 2, -100, 100))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"><ArrowLeft className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setFotoOffsetX(x => clamp(x + 2, -100, 100))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"><ArrowRight className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setFotoOffsetY(y => clamp(y - 2, -100, 100))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"><ArrowUp className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setFotoOffsetY(y => clamp(y + 2, -100, 100))} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700"><ArrowDown className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { setFotoScale(1); setFotoOffsetX(0); setFotoOffsetY(0); }} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 ml-auto"><RotateCcw className="w-3.5 h-3.5 text-amber-400" /></button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ASSINATURA MANUSCRITA */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-400" /> Assinatura do Condutor
                    </span>

                    <div className="flex items-center gap-4">
                      <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all">
                        <Upload className="w-3.5 h-3.5 text-blue-400" /> Upload Imagem
                        <input type="file" accept="image/*" onChange={handleAssinaturaUpload} className="hidden" />
                      </label>
                    </div>

                    {/* Gerador de Assinatura em Texto */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <span className="text-[11px] font-bold text-slate-300">Ou Gerar por Texto</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={assTexto}
                          onChange={e => setAssTexto(e.target.value)}
                          placeholder="Digite o nome para assinar..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                        <select
                          value={assEstilo}
                          onChange={e => setAssEstilo(Number(e.target.value))}
                          className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        >
                          {ESTILOS_ASS.map((est, i) => <option key={i} value={i}>{est.label}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={gerarAssinaturaTexto}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow"
                        >
                          Gerar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA: IMPORTACAO RAPIDA */}
              {activeTab === "import" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <Zap className="w-4 h-4" /> Importação Rápida via Bloco de Texto
                    </p>
                    <p className="text-slate-300">Cole a ficha cadastral do condutor e o sistema extrairá automaticamente Nome, CPF, RG, Categoria, Validade e demais campos.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopiarModelo}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-blue-400" /> Copiar Modelo Padrão
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessarImportacao}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                    >
                      <Check className="w-3.5 h-3.5" /> Processar Importação
                    </button>
                  </div>

                  <textarea
                    rows={12}
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="Cole aqui o texto no formato do modelo..."
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: LIVE PREVIEW E CONTROLES */}
          <div className={`w-full lg:w-1/2 flex flex-col bg-slate-950/90 relative ${mobileMode === "form" ? "hidden lg:flex" : "flex"}`}>
            {/* TOOLBAR DO PREVIEW */}
            <div className="h-12 border-b border-slate-800/80 px-4 bg-slate-900/90 flex items-center justify-between shrink-0 no-print">
              {/* ZOOM & FOCO */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-blue-400" /> Preview 1:1
                </span>
                <div className="h-4 w-px bg-slate-800 mx-1" />
                <button
                  type="button"
                  onClick={() => setZoomWidth(w => Math.max(380, w - 40))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomWidth(580)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
                  title="Resetar Zoom (100%)"
                >
                  {Math.round((zoomWidth / 580) * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomWidth(w => Math.min(850, w + 40))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* FOCO RAPIDO (TOPO / RODAPE) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFocusTop}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> Frente (Topo)
                </button>
                <button
                  type="button"
                  onClick={handleFocusBottom}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-cyan-400" /> Verso (MRZ)
                </button>
              </div>
            </div>

            {/* BARRA DE ACOES DE EXPORTACAO DO PREVIEW */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-950 flex items-center justify-center gap-2 flex-wrap shrink-0 no-print">
              <button
                onClick={handleExportJpeg}
                disabled={isDownloading}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" /> JPEG Completo
              </button>
              <button
                onClick={() => handleExportCrop("frente")}
                disabled={isDownloading}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" /> Crop Frente
              </button>
              <button
                onClick={() => handleExportCrop("verso")}
                disabled={isDownloading}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" /> Crop Verso
              </button>
            </div>

            {/* CONTAINER SCROLLABLE DO PREVIEW DO DOCUMENTO */}
            <div
              ref={previewScrollRef}
              className="flex-1 overflow-y-auto p-8 flex items-start justify-center bg-[#04060f] relative shadow-inner"
            >
              <div className="shadow-2xl rounded-xl overflow-hidden border border-slate-800 bg-white">
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
                  previewWidth={zoomWidth}
                />
              </div>
            </div>
          </div>
        </div>
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
    </DashboardLayout>
  );
}
