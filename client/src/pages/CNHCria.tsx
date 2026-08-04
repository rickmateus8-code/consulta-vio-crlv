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
import { useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import CNHDocument, { type CNHDocumentHandle, type CNHDocumentProps } from "../components/CNHDocument";
import { toast } from "sonner";
import { validarCPF, formatarCPF as formatarCPFUtil, displayDateToHtml } from "@/lib/utils";
import EmissionModal from "@/components/EmissionModal";
import {
  ArrowLeft, Save, Download, MessageCircle, Copy, Zap,
  Upload, Lock, Check, User, Camera, Car, RefreshCw, ZoomIn, ZoomOut,
  RotateCcw, AlertTriangle, ArrowRight, ArrowUp, ArrowDown
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

  // Carregar documento se em edição
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
          }
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }
  }, []);

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

  // ─── GERADORES AUTOMÁTICOS ───────────────────────────────────────────────
  const handleAutoRegistro = () => setData(d => ({ ...d, registro: gerarNumero(11) }));
  const handleAutoEspelho = () => setData(d => ({ ...d, espelho: gerarNumero(10) }));
  const handleAutoAss1 = () => setData(d => ({ ...d, assDigital1: gerarNumero(10) }));
  const handleAutoAss2 = () => {
    const uf = data.ufEmissao || "SP";
    setData(d => ({ ...d, assDigital2: uf + gerarNumero(8) }));
  };

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
      ufEmissao: ufEmissaoVal,
      assDigital1: get("Ass\\.? Digital 1") || gerarNumero(10),
      assDigital2: get("Ass\\.? Digital 2") || (ufEmissaoVal + gerarNumero(8)),
      senhaApp: get("Senha App") || get("Senha") || String(Math.floor(1000 + Math.random() * 9000)),
      observacoes: get("Observa[çc][oõ]es") || d.observacoes,
    }));
    setEtapa("pessoais");
    toast.success("Dados colados e preenchidos com sucesso!");
  };

  // ─── UPLOAD DE FOTO E ASSINATURA ──────────────────────────────────────────
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

  const gerarAssinaturaTexto = useCallback(() => {
    if (!assTexto.trim()) return;
    const cvs = document.createElement("canvas");
    cvs.width = 600; cvs.height = 150;
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
    toast.success("Assinatura por texto gerada!");
  }, [assTexto, assEstilo]);

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
          liberarToxicologico,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#060919] text-slate-100 font-sans flex flex-col justify-between select-text min-h-screen w-full">
        {/* CONTAINER CARD PREENCHENDO 100% DA TELA */}
        <div className="w-full min-h-screen bg-[#0b1026] border-0 rounded-none shadow-none flex flex-col justify-between flex-1">
          {/* HEADER SUPERIOR DO CARD */}
          <div className="p-4 sm:p-5 border-b border-blue-500/20 bg-slate-950/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-base sm:text-lg font-black tracking-wide text-white">
                <span className="text-blue-400">DOCMASTER</span>.STORE Gerador de CNH
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={limparFormulario}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all"
              >
                LIMPAR FORMULÁRIO
              </button>
              <button
                type="button"
                onClick={() => setLocation("/dashboard")}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all"
              >
                VOLTAR
              </button>
            </div>
          </div>

          {/* CORPO CENTRAL DO CARD: SIDEBAR + CONTEÚDO DA ETAPA */}
          <div className="flex flex-col md:flex-row p-4 sm:p-6 gap-6 flex-1 min-h-[500px]">
            {/* SIDEBAR LATERAL (4 ITENS) */}
            <div className="w-full md:w-56 shrink-0 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setEtapa("automacao")}
                className={`w-full px-4 py-3 rounded-xl border text-left text-xs font-bold tracking-wide transition-all ${
                  etapa === "automacao"
                    ? "border-blue-500 bg-blue-950/80 text-white shadow-lg shadow-blue-500/20"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                AUTOMAÇÃO
              </button>

              <button
                type="button"
                onClick={() => setEtapa("pessoais")}
                className={`w-full px-4 py-3 rounded-xl border text-left text-xs font-bold tracking-wide transition-all ${
                  etapa === "pessoais"
                    ? "border-blue-500 bg-blue-950/80 text-white shadow-lg shadow-blue-500/20"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                1. PESSOAIS
              </button>

              <button
                type="button"
                onClick={() => setEtapa("cnh")}
                className={`w-full px-4 py-3 rounded-xl border text-left text-xs font-bold tracking-wide transition-all ${
                  etapa === "cnh"
                    ? "border-blue-500 bg-blue-950/80 text-white shadow-lg shadow-blue-500/20"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                2. CNH
              </button>

              <button
                type="button"
                onClick={() => setEtapa("finalizacao")}
                className={`w-full px-4 py-3 rounded-xl border text-left text-xs font-bold tracking-wide transition-all ${
                  etapa === "finalizacao"
                    ? "border-blue-500 bg-blue-950/80 text-white shadow-lg shadow-blue-500/20"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                3. FINALIZAÇÃO
              </button>
            </div>

            {/* CONTEÚDO PRINCIPAL DA ETAPA SELECIONADA */}
            <div className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 relative flex flex-col justify-between">
              {/* ETAPA 1: AUTOMAÇÃO */}
              {etapa === "automacao" && (
                <div className="space-y-6">
                  <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 font-bold text-xs">
                    AUTOMAÇÃO VIA WHATSAPP
                  </div>

                  <p className="text-xs text-slate-300 font-medium">1. Envie para o cliente preencher</p>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={handleCopiarWhatsApp}
                      className="py-3 px-4 rounded-xl border border-blue-500/40 bg-blue-950/60 hover:bg-blue-900/80 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow"
                    >
                      <Copy className="w-4 h-4 text-blue-400" /> COPIAR
                    </button>

                    <button
                      type="button"
                      onClick={handleColarEPreencher}
                      className="py-3 px-4 rounded-xl border border-blue-500/40 bg-blue-950/60 hover:bg-blue-900/80 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow"
                    >
                      <Zap className="w-4 h-4 text-amber-400" /> COLAR E PREENCHER
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-slate-900/80 text-emerald-400 text-xs font-mono">
                    Aguardando envio ou colagem do formulário.
                  </div>
                </div>
              )}

              {/* ETAPA 2: 1. PESSOAIS */}
              {etapa === "pessoais" && (
                <div className="space-y-4">
                  <div className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-950/30 text-purple-300 text-xs font-bold flex items-center gap-2">
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs uppercase font-bold focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">CPF</label>
                      <input
                        type="text"
                        value={data.cpf}
                        onChange={update("cpf")}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Sexo</label>
                      <select
                        value={data.sexo}
                        onChange={update("sexo")}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Órgão Emissor</label>
                      <input
                        type="text"
                        value={data.orgaoEmissor}
                        onChange={update("orgaoEmissor")}
                        placeholder="SSP"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs uppercase focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">UF RG</label>
                      <select
                        value={data.ufRG}
                        onChange={update("ufRG")}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs uppercase focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Data Nascimento</label>
                      <input
                        type="date"
                        value={data.dataNascimento}
                        onChange={update("dataNascimento")}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Local Nascimento</label>
                      <input
                        type="text"
                        value={data.localNascimento}
                        onChange={update("localNascimento")}
                        placeholder="Local"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs uppercase focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">UF Nasc.</label>
                      <select
                        value={data.ufNascimento}
                        onChange={update("ufNascimento")}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-blue-500 focus:outline-none"
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs uppercase focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Nome da Mãe</label>
                      <input
                        type="text"
                        value={data.nomeMae}
                        onChange={update("nomeMae")}
                        placeholder="Nome da Mãe"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs uppercase focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 3: 2. CNH */}
              {etapa === "cnh" && (
                <div className="space-y-4">
                  <div className="p-2.5 rounded-lg border border-blue-500/30 bg-blue-950/30 text-blue-300 text-xs font-bold flex items-center gap-2">
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
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                        />
                        <button type="button" onClick={handleAutoRegistro} className="px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px]">
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
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                        />
                        <button type="button" onClick={handleAutoEspelho} className="px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px]">
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
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs uppercase font-bold"
                      />
                    </div>

                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Tipo</label>
                      <select
                        value={data.tipo}
                        onChange={update("tipo")}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                      >
                        <option value="Definitiva">Definitiva (D)</option>
                        <option value="PPD">Permissão para Dirigir (P)</option>
                      </select>
                    </div>
                  </div>

                  {/* CHECKBOXES DE CATEGORIAS */}
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Validade</label>
                      <input
                        type="date"
                        value={data.validade}
                        onChange={update("validade")}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">1ª Habilitação</label>
                      <input
                        type="date"
                        value={data.primeiraHabilitacao}
                        onChange={update("primeiraHabilitacao")}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
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
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">UF Emissão</label>
                      <select
                        value={data.ufEmissao}
                        onChange={update("ufEmissao")}
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
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
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                        />
                        <button type="button" onClick={handleAutoAss1} className="px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px]">
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
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-mono uppercase"
                        />
                        <button type="button" onClick={handleAutoAss2} className="px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px]">
                          GERAR
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 4: 3. FINALIZAÇÃO */}
              {etapa === "finalizacao" && (
                <div className="space-y-4">
                  <div className="p-2.5 rounded-lg border border-teal-500/30 bg-teal-950/30 text-teal-300 text-xs font-bold flex items-center gap-2">
                    <Camera className="w-4 h-4 text-teal-400" /> 4. FOTOS E FINALIZAÇÃO
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* COLUNA 1: FOTO DO ROSTO */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col space-y-3">
                      <span className="text-xs font-bold text-slate-200">Foto do Rosto</span>
                      <span className="text-[10px] text-blue-400 hover:underline cursor-pointer">
                        Para melhor qualidade, remova o fundo AQUI.
                      </span>
                      <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 w-fit">
                        <Upload className="w-3.5 h-3.5" /> Escolher arquivo
                        <input type="file" accept="image/*" onChange={handleFotoUpload} className="hidden" />
                      </label>

                      <div className="w-full h-40 rounded-lg border border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden relative">
                        {data.fotoUrl ? (
                          <img
                            src={data.fotoUrl}
                            alt="Foto Rosto"
                            className="w-full h-full object-cover"
                            style={{
                              transform: `translate(${fotoOffsetX}px, ${fotoOffsetY}px) scale(${fotoScale})`,
                              transformOrigin: "center",
                            }}
                          />
                        ) : (
                          <span className="text-xs text-slate-500">Sem Foto</span>
                        )}
                      </div>

                      {data.fotoUrl && (
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button onClick={() => setFotoScale(s => clamp(s - 0.05, 0.5, 2))} className="p-1 rounded bg-slate-800 text-xs font-bold"><ZoomOut className="w-3 h-3" /></button>
                          <span className="text-xs font-mono font-bold text-slate-300">{Math.round(fotoScale * 100)}%</span>
                          <button onClick={() => setFotoScale(s => clamp(s + 0.05, 0.5, 2))} className="p-1 rounded bg-slate-800 text-xs font-bold"><ZoomIn className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>

                    {/* COLUNA 2: ASSINATURA */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col space-y-3">
                      <span className="text-xs font-bold text-slate-200">Assinatura (Foto ou Digite)</span>
                      
                      <div className="space-y-1.5 text-[11px] text-slate-300">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" checked={assModo === "texto"} onChange={() => setAssModo("texto")} className="text-blue-600" />
                          <span>Opção 1: Digite o Nome</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" checked={assModo === "foto"} onChange={() => setAssModo("foto")} className="text-blue-600" />
                          <span>Opção 2: Enviar uma Foto</span>
                        </label>
                      </div>

                      {assModo === "texto" ? (
                        <div className="space-y-2">
                          <select
                            value={assEstilo}
                            onChange={e => setAssEstilo(Number(e.target.value))}
                            className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs"
                          >
                            {ESTILOS_ASS.map((est, i) => <option key={i} value={i}>{est.label}</option>)}
                          </select>
                          <input
                            type="text"
                            value={assTexto}
                            onChange={e => setAssTexto(e.target.value)}
                            placeholder="Digite o nome para assinar..."
                            className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                          />
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={gerarAssinaturaTexto} className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs">
                              USAR NOME
                            </button>
                            <button type="button" onClick={() => setAssTexto("")} className="px-3 py-1 rounded bg-slate-800 text-slate-300 font-bold text-xs">
                              LIMPAR
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 w-fit">
                          <Upload className="w-3.5 h-3.5" /> Escolher arquivo
                          <input type="file" accept="image/*" onChange={handleAssinaturaUpload} className="hidden" />
                        </label>
                      )}

                      <div className="w-full h-16 rounded-lg border border-slate-700 bg-white flex items-center justify-center overflow-hidden relative p-1">
                        {data.assinaturaUrl ? (
                          <img
                            src={data.assinaturaUrl}
                            alt="Assinatura"
                            className="max-h-full object-contain"
                            style={{
                              transform: `translate(${assOffsetX}px, ${assOffsetY}px) scale(${assScale})`,
                              transformOrigin: "center",
                            }}
                          />
                        ) : (
                          <span className="text-xs text-slate-400 font-sans">Sem Assinatura</span>
                        )}
                      </div>

                      {/* CONTROLES DE ZOOM E POSIÇÃO DA ASSINATURA */}
                      {data.assinaturaUrl && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setAssScale(s => clamp(s - 0.05, 0.5, 2.5))} className="p-1 rounded bg-slate-800 text-[10px]"><ZoomOut className="w-3 h-3" /></button>
                            <span className="text-[10px] font-mono text-slate-300">{Math.round(assScale * 100)}%</span>
                            <button onClick={() => setAssScale(s => clamp(s + 0.05, 0.5, 2.5))} className="p-1 rounded bg-slate-800 text-[10px]"><ZoomIn className="w-3 h-3" /></button>
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => { setAssScale(1); setAssOffsetX(0); setAssOffsetY(0); }} className="p-1 rounded bg-slate-800 text-[10px]"><RotateCcw className="w-3 h-3 text-amber-400" /></button>
                            <button onClick={() => setAssOffsetX(x => clamp(x - 2, -50, 50))} className="p-1 rounded bg-slate-800 text-[10px]"><ArrowLeft className="w-3 h-3" /></button>
                            <button onClick={() => setAssOffsetX(x => clamp(x + 2, -50, 50))} className="p-1 rounded bg-slate-800 text-[10px]"><ArrowRight className="w-3 h-3" /></button>
                            <button onClick={() => setAssOffsetY(y => clamp(y - 2, -30, 30))} className="p-1 rounded bg-slate-800 text-[10px]"><ArrowUp className="w-3 h-3" /></button>
                            <button onClick={() => setAssOffsetY(y => clamp(y + 2, -30, 30))} className="p-1 rounded bg-slate-800 text-[10px]"><ArrowDown className="w-3 h-3" /></button>
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

          {/* BOTÃO GERAR CNH NA PARTE INFERIOR DO CARD */}
          <div className="p-4 bg-slate-950/90 border-t border-blue-500/20 flex items-center justify-center no-print">
            <button
              type="button"
              onClick={handleRequestEmit}
              disabled={loading}
              className="w-full max-w-lg py-3 px-8 rounded-full border-2 border-blue-500/80 bg-blue-950/80 hover:bg-blue-900 text-white font-black text-sm tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>PROCESSANDO GERADOR...</span>
              ) : (
                <>
                  <Car className="w-5 h-5 text-blue-400" />
                  <span>Gerar CNH</span>
                </>
              )}
            </button>
          </div>
        </div>

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
