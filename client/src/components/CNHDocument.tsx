/**
 * CNHDocument — Geração visual da CNH Digital A4 (PDF SENATRAN/SERPRO)
 *
 * Layout 1:1 com CNH-e (COMPLETO).pdf:
 *  - Página 1: CNH frente (canvas @300DPI) | Painel QR-CODE + SERPRO/SENATRAN
 *  - Página 2: Legenda multilíngue (PT / EN / ES) dos campos
 *
 * QR Code aponta para: https://validacao-online-vio.digital/?id={UUID_DO_DOCUMENTO}
 */
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import QRCode from "qrcode";

export interface CNHDocumentProps {
  nome: string;
  cpf: string;
  rg: string;
  orgaoEmissor: string;
  ufRG: string;
  sexo: string;
  nacionalidade: string;
  dataNascimento: string;
  localNascimento: string;
  ufNascimento: string;
  nomePai: string;
  nomeMae: string;
  categoria: string;
  tipo: string;
  registro: string;
  espelho: string;
  validade: string;
  validadeCNH2?: string;
  dataEmissao: string;
  primeiraHabilitacao: string;
  localEmissao: string;
  ufEmissao: string;
  assDigital1: string;
  assDigital2: string;
  senhaApp: string;
  observacoes: string;
  fotoUrl: string;
  assinaturaUrl: string;
  fotoScale?: number;
  fotoOffsetX?: number;
  fotoOffsetY?: number;
  assScale?: number;
  assOffsetX?: number;
  assOffsetY?: number;
  codigoQR?: string;
  blurred?: boolean;
  previewWidth?: number;
}

export interface CNHDocumentHandle {
  exportAsBlob: () => Promise<Blob | null>;
  exportAsPdf: () => Promise<void>;
  getCanvas: () => HTMLCanvasElement | null;
  exportCropBlob: (x: number, y: number, w: number, h: number) => Promise<Blob | null>;
}

// ─── Mapa de UF → Nome Completo ──────────────────────────────────────────────
const MAPA_UFS_DOC: Record<string, string> = {
  "ACRE": "AC", "ALAGOAS": "AL", "AMAPA": "AP", "AMAZONAS": "AM", "BAHIA": "BA",
  "CEARA": "CE", "DISTRITO FEDERAL": "DF", "ESPIRITO SANTO": "ES", "GOIAS": "GO",
  "MARANHAO": "MA", "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS", "MINAS GERAIS": "MG",
  "PARA": "PA", "PARAIBA": "PB", "PARANA": "PR", "PERNAMBUCO": "PE", "PIAUI": "PI",
  "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS",
  "RONDONIA": "RO", "RORAIMA": "RR", "SANTA CATARINA": "SC", "SAO PAULO": "SP",
  "SÃO PAULO": "SP", "SERGIPE": "SE", "TOCANTINS": "TO"
};

function normalizeUFDoc(val?: string): string {
  if (!val) return "SP";
  const clean = val.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (clean.length === 2 && /^[A-Z]{2}$/.test(clean)) return clean;
  if (MAPA_UFS_DOC[clean]) return MAPA_UFS_DOC[clean];
  const foundKey = Object.keys(MAPA_UFS_DOC).find(k => k === clean || clean.includes(k));
  if (foundKey) return MAPA_UFS_DOC[foundKey];
  return clean.slice(0, 2) || "SP";
}
const NOMES_ESTADOS: Record<string, string> = {
  AC: "ACRE", AL: "ALAGOAS", AP: "AMAPÁ", AM: "AMAZONAS",
  BA: "BAHIA", CE: "CEARÁ", DF: "DISTRITO FEDERAL", ES: "ESPÍRITO SANTO",
  GO: "GOIÁS", MA: "MARANHÃO", MT: "MATO GROSSO", MS: "MATO GROSSO DO SUL",
  MG: "MINAS GERAIS", PA: "PARÁ", PB: "PARAÍBA", PR: "PARANÁ",
  PE: "PERNAMBUCO", PI: "PIAUÍ", RJ: "RIO DE JANEIRO", RN: "RIO GRANDE DO NORTE",
  RS: "RIO GRANDE DO SUL", RO: "RONDÔNIA", RR: "RORAIMA", SC: "SANTA CATARINA",
  SP: "SÃO PAULO", SE: "SERGIPE", TO: "TOCANTINS",
};

function fmtDate(d: string): string {
  if (!d) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, dd] = d.slice(0, 10).split("-");
    return `${dd}/${m}/${y}`;
  }
  return d;
}

function formatarCPF(v: string): string {
  const d = v.replace(/\D/g, "");
  if (d.length !== 11) return v;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function getCrossOrigin(url: string): "" | "anonymous" | undefined {
  if (!url) return undefined;
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/")) return undefined;
  return "anonymous";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const crossOrigin = getCrossOrigin(src);
    if (crossOrigin) img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = (e) => { console.warn("Erro ao carregar imagem:", src, e); reject(e); };
    img.src = src;
  });
}

// ─── Geração MRZ (OCR-B) ─────────────────────────────────────────────────────
function gerarMRZ(p: CNHDocumentProps): string[] {
  const pad = (s: string, l: number) => (s || "UNKNOWN").toUpperCase().replace(/[^A-Z0-9]/g, "<").padEnd(l, "<");
  const fmtData = (d: string) => {
    if (!d) return "000000";
    const p2 = d.split("/");
    if (p2.length === 3) return `${p2[2].slice(2)}${p2[1]}${p2[0]}`;
    const p3 = d.split("-");
    if (p3.length === 3) return `${p3[0].slice(2)}${p3[1]}${p3[2]}`;
    return "000000";
  };
  const r = (p.registro || "00000000000").replace(/\D/g, "").padEnd(11, "<").slice(0, 11);
  const e = (p.espelho || "0000000000").replace(/\D/g, "").padEnd(10, "<").slice(0, 10);
  const partes = (p.nome || "").trim().split(/\s+/).filter(Boolean);
  
  let nomeFormatadoRaw = "";
  if (partes.length > 1) {
    const ultimoSobrenome = partes[partes.length - 1];
    const nomesRestantes = partes.slice(0, partes.length - 1).join("<");
    nomeFormatadoRaw = `${ultimoSobrenome}<<${nomesRestantes}`;
  } else {
    nomeFormatadoRaw = partes[0] || "DESCONHECIDO";
  }
  const nomeFormatado = pad(nomeFormatadoRaw, 30).substring(0, 30);

  return [
    `I<BRA${r}<${e}<<<`,
    `${fmtData(p.dataNascimento)}0${p.sexo ? p.sexo.charAt(0).toUpperCase() : "M"}${fmtData(p.validade)}5BRA<<<<<<<<<<<<`,
    nomeFormatado,
  ];
}

import { MYRIAD_REGULAR_BASE64, OCRB_BASE64 } from "./cnhFontsBase64";

// ─── Carregamento de Fontes (100% Embutidas em Base64 para Garantia de Exibição Instantânea) ─────
let fontsLoaded = false;
async function loadFonts() {
  if (fontsLoaded) return;
  try {
    const ocrFont = new FontFace("OCR-B", `url(${OCRB_BASE64})`);
    const myriadReg = new FontFace("MyriadPro-Regular", `url(${MYRIAD_REGULAR_BASE64})`);
    const [f1, f2] = await Promise.all([
      ocrFont.load(), myriadReg.load()
    ]);
    document.fonts.add(f1);
    document.fonts.add(f2);
    await document.fonts.ready;
    fontsLoaded = true;
  } catch (e) {
    console.warn("Fontes customizadas não carregaram:", e);
  }
}

// ─── Dimensões do Canvas A4 @300DPI ─────────────────────────────────────────
const PAGE_W = 2481;
const PAGE_H = 3508;

// ─── Página 2: Legenda Multilíngue dos Campos da CNH ────────────────────────
function gerarPaginaLegenda(): HTMLCanvasElement {
  const cvs = document.createElement("canvas");
  // A4 @150DPI (aprox.) — compatível com jsPDF 210mm x 297mm
  cvs.width = 1240;
  cvs.height = 1754;
  const ctx = cvs.getContext("2d")!;

  // Fundo Branco
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, cvs.width, cvs.height);

  // Header cinza
  ctx.fillStyle = "#e8e8e8";
  ctx.fillRect(0, 0, cvs.width, 100);

  ctx.fillStyle = "#1a1a2e";
  ctx.font = "bold 22px 'MyriadPro-Regular', sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("CARTEIRA NACIONAL DE HABILITAÇÃO / DRIVER LICENSE / PERMISO DE CONDUCCIÓN", 40, 50);

  // Linha separadora
  ctx.fillStyle = "#cccccc";
  ctx.fillRect(0, 100, cvs.width, 2);

  const campos = [
    ["2", "Nome e Sobrenome", "Name and Surname", "Nombre y Apellidos"],
    ["1", "Primeira Habilitação", "First Driver License", "Primera Licencia de Conducir"],
    ["3", "Data e Local e UF de Nascimento", "Date and Place of Birth", "Fecha y Lugar de Nacimiento"],
    ["4a", "Data de Emissão", "Issuing Date (DD/MM/YYYY)", "Fecha de Emisión"],
    ["4b", "Data de Validade", "Expiration Date (DD/MM/YYYY)", "Válido Hasta"],
    ["ACC", "Cicloambulante", "Cycle", "Cicloambulante"],
    ["4c", "Documento de Identidade – Órgão Emissor", "Identity Document – Issuing Authority", "Documento de Identificación – Autoridad Expedidora"],
    ["4d", "CPF", "CPF", "CPF"],
    ["5", "Número de registro da CNH", "Driver License Number", "Número de Permiso de Conducir"],
    ["9", "Categoria de Veículos da Carteira de Habilitação", "Driver license Class", "Categoría de Permisos de Conducir"],
    ["10", "Nacionalidade", "Nationality", "Nacionalidad"],
    ["11", "Filiação / Filiation", "Filiation", "Filiación"],
    ["12", "Observações", "Observations", "Observaciones"],
    ["Local", "Lugar", "Place", "Lugar"],
  ];

  let y = 130;
  const rowH = 78;
  const colX = [40, 120, 480, 840];
  const colW = [70, 340, 340, 350];

  ctx.fillStyle = "#1a5276";
  ctx.fillRect(40, y, cvs.width - 80, 40);
  ctx.fillStyle = "#FFFFFF";
  ctx.textBaseline = "middle";
  ctx.fillText("Nº", colX[0], y + 20);
  ctx.fillText("Português (PT)", colX[1], y + 20);
  ctx.fillText("English (EN)", colX[2], y + 20);
  ctx.fillText("Español (ES)", colX[3], y + 20);
  y += 45;

  const drawClippedText = (text: string, x: number, centerY: number, maxW: number, isBold = false) => {
    ctx.font = `${isBold ? "bold " : ""}13px 'MyriadPro-Regular', sans-serif`;
    let fontSize = 13;
    while (ctx.measureText(text).width > maxW && fontSize > 8.5) {
      fontSize -= 0.5;
      ctx.font = `${isBold ? "bold " : ""}${fontSize}px 'MyriadPro-Regular', sans-serif`;
    }
    ctx.fillText(text, x, centerY, maxW);
  };

  campos.forEach((row, idx) => {
    // Fundo alternado
    ctx.fillStyle = idx % 2 === 0 ? "#f8f9fa" : "#FFFFFF";
    ctx.fillRect(40, y, cvs.width - 80, rowH - 6);

    // Borda inferior
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(40, y + rowH - 6, cvs.width - 80, 1);

    const centerY = y + (rowH - 6) / 2;

    ctx.fillStyle = "#1a5276";
    drawClippedText(row[0], colX[0], centerY, colW[0], true);

    ctx.fillStyle = "#222222";
    drawClippedText(row[1] || "", colX[1], centerY, colW[1]);
    drawClippedText(row[2] || "", colX[2], centerY, colW[2]);
    drawClippedText(row[3] || "", colX[3], centerY, colW[3]);
    y += rowH;
  });

  // Rodapé
  ctx.fillStyle = "#e8e8e8";
  ctx.fillRect(0, cvs.height - 70, cvs.width, 70);
  ctx.fillStyle = "#666666";
  ctx.font = "14px 'MyriadPro-Regular', sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("SERPRO / SENATRAN — Documento Digital com Certificação", 40, cvs.height - 35);

  return cvs;
}

// ─── Export para PDF (1 página A4 Retrato 210mm x 297mm: CNH + QR + MRZ) ──────
async function exportToPdf(cnhCanvas: HTMLCanvasElement, props: CNHDocumentProps) {
  const { default: jsPDF } = await import("jspdf");

  // ── PÁGINA ÚNICA: CNH-e Completa (A4 Retrato 210mm x 297mm) ─────────────────
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const imgData1 = cnhCanvas.toDataURL("image/jpeg", 0.98);
  pdf.addImage(imgData1, "JPEG", 0, 0, 210, 297);

  // Salvar
  const nomeFormatado = (props.nome || "DOCUMENTO")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
  pdf.save(`CNH_${nomeFormatado}.pdf`);
}

// ─── Componente Principal ─────────────────────────────────────────────────────
const CNHDocument = forwardRef<CNHDocumentHandle, CNHDocumentProps>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    exportAsBlob: async () => {
      const fullCvs = document.createElement("canvas");
      fullCvs.width = PAGE_W;
      fullCvs.height = PAGE_H;
      await drawCNHToCanvas(fullCvs, props);
      const whiteCvs = document.createElement("canvas");
      whiteCvs.width = PAGE_W;
      whiteCvs.height = PAGE_H;
      const wctx = whiteCvs.getContext("2d")!;
      wctx.fillStyle = "#FFFFFF";
      wctx.fillRect(0, 0, PAGE_W, PAGE_H);
      wctx.drawImage(fullCvs, 0, 0);
      return new Promise<Blob | null>((resolve) => {
        whiteCvs.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
      });
    },
    exportAsPdf: async () => {
      const fullCvs = document.createElement("canvas");
      fullCvs.width = PAGE_W;
      fullCvs.height = PAGE_H;
      await drawCNHToCanvas(fullCvs, props);
      await exportToPdf(fullCvs, props);
    },
    getCanvas: () => canvasRef.current,
    exportCropBlob: async (x, y, w, h) => {
      const fullCvs = document.createElement("canvas");
      fullCvs.width = PAGE_W;
      fullCvs.height = PAGE_H;
      await drawCNHToCanvas(fullCvs, props);
      const crop = document.createElement("canvas");
      crop.width = w; crop.height = h;
      const cctx = crop.getContext("2d")!;
      cctx.fillStyle = "#FFFFFF";
      cctx.fillRect(0, 0, w, h);
      cctx.drawImage(fullCvs, x, y, w, h, 0, 0, w, h);
      return new Promise<Blob | null>((resolve) => {
        crop.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
      });
    },
  }));

  const renderCanvas = async () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    await drawCNHToCanvas(cvs, props);
  };

  const drawCNHToCanvas = async (cvs: HTMLCanvasElement, props: CNHDocumentProps) => {
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    await loadFonts();

    cvs.width = PAGE_W;
    cvs.height = PAGE_H;

    // 1. Fundo Branco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // 2. Template CNH_BASE (com múltiplos fallbacks para nunca sumir)
    try {
      let bg: HTMLImageElement | null = null;
      const sources = [
        "/assets/cnh_base_template_300.png",
        "/assets/cnh_base_template.png",
        "assets/cnh_base_template_300.png",
      ];
      for (const src of sources) {
        try {
          bg = await loadImage(src);
          if (bg && bg.width > 0) break;
        } catch (_) {}
      }

      if (bg) {
        ctx.drawImage(bg, 0, 0, PAGE_W, PAGE_H);
      } else {
        throw new Error("Bg não carregou");
      }
    } catch (_) {
      console.warn("Template CNH não encontrado — desenhando estrutura vetorial de segurança");
      ctx.fillStyle = "#e8ede5";
      ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    }

    ctx.fillStyle = "#000000";
    ctx.textBaseline = "top";

    const txt = (t: string, x: number, y: number, s: number, b?: boolean | number, c?: string, mw?: number) => {
      if (!t) return;
      ctx.save();
      if ('letterSpacing' in ctx) {
        (ctx as any).letterSpacing = "0px";
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const fontName = "'MyriadPro-Regular'";
      ctx.font = `${s}px ${fontName}`;
      ctx.fillStyle = c || "#000000";
      t = String(t).toUpperCase();

      if (mw) {
        let fontSize = s;
        ctx.font = `${fontSize}px ${fontName}`;
        while (ctx.measureText(t).width > mw && fontSize > 10) {
          fontSize -= 1;
          ctx.font = `${fontSize}px ${fontName}`;
        }
      }
      ctx.fillText(t, x, y);
      ctx.restore();
    };

    const getVal = (primaryKey: keyof CNHDocumentProps, ...fallbackKeys: string[]) => {
      const v = props[primaryKey];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
      for (const fk of fallbackKeys) {
        const fv = (props as any)[fk];
        if (fv !== undefined && fv !== null && String(fv).trim() !== "") return String(fv).trim();
      }
      return "";
    };

    const d = fmtDate;

    // Helper de prévia inteligente: garante exibição 100% preenchida preservando os fallbacks padrão
    const p = (val: string | undefined, fallback: string) => {
      if (val && String(val).trim()) return String(val).trim();
      return fallback;
    };

    // Extração robusta com suporte a camelCase e snake_case
    const nomeRaw = getVal("nome", "nome_completo");
    const primHabRaw = getVal("primeiraHabilitacao", "primeira_habilitacao", "primeiraHab");
    const dtNascRaw = getVal("dataNascimento", "data_nascimento", "dataNasc");
    const locNascRaw = getVal("localNascimento", "local_nascimento");
    const ufNascRaw = getVal("ufNascimento", "uf_nascimento");
    const dtEmissRaw = getVal("dataEmissao", "data_emissao", "dataEmiss");
    const validadeRaw = getVal("validade", "validade_cnh", "validade_ate");
    const accRaw = getVal("acc", "acc_cnh");
    const tipoRaw = getVal("tipo", "tipo_cnh");
    const rgRaw = getVal("rg", "numero_rg", "doc_identidade");
    const orgRaw = getVal("orgaoEmissor", "orgao_emissor");
    const ufRgRaw = getVal("ufRG", "uf_rg");
    const cpfRaw = getVal("cpf", "cpf_condutor");
    const regRaw = getVal("registro", "numero_registro", "registro_cnh");
    const catRaw = getVal("categoria", "categoria_cnh", "cat_hab");
    const nacRaw = getVal("nacionalidade", "nacionalidade_condutor");
    const paiRaw = getVal("nomePai", "nome_pai");
    const maeRaw = getVal("nomeMae", "nome_mae");
    const obsRaw = getVal("observacoes", "observacoes_cnh");
    const locEmissRaw = getVal("localEmissao", "local_emissao");
    const ufEmissRaw = getVal("ufEmissao", "uf_emissao");
    const SHIFT_X = 22; // Deslocamento ideal (-0,5% a esquerda para precisao 1:1 perfeita)

    // 1. CAIXA NOME COMPLETO (X=304px + SHIFT_X, Y=463px - Mover 0,1% a esquerda)
    ctx.save();
    ctx.letterSpacing = "1px";
    txt(p(nomeRaw, "RICK MATEUS ARRUDA DE FIGUEIREDO"), 304 + SHIFT_X, 463, 21, 1, "#000000", 600);
    ctx.restore();

    // 2. CAIXA 1ª HABILITAÇÃO (X=969px + SHIFT_X, Y=463px)
    txt(p(d(primHabRaw), "20/05/2012"), 969 + SHIFT_X, 463, 21, 1, "#000000", 130);

    // 3. CAIXA 3: DATA, LOCAL E UF DE NASCIMENTO (X=599px + SHIFT_X, Y=523px)
    const dtNasc = p(d(dtNascRaw), "05/03/2003");
    const locNasc = p(locNascRaw, "BARUERI");
    const ufNasc = normalizeUFDoc(p(ufNascRaw, "SP"));
    txt(`${dtNasc}, ${locNasc}, ${ufNasc}`, 599 + SHIFT_X, 523, 20, 1, "#000000", 335);

    // 4. CAIXA 4a: DATA EMISSÃO (X=599px + SHIFT_X, Y=583px)
    txt(p(d(dtEmissRaw), "14/09/2021"), 599 + SHIFT_X, 583, 20, 1, "#000000", 180);

    // 5. CAIXA 4b: VALIDADE (X=786px + SHIFT_X, Y=583px, Vermelho - Mover 0,1% a direita)
    txt(p(d(validadeRaw), "15/09/2026"), 786 + SHIFT_X, 583, 20, 1, "#c0392b", 160);

    // 6. CAIXA ACC / TIPO CNH (X=1062px + SHIFT_X, Y=572px)
    const tipoLetra = tipoRaw === "Permissão" ? "P" : "D";
    txt(p(accRaw, tipoLetra), 1062 + SHIFT_X, 572, 46.5, 1, "#000000", 60);

    // 7. CAIXA 4c: DOC IDENTIDADE / ÓRGÃO EMISSOR / UF (X=599px + SHIFT_X, Y=644px)
    const rgFmt = p(rgRaw, "26216797");
    const orgFmt = p(orgRaw, "SSP");
    const ufRgFmt = normalizeUFDoc(p(ufRgRaw, "SP"));
    txt(`${rgFmt} ${orgFmt}/${ufRgFmt}`, 599 + SHIFT_X, 644, 20, 1, "#000000", 335);

    // 8. CAIXA 4d: CPF (X=599px + SHIFT_X, Y=704px)
    const cpfFmt = cpfRaw ? formatarCPF(cpfRaw) : "590.974.098-96";
    txt(p(cpfFmt, "590.974.098-96"), 599 + SHIFT_X, 704, 20, 1, "#000000", 215);

    // 9. CAIXA 5: Nº REGISTRO (X=805px + SHIFT_X, Y=704px, Vermelho)
    txt(p(regRaw, "37362896284"), 805 + SHIFT_X, 704, 20, 1, "#c0392b", 175);

    // 10. CAIXA 9: CAT HAB (X=1007px + SHIFT_X, Y=704px, Vermelho - Mover 0,2% dir, tam=21.5px)
    const catFmt = p(catRaw, "AB");
    txt(catFmt, 1007 + SHIFT_X, 704, 21.5, 1, "#c0392b", 80);

    // 11. CAIXA NACIONALIDADE (X=599px + SHIFT_X, Y=764px)
    txt(p(nacRaw, "BRASILEIRO(A)"), 599 + SHIFT_X, 764, 20, 1, "#000000", 405);

    // 12. CAIXA FILIAÇÃO (X=599px + SHIFT_X, Y=832px e Y=904px)
    txt(p(paiRaw, "MARCOS PAULO ARCO IRIS DE FIGUEIREDO"), 599 + SHIFT_X, 832, 19, 1, "#000000", 415);
    txt(p(maeRaw, "DÉBORA DE ARRUDA CALDAS"), 599 + SHIFT_X, 904, 19, 1, "#000000", 415);

    // 13. CAIXA OBSERVAÇÕES / EAR (X=299px + SHIFT_X, Y=1334px - Mover 0,1% a esquerda)
    const obsTexto = p(obsRaw, "EAR");
    const linhasObs = obsTexto.split("\n");
    const obsY = 1334; 
    const obsX = 299 + SHIFT_X;
    linhasObs.forEach((linha, index) => {
      txt(linha, obsX, obsY + (index * 24), 19.9, false, "#000000", 740);
    });

    // 14. CAIXA LOCAL EMISSÃO + UF (X=295px + SHIFT_X, Y=1579px - Mover 0,2% a esquerda)
    const locEmiss = p(locEmissRaw, "SÃO PAULO");
    const ufEmiss = p(ufEmissRaw, "SP");
    txt(`${locEmiss}, ${ufEmiss}`, 295 + SHIFT_X, 1579, 20, 1, "#000000", 500);

    // 15. NOME DO ESTADO POR EXTENSO (Destaque Painel 2 - Desceu 2 linhas Y=1668px, +10% tamanho -> 35px)
    ctx.save();
    ctx.textAlign = "center";
    const ufDigitada = (ufEmiss || "SP").trim().toUpperCase();
    const nomeEstadoCompleto = NOMES_ESTADOS[ufDigitada] || "SÃO PAULO";
    ctx.font = "43.9px 'MyriadPro-Regular'";
    ctx.fillStyle = "#000000";
    ctx.fillText(nomeEstadoCompleto, 600 + SHIFT_X, 1668);
    ctx.restore();

    // ── Assinaturas digitais: Ass. Digital 1 (X=965px + SHIFT_X, +0,2% dir) e Ass. Digital 2 (X=915px + SHIFT_X, +0,3% dir) ──
    const rawAss2 = props.assDigital2 || "";
    let displayAss2 = "SP54171992";
    if (rawAss2) {
      const digits = rawAss2.replace(/\D/g, "").slice(-8);
      const textPart = rawAss2.replace(/\d/g, "");
      const ufSigla = normalizeUFDoc(textPart || props.ufEmissao || "SP");
      displayAss2 = `${ufSigla}${digits || "54171992"}`;
    } else {
      const ufSigla = normalizeUFDoc(props.ufEmissao || "SP");
      displayAss2 = `${ufSigla}54171992`;
    }

    ctx.save();
    ctx.font = "18.2px 'MyriadPro-Regular'";
    ctx.fillStyle = "#222222";
    ctx.textAlign = "center";
    ctx.fillText(props.assDigital1 || "46418356416", 965 + SHIFT_X, 1559);
    ctx.textAlign = "left";
    ctx.fillText(displayAss2, 915 + SHIFT_X, 1584);
    ctx.restore();

    // ── Textos laterais verticais (Nº Espelho - Mover 0,2% esq -> X=208px, descer 0,1% -> Y=952px e Y=1692px) ───────────────────────────
    ctx.save();
    ctx.translate(208 + SHIFT_X, 952);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "40px 'MyriadPro-Regular'";
    ctx.fillStyle = "#000000";
    ctx.fillText(props.espelho || "5053403062", 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(208 + SHIFT_X, 1692);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "40px 'MyriadPro-Regular'";
    ctx.fillStyle = "#000000";
    ctx.fillText(props.espelho || "5053403062", 0, 0);
    ctx.restore();

    // ═══════════════════════════════════════════════════════════════════
    // MRZ (OCR-B 35.175px @300DPI - Mover 2% a esquerda -> X=285px)
    // ═══════════════════════════════════════════════════════════════════
    const mrz = gerarMRZ(props);
    ctx.save();
    let mrzFontSize = 35.175;
    const maxMrzWidth = 1800; // Limite estrito de segurança das margens
    ctx.font = `bold ${mrzFontSize}px 'OCR-B', monospace`;
    mrz.forEach(linha => {
      while (ctx.measureText(linha).width > maxMrzWidth && mrzFontSize > 15) {
        mrzFontSize -= 0.5;
        ctx.font = `bold ${mrzFontSize}px 'OCR-B', monospace`;
      }
    });
    ctx.fillStyle = "#353535";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    mrz.forEach((l, i) => ctx.fillText(l, 285 + SHIFT_X, 2220 + (i * 65)));
    ctx.restore();

    // ═══════════════════════════════════════════════════════════════════
    // QR CODE DINÂMICO E REAL (Mover 0,1% a esquerda -> X=1350px)
    // ═══════════════════════════════════════════════════════════════════
    let codigoQrFinal = props.codigoQR && props.codigoQR !== "PREVIEW" && !props.codigoQR.includes(".") ? props.codigoQR : "";
    if (!codigoQrFinal || codigoQrFinal.includes(".")) {
      codigoQrFinal = "31c64778-606e-436e-9f9d-287574f23abe";
    }
    
    const cnhValidationBase = "https://validacao-online-vio.digital";
    const qrUrl = `${cnhValidationBase}/consulta/?id=${encodeURIComponent(codigoQrFinal)}`;

    try {
      const qrWidth = 860;
      const qrX = 1350 + SHIFT_X;
      const qrY = 370;

      // Fundo passepartout limpo
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(qrX, qrY, qrWidth, qrWidth);

      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: qrWidth,
        version: 12,
        margin: 4,
        errorCorrectionLevel: "H",
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      const qrImg = await loadImage(qrDataUrl);
      ctx.drawImage(qrImg, qrX, qrY, qrWidth, qrWidth);
    } catch (e) {
      console.warn("Erro ao gerar QR Code:", e);
    }

    // ═══════════════════════════════════════════════════════════════════
    // TABELA DE CATEGORIAS (Microajustes C, D, D1)
    // ═══════════════════════════════════════════════════════════════════
    const catPositions: Record<string, { x: number; y: number }> = {
      A:   { x: 436 + SHIFT_X, y: 1099 },
      A1:  { x: 431 + SHIFT_X, y: 1136 },
      B:   { x: 433 + SHIFT_X, y: 1169 },
      B1:  { x: 431 + SHIFT_X, y: 1212 },
      C:   { x: 434 + SHIFT_X, y: 1238 }, // Descer C 0,2% -> Y=1238px
      C1:  { x: 431 + SHIFT_X, y: 1286 },
      D:   { x: 871 + SHIFT_X, y: 1099 }, // Mover D 0,2% dir -> 871px
      D1:  { x: 869 + SHIFT_X, y: 1136 }, // Mover D1 0,1% dir -> 869px
      BE:  { x: 861 + SHIFT_X, y: 1174 },
      CE:  { x: 861 + SHIFT_X, y: 1212 },
      C1E: { x: 861 + SHIFT_X, y: 1249 },
      DE:  { x: 861 + SHIFT_X, y: 1286 },
      D1E: { x: 861 + SHIFT_X, y: 1324 },
    };

    const rawCat = (props.categoria || "AB").toUpperCase().trim();
    const dtValidadeCat = p(d(validadeRaw), "15/09/2026");

    const includesA = rawCat.includes("A") && !rawCat.includes("A1");
    const includesB = rawCat.includes("B") && !rawCat.includes("B1") && !rawCat.includes("BE");
    const includesC = rawCat.includes("C") && !rawCat.includes("C1") && !rawCat.includes("CE") && !rawCat.includes("C1E");
    const includesD = rawCat.includes("D") && !rawCat.includes("D1") && !rawCat.includes("DE") && !rawCat.includes("D1E");
    const includesE = rawCat.includes("E") && !rawCat.includes("BE") && !rawCat.includes("CE") && !rawCat.includes("DE");

    const isA = includesA;
    const isA1 = rawCat.includes("A1");
    const isB = includesB || includesC || includesD || includesE;
    const isB1 = rawCat.includes("B1");
    const isC = includesC || includesD || includesE;
    const isC1 = rawCat.includes("C1");
    const isD = includesD || includesE;
    const isD1 = rawCat.includes("D1");
    const isBE = rawCat.includes("BE");
    const isCE = rawCat.includes("CE");
    const isC1E = rawCat.includes("C1E");
    const isDE = rawCat.includes("DE");
    const isD1E = rawCat.includes("D1E");

    const enabledCats: Record<string, boolean> = {
      A: isA,
      A1: isA1,
      B: isB,
      B1: isB1,
      C: isC,
      C1: isC1,
      D: isD,
      D1: isD1,
      BE: isBE,
      CE: isCE,
      C1E: isC1E,
      DE: isDE,
      D1E: isD1E,
    };

    Object.entries(catPositions).forEach(([catKey, pos]) => {
      if (enabledCats[catKey]) {
        const sizeCat = (catKey === "A" || catKey === "B" || catKey === "D" || catKey === "CE" || catKey === "C") ? 14.7 : 14;
        txt(dtValidadeCat, pos.x, pos.y, sizeCat, 1, "#000000", 110);
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // FOTO DO CONDUTOR (Subir 0,2% -> Y=569px, Mover 0,1% esq -> X=307px)
    // ═══════════════════════════════════════════════════════════════════
    if (props.fotoUrl) {
      try {
        const fotoImg = await loadImage(props.fotoUrl);
        const scale = (props.fotoScale ?? 1.0) * 0.999;
        const offsetX = props.fotoOffsetX ?? 0;
        const offsetY = props.fotoOffsetY ?? 0;
        const baseBw = 258, baseBh = 316;
        const bw = Math.round(baseBw * scale);
        const bh = Math.round(baseBh * scale);
        const bx = 307 + SHIFT_X + offsetX;
        const by = 569 + offsetY;

        ctx.save();
        ctx.beginPath();
        ctx.rect(307 + SHIFT_X, 569, baseBw, baseBh);
        ctx.clip();

        const imgRatio = fotoImg.width / fotoImg.height;
        const boxRatio = baseBw / baseBh;
        let drawW: number, drawH: number, drawX: number, drawY: number;
        if (imgRatio > boxRatio) {
          drawH = baseBh * scale;
          drawW = drawH * imgRatio;
          drawX = bx + (baseBw - drawW) / 2;
          drawY = by + (baseBh - drawH) / 2;
        } else {
          drawW = baseBw * scale;
          drawH = drawW / imgRatio;
          drawX = bx + (baseBw - drawW) / 2;
          drawY = by;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(fotoImg, drawX, drawY, drawW, drawH);
        ctx.restore();
      } catch (e) { console.warn("Erro foto 3x4:", e); }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ASSINATURA DO CONDUTOR (Subir 0,2% -> Y=893px)
    // ═══════════════════════════════════════════════════════════════════
    if (props.assinaturaUrl) {
      try {
        const assImg = await loadImage(props.assinaturaUrl);
        const scale = props.assScale ?? 1.0;
        const offsetX = props.assOffsetX ?? 0;
        const offsetY = props.assOffsetY ?? 0;
        const baseBw = 236, baseBh = 68;
        const bw = Math.round(baseBw * scale);
        const bh = Math.round(baseBh * scale);
        const bx = 311 + SHIFT_X + Math.round((baseBw - bw) / 2) + offsetX;
        const by = 893 + Math.round((baseBh - bh) / 2) + offsetY;

        const isPng = props.assinaturaUrl.startsWith("data:image/png");
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = assImg.width;
        tempCanvas.height = assImg.height;
        const tctx = tempCanvas.getContext("2d")!;
        tctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tctx.drawImage(assImg, 0, 0);

        const imgData = tctx.getImageData(0, 0, assImg.width, assImg.height);
        const dataPixels = imgData.data;
        for (let i = 0; i < dataPixels.length; i += 4) {
          const r = dataPixels[i];
          const g = dataPixels[i + 1];
          const b = dataPixels[i + 2];
          const a = dataPixels[i + 3];

          if (a < 50 || (r > 150 && g > 150 && b > 150)) {
            dataPixels[i + 3] = 0;
          } else {
            dataPixels[i] = 0;
            dataPixels[i + 1] = 0;
            dataPixels[i + 2] = 0;
            dataPixels[i + 3] = a > 50 ? a : 255;
          }
        }
        tctx.putImageData(imgData, 0, 0);

        const drawW = bw;
        const drawH = bh;
        const drawX = bx;
        const drawY = by;

        ctx.save();
        ctx.beginPath();
        ctx.rect(311 + SHIFT_X, 893, baseBw, baseBh);
        ctx.clip();
        ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);
        ctx.drawImage(tempCanvas, drawX + 1, drawY, drawW, drawH);
        ctx.drawImage(tempCanvas, drawX, drawY + 1, drawW, drawH);
        ctx.restore();
      } catch (e) { console.warn("Erro assinatura PNG:", e); }
    }

  };

  useEffect(() => {
    renderCanvas();
  }, [props]);

  const targetW = props.previewWidth || 595;
  const previewScale = targetW / PAGE_W;

  return (
    <div style={{ width: targetW, overflow: "hidden", margin: "0 auto", display: "flex", justifyContent: "center" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: targetW,
          height: Math.round(PAGE_H * previewScale),
          display: "block",
          margin: "0 auto",
        }}
      />
    </div>
  );
});

CNHDocument.displayName = "CNHDocument";
export default CNHDocument;
