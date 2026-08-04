/**
 * CNHDocument — Geração visual da CNH Digital A4 (PDF SENATRAN/SERPRO)
 *
 * Layout 100% fiel ao PDF oficial "CNH-e (COMPLETO).pdf"
 * Dimensões extraídas via pdfplumber + pypdfium2:
 *   Página A4: 595.20 × 841.92pt = 2480 × 3508px @300DPI = 794 × 1123px @96DPI
 *
 * Estrutura:
 *   1. Header gov.br (fundo #444040, altura 42.83pt = 57px@96)
 *   2. Coluna Esquerda (0→272pt): 3 imagens CNH empilhadas (frente, verso+categorias, legenda+MRZ)
 *   3. Coluna Direita (320pt→595pt): QR-CODE + texto SERPRO jurídico
 *
 * Fontes originais PDF:
 *   - OpenSans-Bold 9.54pt  → cabeçalho "REPÚBLICA FEDERATIVA DO BRASIL"
 *   - NotoSans-Regular 5.56pt → cabeçalho subtítulo MINISTÉRIO / SENATRAN
 *   - LiberationSans-Bold 8.25pt → label "QR-CODE"
 *   - LiberationSans 7.5pt → texto jurídico SERPRO
 *
 * QR Code: 219.91 × 219.91pt = 293px@96 | Estilo: módulos pretos com quiet zone branca
 * QR URL: https://validacao-online-vio.digital/?cpf={CPF}
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

// ─── Mapa de estados ────────────────────────────────────────────────────────
const NOMES_ESTADOS: Record<string, string> = {
  AC: "ACRE", AL: "ALAGOAS", AP: "AMAPÁ", AM: "AMAZONAS",
  BA: "BAHIA", CE: "CEARÁ", DF: "DISTRITO FEDERAL", ES: "ESPÍRITO SANTO",
  GO: "GOIÁS", MA: "MARANHÃO", MT: "MATO GROSSO", MS: "MATO GROSSO DO SUL",
  MG: "MINAS GERAIS", PA: "PARÁ", PB: "PARAÍBA", PR: "PARANÁ",
  PE: "PERNAMBUCO", PI: "PIAUÍ", RJ: "RIO DE JANEIRO", RN: "RIO GRANDE DO NORTE",
  RS: "RIO GRANDE DO SUL", RO: "RONDÔNIA", RR: "RORAIMA", SC: "SANTA CATARINA",
  SP: "SÃO PAULO", SE: "SERGIPE", TO: "TOCANTINS",
};

// ─── Utilitários ──────────────────────────────────────────────────────────────
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
  const e = (p.espelho || "000000000").replace(/\D/g, "").padEnd(9, "<").slice(0, 9);
  const partes = (p.nome || "").trim().split(" ");
  const sobrenome = partes.slice(1).join("<") || "DESCONHECIDO";
  const nome1 = partes[0] || "DESCONHECIDO";
  const nomeFormatado = pad(`${sobrenome}<<${nome1}`, 30).substring(0, 30);
  return [
    `I<BRA${r}<${e}<<<<`,
    `${fmtData(p.dataNascimento)}0${p.sexo ? p.sexo.charAt(0).toUpperCase() : "M"}${fmtData(p.validade)}5BRA<<<<<<<<<<<<`,
    nomeFormatado,
  ];
}

// ─── Fontes customizadas ───────────────────────────────────────────────────
let fontsLoaded = false;
async function loadFonts() {
  if (fontsLoaded) return;
  try {
    const ocrFont = new FontFace("OCR-B", "url(/assets/ocrbstd.otf)");
    const f = await ocrFont.load();
    document.fonts.add(f);
    fontsLoaded = true;
  } catch (e) {
    console.warn("Fontes customizadas não carregaram:", e);
  }
}

// ─── Dimensões do documento (extraídas via pdfplumber @300DPI) ───────────────
// Página A4: 595.20pt × 841.92pt = 2480px × 3508px @300DPI
const DPI = 300;
const PT_PX = DPI / 72; // 4.1667

function pt(v: number) { return Math.round(v * PT_PX); }

// Constantes extraídas do PDF original
const PAGE_W = pt(595.20);   // 2480px
const PAGE_H = pt(841.92);   // 3508px

// Header gov.br: y=0→42.83pt, fundo #444040
const HDR_H    = pt(42.83);  // 178px

// Colunas
const COL_L_X0 = pt(30.20);  // 126px — início imagens CNH
const COL_L_X1 = pt(272.08); // 1134px — fim imagens CNH
const COL_R_X0 = pt(320.03); // 1334px — início coluna direita
const COL_R_X1 = pt(595.20); // 2480px

// Header: brasão: x=25.85→47.20pt, y=14.95→37.63pt
const BRASAO_X0 = pt(25.85); // 107px
const BRASAO_Y0 = pt(14.95); // 62px
const BRASAO_W  = pt(21.35); // 89px
const BRASAO_H  = pt(22.67); // 94px

// Header: texto início x=53.11pt, y=18.45pt
const HDR_TXT_X = pt(53.11); // 221px

// QR code box: 320.03→540.94pt, 82.21→303.12pt (preto, 219.91pt²)
const QR_BOX_X0 = pt(320.03); // 1334px
const QR_BOX_Y0 = pt(82.21);  // 343px
const QR_BOX_X1 = pt(540.94); // 2254px
const QR_BOX_Y1 = pt(303.12); // 1263px
const QR_BOX_W  = QR_BOX_X1 - QR_BOX_X0; // 920px
const QR_BOX_H  = QR_BOX_Y1 - QR_BOX_Y0; // 920px

// QR Code imagem dentro da caixa (com margem de ~4pt / 16px)
const QR_MARGIN = pt(4);
const QR_IMG_X  = QR_BOX_X0 + QR_MARGIN;
const QR_IMG_Y  = QR_BOX_Y0 + QR_MARGIN;
const QR_IMG_W  = QR_BOX_W - QR_MARGIN * 2;
const QR_IMG_H  = QR_BOX_H - QR_MARGIN * 2;

// "QR-CODE" label: y=68.27pt, x=318.29pt
const QRLABEL_X = pt(318.29); // 1326px
const QRLABEL_Y = pt(68.27);  // 284px

// Texto jurídico (SERPRO): y=316.29pt, x=320.65pt
const SERPRO_TXT_X = pt(320.65); // 1336px
const SERPRO_TXT_Y = pt(316.29); // 1318px

// Imagens CNH (3 painéis: frente, verso+categorias, legenda+MRZ)
// Cada imagem: x=30.20→272.08pt, altura=177.77pt = 241.88×177.77pt
const CNH_IMG_W = pt(241.88); // 1008px
const CNH_IMG_H = pt(177.77); // 741px

// Painel 1 (Frente CNH): y=60.14→237.91pt
const P1_Y = pt(60.14);   // 251px
// Painel 2 (Verso/Categorias): y=242.81→420.58pt
const P2_Y = pt(242.81);  // 1012px
// Painel 3 (Legenda/MRZ): y=425.48→603.25pt
const P3_Y = pt(425.48);  // 1773px

// Linha divisória horizontal: y=52.41pt (entre header e corpo)
const LINE_Y = pt(52.41);  // 218px

// Linha divisória vertical: x=297.61pt (entre colunas)
const LINE_COL_X = pt(297.61); // 1240px

// ─── Fontes (em pixels @300DPI) ─────────────────────────────────────────────
// OpenSans-Bold 9.54pt → 39.75px@300
const F_HEADER_TITLE = `bold ${pt(9.54)}px 'Open Sans', 'Helvetica Neue', Arial, sans-serif`;
// NotoSans-Regular 5.56pt → 23.17px@300
const F_HEADER_SUB   = `${pt(5.56)}px 'Noto Sans', 'Helvetica Neue', Arial, sans-serif`;
// LiberationSans-Bold 8.25pt → 34.38px@300
const F_QR_LABEL     = `bold ${pt(8.25)}px 'Liberation Sans', Arial, sans-serif`;
// LiberationSans 7.5pt → 31.25px@300
const F_SERPRO_TXT   = `${pt(7.5)}px 'Liberation Sans', Arial, sans-serif`;
// OCR-B 8pt → 33px@300 (MRZ)
const F_OCR          = `${pt(8)}px 'OCR-B', 'Courier New', monospace`;

// ─── Ícones de veículos (emoji/símbolo simplificado) ────────────────────────
const CAT_ICONS: Record<string, string> = {
  ACC: "🛵", A: "🏍", A1: "🛵", B: "🚗", B1: "🚐",
  C: "🚛", C1: "🚚", D: "🚌", D1: "🚎", BE: "🚗🚗",
  CE: "🚛🚛", C1E: "🚚🚚", DE: "🚌🚌", D1E: "🚎🚎",
};

// ─── Função de exportação PDF usando jsPDF em modo A4 ────────────────────────
async function exportToPdf(canvas: HTMLCanvasElement, nome: string) {
  const { default: jsPDF } = await import("jspdf");
  const wMm = 210;
  const hMm = 297;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const whiteCvs = document.createElement("canvas");
  whiteCvs.width = canvas.width;
  whiteCvs.height = canvas.height;
  const wctx = whiteCvs.getContext("2d")!;
  wctx.fillStyle = "#FFFFFF";
  wctx.fillRect(0, 0, canvas.width, canvas.height);
  wctx.drawImage(canvas, 0, 0);
  const imgData = whiteCvs.toDataURL("image/jpeg", 0.95);
  pdf.addImage(imgData, "JPEG", 0, 0, wMm, hMm);
  const nomeFormatado = (nome || "DOCUMENTO")
    .toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
  pdf.save(`CNH_${nomeFormatado}.pdf`);
}

// ─── Componente Principal ─────────────────────────────────────────────────────
const CNHDocument = forwardRef<CNHDocumentHandle, CNHDocumentProps>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    exportAsBlob: async () => {
      await renderCanvas();
      const cvs = canvasRef.current;
      if (!cvs) return null;
      const whiteCvs = document.createElement("canvas");
      whiteCvs.width = cvs.width;
      whiteCvs.height = cvs.height;
      const wctx = whiteCvs.getContext("2d")!;
      wctx.fillStyle = "#FFFFFF";
      wctx.fillRect(0, 0, cvs.width, cvs.height);
      wctx.drawImage(cvs, 0, 0);
      return new Promise<Blob | null>((resolve) => {
        whiteCvs.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
      });
    },
    exportAsPdf: async () => {
      await renderCanvas();
      const cvs = canvasRef.current;
      if (!cvs) return;
      await exportToPdf(cvs, props.nome);
    },
    getCanvas: () => canvasRef.current,
    exportCropBlob: async (x, y, w, h) => {
      await renderCanvas();
      const cvs = canvasRef.current;
      if (!cvs) return null;
      const crop = document.createElement("canvas");
      crop.width = w; crop.height = h;
      const cctx = crop.getContext("2d")!;
      cctx.fillStyle = "#FFFFFF";
      cctx.fillRect(0, 0, w, h);
      cctx.drawImage(cvs, x, y, w, h, 0, 0, w, h);
      return new Promise<Blob | null>((resolve) => {
        crop.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
      });
    },
  }));

  const renderCanvas = async () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    await loadFonts();

    cvs.width  = PAGE_W;
    cvs.height = PAGE_H;

    // Fundo branco da página inteira
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // ═══════════════════════════════════════════════════════════════
    // 1. HEADER GOV.BR (fundo #444040)
    // ═══════════════════════════════════════════════════════════════
    ctx.fillStyle = "#444040";
    ctx.fillRect(0, 0, PAGE_W, HDR_H);

    // Brasão da República Federal
    try {
      const brasao = await loadImage("/assets/brasao_republica_federal.jpg");
      ctx.drawImage(brasao, BRASAO_X0, BRASAO_Y0, BRASAO_W, BRASAO_H);
    } catch (_) {
      // fallback: círculo dourado
      ctx.fillStyle = "#C9A84C";
      ctx.beginPath();
      ctx.arc(BRASAO_X0 + BRASAO_W/2, BRASAO_Y0 + BRASAO_H/2, BRASAO_W/2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Texto principal do header (branco)
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "top";

    // "REPÚBLICA FEDERATIVA DO BRASIL" — OpenSans-Bold 9.54pt = 39.75px@300
    ctx.font = F_HEADER_TITLE;
    ctx.fillText("REPÚBLICA FEDERATIVA DO BRASIL", HDR_TXT_X, pt(18.45));

    // Subtítulo — NotoSans-Regular 5.56pt = 23.17px@300
    ctx.font = F_HEADER_SUB;
    ctx.fillText("MINISTÉRIO DOS TRANSPORTES  SECRETARIA NACIONAL DE", HDR_TXT_X, pt(27.33));
    ctx.fillText("TRÂNSITO - SENATRAN", HDR_TXT_X, pt(32.89));

    // Logo gov.br (direita) — texto estilizado
    ctx.font = `bold ${pt(9)}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText("gov.br", PAGE_W - pt(15), pt(18));
    ctx.textAlign = "left";

    // ═══════════════════════════════════════════════════════════════
    // 2. LINHA HORIZONTAL DIVISÓRIA (y=52.41pt)
    // ═══════════════════════════════════════════════════════════════
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = pt(0.449);
    ctx.beginPath();
    ctx.moveTo(pt(30.19), LINE_Y);
    ctx.lineTo(pt(568.83), LINE_Y);
    ctx.stroke();

    // ═══════════════════════════════════════════════════════════════
    // 3. COLUNA ESQUERDA — 3 imagens CNH empilhadas
    // ═══════════════════════════════════════════════════════════════
    const cnh_imgs = [
      "/assets/PARTE SUPERIOR CNH, FOTO 3X4 E ASSINATURA, DADOS.jpg",
      "/assets/PARTE INFERIOR CNH.jpg",
      "/assets/CODIGO MRZ.jpg",
    ];

    // Tentar carregar as imagens CNH base
    for (let i = 0; i < 3; i++) {
      const yPos = [P1_Y, P2_Y, P3_Y][i];
      try {
        const img = await loadImage(cnh_imgs[i]);
        ctx.drawImage(img, COL_L_X0, yPos, CNH_IMG_W, CNH_IMG_H);
      } catch (_) {
        // Desenhar placeholder
        ctx.fillStyle = "#e8f5e9";
        ctx.fillRect(COL_L_X0, yPos, CNH_IMG_W, CNH_IMG_H);
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 2;
        ctx.strokeRect(COL_L_X0, yPos, CNH_IMG_W, CNH_IMG_H);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // TEXTO VERTICAL ESQUERDO — Nº Espelho rotacionado -90°
    // ═══════════════════════════════════════════════════════════════
    // "VÁLIDA EM TODO O TERRITÓRIO NACIONAL" (vertical, lado esquerdo)
    ctx.save();
    ctx.translate(pt(20), pt(350));
    ctx.rotate(-Math.PI / 2);
    ctx.font = `bold ${pt(4.5)}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "middle";
    ctx.fillText("VÁLIDA EM TODO O TERRITÓRIO NACIONAL", 0, 0);
    ctx.restore();

    // Nº Espelho vertical (painel superior)
    ctx.save();
    ctx.translate(pt(15), pt(220));
    ctx.rotate(-Math.PI / 2);
    ctx.font = `bold ${pt(14)}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "middle";
    ctx.fillText(props.espelho || "0000000000", 0, 0);
    ctx.restore();

    // Nº Espelho vertical (painel inferior)
    ctx.save();
    ctx.translate(pt(15), pt(510));
    ctx.rotate(-Math.PI / 2);
    ctx.font = `bold ${pt(14)}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "middle";
    ctx.fillText(props.espelho || "0000000000", 0, 0);
    ctx.restore();

    // ═══════════════════════════════════════════════════════════════
    // 4. COLUNA DIREITA — QR-CODE label
    // ═══════════════════════════════════════════════════════════════
    ctx.fillStyle = "#000000";
    ctx.font = F_QR_LABEL;
    ctx.textBaseline = "top";
    ctx.fillText("QR-CODE", QRLABEL_X, QRLABEL_Y);

    // Caixa preta QR Code (retângulo negro)
    ctx.fillStyle = "#000000";
    ctx.fillRect(QR_BOX_X0, QR_BOX_Y0, QR_BOX_W, QR_BOX_H);

    // QR Code gerado
    const qrUrl = `https://validacao-online-vio.digital/?cpf=${(props.cpf || "").replace(/\D/g, "")}`;
    try {
      const isBlurred = props.blurred || props.codigoQR === "PREVIEW" || !props.codigoQR;
      const targetUrl = props.codigoQR && props.codigoQR !== "PREVIEW"
        ? `https://validacao-online-vio.digital/?cpf=${(props.cpf || "").replace(/\D/g, "")}`
        : "https://validacao-online-vio.digital/";

      const qrDataUrl = await QRCode.toDataURL(targetUrl, {
        width: QR_IMG_W,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#FFFFFF" },
      });

      const qrImg = await loadImage(qrDataUrl);
      if (isBlurred) {
        ctx.save();
        ctx.filter = "blur(8px)";
        ctx.drawImage(qrImg, QR_IMG_X, QR_IMG_Y, QR_IMG_W, QR_IMG_H);
        ctx.restore();
      } else {
        ctx.drawImage(qrImg, QR_IMG_X, QR_IMG_Y, QR_IMG_W, QR_IMG_H);
      }
    } catch (e) {
      console.warn("Erro ao gerar QR:", e);
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. TEXTO JURÍDICO SERPRO
    // ═══════════════════════════════════════════════════════════════
    ctx.fillStyle = "#000000";
    ctx.font = F_SERPRO_TXT;
    ctx.textBaseline = "top";

    const serpro_lines = [
      "Documento assinado com certificado digital em conformidade com",
      "a Medida Provisória nº 2200-2/2001. Sua validade poderá ser",
      "confirmada por meio do programa Assinador Serpro.",
      "",
      "As orientações para instalar o Assinador Serpro e realizar a",
      "validação do documento digital estão disponíveis em:",
      "https://www.serpro.gov.br/assinador-digital.",
    ];
    const lineH = pt(9.5); // espaçamento entre linhas
    serpro_lines.forEach((line, i) => {
      ctx.fillText(line, SERPRO_TXT_X, SERPRO_TXT_Y + i * lineH);
    });

    // Logo SERPRO/SENATRAN
    const serpro_y = SERPRO_TXT_Y + (serpro_lines.length + 2) * lineH;
    ctx.font = `bold ${pt(8)}px Arial, sans-serif`;
    ctx.fillStyle = "#005CA9"; // azul SERPRO
    ctx.fillText("SERPRO", SERPRO_TXT_X + pt(100), serpro_y);
    ctx.fillStyle = "#000000";
    ctx.font = `${pt(8)}px Arial, sans-serif`;
    ctx.fillText("/SENATRAN", SERPRO_TXT_X + pt(130), serpro_y);

    // ═══════════════════════════════════════════════════════════════
    // 6. SOBREPOSIÇÃO DOS DADOS DO CONDUTOR (sobre imagem CNH frente)
    // ═══════════════════════════════════════════════════════════════
    // As imagens CNH são a base visual; agora sobrepor os dados reais do formulário
    // Coordenadas relativas ao painel 1 (P1_Y = pt(60.14) = 251px)
    // Baseadas no layout do PDF original mapeado sobre a imagem 963x680px → CNH_IMG_W x CNH_IMG_H

    // Escala de mapeamento: imagem original 963px → CNH_IMG_W(1008px)
    // (imagem é exibida em 1008x741px, original é 963x680px)
    const scaleX = CNH_IMG_W / 963;
    const scaleY = CNH_IMG_H / 680;

    const txtOver = (text: string, imgX: number, imgY: number, size: number, color = "#000", maxW?: number) => {
      if (!text) return;
      ctx.save();
      const fontSize = pt(size);
      ctx.font = `${fontSize}px 'Helvetica Neue', Arial, sans-serif`;
      ctx.fillStyle = color;
      ctx.textBaseline = "top";
      const canvasX = COL_L_X0 + imgX * scaleX;
      const canvasY = P1_Y + imgY * scaleY;
      let t = text.toUpperCase();
      if (maxW) {
        const maxWpx = maxW * scaleX;
        let fs = fontSize;
        while (ctx.measureText(t).width > maxWpx && fs > pt(2.5)) {
          fs -= 1;
          ctx.font = `${fs}px 'Helvetica Neue', Arial, sans-serif`;
        }
      }
      ctx.fillText(t, canvasX, canvasY);
      ctx.restore();
    };

    // NOME COMPLETO — campo "2 e 1 NOME E SOBRENOME"
    // Na imagem: x≈210, y≈138 (sobre o retângulo do campo)
    txtOver(props.nome, 210, 133, 4.2, "#000", 460);

    // 1ª HABILITAÇÃO — canto direito superior
    txtOver(fmtDate(props.primeiraHabilitacao), 780, 133, 4.2, "#000", 130);

    // DATA NASCIMENTO, LOCAL, UF
    txtOver(`${fmtDate(props.dataNascimento)}, ${props.localNascimento}, ${props.ufNascimento}`, 270, 185, 4.0, "#000", 540);

    // DATA EMISSÃO
    txtOver(fmtDate(props.dataEmissao), 240, 225, 4.0, "#000", 130);

    // VALIDADE (vermelho)
    txtOver(fmtDate(props.validade), 440, 225, 4.0, "#c0392b", 130);

    // ACC / TIPO (box direito)
    const tipoLetra = props.tipo === "Permissão" ? "P" : "D";
    txtOver(tipoLetra, 790, 210, 9, "#000", 70);

    // DOC IDENTIDADE / ORG EMISSOR / UF
    txtOver(`${props.rg} ${props.orgaoEmissor}/${props.ufRG}`, 200, 258, 4.0, "#000", 520);

    // CPF
    txtOver(formatarCPF(props.cpf), 200, 295, 4.0, "#000", 200);

    // Nº REGISTRO (vermelho)
    txtOver(props.registro, 490, 295, 4.0, "#c0392b", 200);

    // CAT HAB (vermelho)
    txtOver(props.categoria, 760, 295, 4.0, "#c0392b", 130);

    // NACIONALIDADE
    txtOver(props.nacionalidade || "BRASILEIRO(A)", 200, 332, 4.0, "#000", 500);

    // FILIAÇÃO — Pai
    txtOver(props.nomePai, 200, 367, 3.8, "#000", 560);
    // FILIAÇÃO — Mãe
    txtOver(props.nomeMae, 200, 395, 3.8, "#000", 560);

    // ═══════════════════════════════════════════════════════════════
    // 7. FOTO DO CONDUTOR (sobre painel 1)
    // ═══════════════════════════════════════════════════════════════
    // Área da foto na imagem: x≈56→160, y≈153→415 (img coords 963×680)
    if (props.fotoUrl) {
      try {
        const fotoImg = await loadImage(props.fotoUrl);
        const fotoX = COL_L_X0 + 56 * scaleX;
        const fotoY = P1_Y + 153 * scaleY;
        const fotoW = 104 * scaleX * (props.fotoScale ?? 1);
        const fotoH = 262 * scaleY * (props.fotoScale ?? 1);
        const offsetX = props.fotoOffsetX ?? 0;
        const offsetY = props.fotoOffsetY ?? 0;
        ctx.save();
        ctx.beginPath();
        ctx.rect(fotoX, fotoY, 104 * scaleX, 262 * scaleY);
        ctx.clip();
        const imgRatio = fotoImg.width / fotoImg.height;
        const boxRatio = fotoW / fotoH;
        let dw, dh, dx, dy;
        if (imgRatio > boxRatio) {
          dh = fotoH; dw = fotoH * imgRatio;
          dx = fotoX + offsetX - (dw - fotoW) / 2;
          dy = fotoY + offsetY;
        } else {
          dw = fotoW; dh = fotoW / imgRatio;
          dx = fotoX + offsetX;
          dy = fotoY + offsetY - (dh - fotoH) / 2;
        }
        ctx.drawImage(fotoImg, dx, dy, dw, dh);
        ctx.restore();
      } catch (e) { console.warn("Erro foto:", e); }
    }

    // ═══════════════════════════════════════════════════════════════
    // 8. ASSINATURA (sobre painel 1)
    // ═══════════════════════════════════════════════════════════════
    if (props.assinaturaUrl) {
      try {
        const assImg = await loadImage(props.assinaturaUrl);
        const assX = COL_L_X0 + 56 * scaleX;
        const assY = P1_Y + 430 * scaleY;
        const assW = 150 * scaleX * (props.assScale ?? 1);
        const assH = 60 * scaleY * (props.assScale ?? 1);
        const offsetX = props.assOffsetX ?? 0;
        const offsetY = props.assOffsetY ?? 0;
        ctx.save();
        ctx.beginPath();
        ctx.rect(assX, assY, 150 * scaleX, 60 * scaleY);
        ctx.clip();
        const tempCvs = document.createElement("canvas");
        tempCvs.width = assImg.width; tempCvs.height = assImg.height;
        const tctx = tempCvs.getContext("2d")!;
        tctx.fillStyle = "#FFFFFF";
        tctx.fillRect(0, 0, tempCvs.width, tempCvs.height);
        tctx.drawImage(assImg, 0, 0);
        const ratio = Math.min(assW / assImg.width, assH / assImg.height);
        const dw = assImg.width * ratio, dh = assImg.height * ratio;
        const dx = assX + offsetX + (assW - dw) / 2;
        const dy = assY + offsetY + (assH - dh) / 2;
        ctx.filter = "contrast(5) brightness(0.3) grayscale(1)";
        ctx.drawImage(tempCvs, dx, dy, dw, dh);
        ctx.restore();
      } catch (e) { console.warn("Erro assinatura:", e); }
    }

    // ═══════════════════════════════════════════════════════════════
    // 9. TABELA DE CATEGORIAS (sobre painel 2, P2_Y)
    // ═══════════════════════════════════════════════════════════════
    // Painel 2 coords: x=30.20→272.08pt, y=242.81→420.58pt
    // Tabela de categorias: na imagem original, tabela ocupa x≈130→900, y≈40→205
    const scaleX2 = CNH_IMG_W / 963;
    const scaleY2 = CNH_IMG_H / 680;

    const CAT_ROWS_LEFT = ["ACC","A","A1","B","B1","C","C1"];
    const CAT_ROWS_RIGHT = ["D","D1","BE","CE","C1E","DE","D1E"];

    const userCatStr = (props.categoria || "").toUpperCase();
    const hasCategory = (cat: string) => {
      // Herança de categorias
      if (userCatStr.includes(cat)) return true;
      if (cat === "B" && (userCatStr.includes("C") || userCatStr.includes("D") || userCatStr.includes("E"))) return true;
      if (cat === "C" && (userCatStr.includes("D") || userCatStr.includes("E"))) return true;
      if (cat === "D" && userCatStr.includes("E")) return true;
      return false;
    };

    // Coordenadas da tabela na imagem 963x680: col header x≈130
    const tblX = COL_L_X0; // início do painel 2
    const tblY = P2_Y;

    // A tabela na imagem base cobre toda a imagem, apenas sobrepor datas nas células
    const catCells: Record<string, {imgX: number, imgY: number}> = {
      ACC: { imgX: 175, imgY: 52 },
      A:   { imgX: 175, imgY: 85 },
      A1:  { imgX: 175, imgY: 118 },
      B:   { imgX: 175, imgY: 151 },
      B1:  { imgX: 175, imgY: 184 },
      C:   { imgX: 175, imgY: 217 },
      C1:  { imgX: 175, imgY: 250 },
      D:   { imgX: 618, imgY: 52 },
      D1:  { imgX: 618, imgY: 85 },
      BE:  { imgX: 618, imgY: 118 },
      CE:  { imgX: 618, imgY: 151 },
      C1E: { imgX: 618, imgY: 184 },
      DE:  { imgX: 618, imgY: 217 },
      D1E: { imgX: 618, imgY: 250 },
    };

    for (const [cat, coords] of Object.entries(catCells)) {
      if (hasCategory(cat)) {
        const cx = tblX + coords.imgX * scaleX2;
        const cy = tblY + coords.imgY * scaleY2;
        ctx.save();
        ctx.font = `${pt(3.8)}px 'Helvetica Neue', Arial, sans-serif`;
        ctx.fillStyle = "#000000";
        ctx.textBaseline = "top";
        ctx.fillText(fmtDate(props.validade), cx, cy);
        ctx.restore();
      }
    }

    // Observações (sobre painel 2)
    const obs = (props.observacoes || "").split("\n");
    obs.forEach((linha, i) => {
      const obsX = tblX + 130 * scaleX2;
      const obsY = tblY + 310 * scaleY2 + i * pt(5);
      ctx.save();
      ctx.font = `${pt(3.8)}px 'Helvetica Neue', Arial, sans-serif`;
      ctx.fillStyle = "#000000";
      ctx.textBaseline = "top";
      ctx.fillText(linha.toUpperCase(), obsX, obsY);
      ctx.restore();
    });

    // LOCAL EMISSÃO (sobre painel 2)
    ctx.save();
    ctx.font = `${pt(4)}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = "#000000";
    ctx.textBaseline = "top";
    ctx.fillText(
      `${(props.localEmissao || "").toUpperCase()}, ${props.ufEmissao}`,
      tblX + 130 * scaleX2,
      tblY + 500 * scaleY2
    );
    ctx.restore();

    // NOME DO ESTADO (DEPT ESTADUAL DE TRÂNSITO)
    ctx.save();
    ctx.font = `bold ${pt(8)}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const nomEstado = NOMES_ESTADOS[(props.ufEmissao || "").trim().toUpperCase()] || "";
    ctx.fillText(nomEstado, COL_L_X0 + CNH_IMG_W / 2, P2_Y + CNH_IMG_H - pt(30));
    ctx.textAlign = "left";
    ctx.restore();

    // ASSINATURAS DIGITAIS
    ctx.save();
    ctx.font = `${pt(3.5)}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.fillText((props.assDigital1 || "").toUpperCase(), COL_L_X0 + 800 * scaleX2, P2_Y + 444 * scaleY2);
    ctx.fillText((props.assDigital2 || "").toUpperCase(), COL_L_X0 + 800 * scaleX2, P2_Y + 475 * scaleY2);
    ctx.textAlign = "left";
    ctx.restore();

    // ═══════════════════════════════════════════════════════════════
    // 10. MRZ (sobre painel 3, P3_Y)
    // ═══════════════════════════════════════════════════════════════
    const mrz = gerarMRZ(props);
    ctx.font = F_OCR;
    ctx.fillStyle = "#353535";
    ctx.textBaseline = "top";
    const mrzX = COL_L_X0 + 30 * (CNH_IMG_W / 963);
    const mrzLineH = pt(9);
    mrz.forEach((linha, i) => {
      ctx.fillText(linha, mrzX, P3_Y + pt(80) + i * mrzLineH);
    });
  };

  useEffect(() => {
    renderCanvas();
  }, [props]);

  const targetW = props.previewWidth || 595;
  const previewScale = targetW / PAGE_W;

  return (
    <div style={{ width: targetW, overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: targetW,
          height: Math.round(PAGE_H * previewScale),
          display: "block",
        }}
      />
    </div>
  );
});

CNHDocument.displayName = "CNHDocument";
export default CNHDocument;
