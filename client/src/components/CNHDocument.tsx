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

// ─── Carregamento de Fontes ──────────────────────────────────────────────────
let fontsLoaded = false;
async function loadFonts() {
  if (fontsLoaded) return;
  try {
    const ocrFont = new FontFace("OCR-B", "url(/assets/ocrbstd.otf)");
    const ultraFont = new FontFace("Ultra", "url(/assets/AltraW00-SmallCaps.woff2)");
    const [f1, f2] = await Promise.all([ocrFont.load(), ultraFont.load()]);
    document.fonts.add(f1);
    document.fonts.add(f2);
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
  ctx.font = "bold 22px Arial, sans-serif";
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

  // Header da tabela
  ctx.fillStyle = "#1a5276";
  ctx.fillRect(40, y, cvs.width - 80, 40);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("Nº", colX[0], y + 20);
  ctx.fillText("Português (PT)", colX[1], y + 20);
  ctx.fillText("English (EN)", colX[2], y + 20);
  ctx.fillText("Español (ES)", colX[3], y + 20);
  y += 45;

  const drawClippedText = (text: string, x: number, centerY: number, maxW: number, isBold = false) => {
    ctx.font = `${isBold ? "bold " : ""}13px Arial, sans-serif`;
    let fontSize = 13;
    while (ctx.measureText(text).width > maxW && fontSize > 8.5) {
      fontSize -= 0.5;
      ctx.font = `${isBold ? "bold " : ""}${fontSize}px Arial, sans-serif`;
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
  ctx.font = "14px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("SERPRO / SENATRAN — Documento Digital com Certificação", 40, cvs.height - 35);

  return cvs;
}

// ─── Export para PDF (2 páginas A4 Retrato: CNH+QR | Legenda Multilíngue) ─────
async function exportToPdf(cnhCanvas: HTMLCanvasElement, props: CNHDocumentProps) {
  const { default: jsPDF } = await import("jspdf");

  // ── PÁGINA 1: CNH-e Completa (A4 Retrato 210mm x 297mm) ─────────────────
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const imgData1 = cnhCanvas.toDataURL("image/jpeg", 0.95);
  pdf.addImage(imgData1, "JPEG", 0, 0, 210, 297);

  // ── PÁGINA 2: Legenda Multilíngue (A4 Retrato 210mm x 297mm) ────────────
  pdf.addPage("a4", "portrait");
  const pag2Canvas = gerarPaginaLegenda();
  const imgData2 = pag2Canvas.toDataURL("image/jpeg", 0.92);
  pdf.addImage(imgData2, "JPEG", 0, 0, 210, 297);

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
      await exportToPdf(cvs, props);
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

    cvs.width = PAGE_W;
    cvs.height = PAGE_H;

    // 1. Fundo Branco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // 2. Template CNH_BASE (com múltiplos fallbacks para nunca sumir)
    try {
      let bg: HTMLImageElement | null = null;
      const sources = [
        "/assets/cnh_base_template.png",
        "/assets/cnh_base_template_300.png",
        "assets/cnh_base_template.png",
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

    const txt = (t: string, x: number, y: number, s: number, _b?: boolean | number, c?: string, mw?: number) => {
      if (!t) return;
      ctx.font = `${s}px 'Ultra', Arial, sans-serif`;
      ctx.fillStyle = c || "#000000";
      t = String(t).toUpperCase();

      if (mw) {
        let fontSize = s;
        ctx.font = `${fontSize}px 'Ultra', Arial, sans-serif`;
        while (ctx.measureText(t).width > mw && fontSize > 10) {
          fontSize -= 1;
          ctx.font = `${fontSize}px 'Ultra', Arial, sans-serif`;
        }
      }
      ctx.fillText(t, x, y);
    };

    const d = fmtDate;

    // ═══════════════════════════════════════════════════════════════════
    // DADOS DO CONDUTOR (coordenadas calibradas @300DPI sobre o template CNH_BASE.PNG)
    // ═══════════════════════════════════════════════════════════════════

    // Nome Completo
    txt(props.nome, 245, 420, 26, 1, "#000000", 620);

    // 1ª Habilitação
    txt(d(props.primeiraHabilitacao), 915, 420, 22, 1, "#000000", 180);

    // Data Nascimento, Local, UF
    txt(`${d(props.dataNascimento)}, ${props.localNascimento}, ${props.ufNascimento}`, 425, 489, 22, 1, "#000000", 450);

    // Data Emissão
    txt(d(props.dataEmissao), 425, 540, 22, 1, "#000000", 180);

    // Validade (vermelho)
    txt(d(props.validade), 680, 540, 22, 1, "#c0392b", 180);

    // Tipo CNH (D = Definitiva, P = Permissão)
    const tipoLetra = props.tipo === "Permissão" ? "P" : "D";
    txt(tipoLetra, 1045, 549, 24, 1, "#000000", 80);

    // RG + Órgão Emissor / UF
    txt(`${props.rg} ${props.orgaoEmissor}/${props.ufRG}`, 425, 600, 22, 1, "#000000", 450);

    // CPF
    txt(formatarCPF(props.cpf), 425, 655, 22, 1, "#000000", 250);

    // Nº Registro (vermelho)
    txt(props.registro, 680, 655, 22, 1, "#c0392b", 210);

    // Categoria (vermelho)
    txt(props.categoria, 920, 660, 22, 1, "#c0392b", 120);

    // Nacionalidade
    txt(props.nacionalidade || "BRASILEIRO(A)", 425, 715, 22, 1, "#000000", 500);

    // Filiação — Pai
    txt(props.nomePai, 425, 765, 21, 1, "#000000", 550);
    // Filiação — Mãe
    txt(props.nomeMae, 425, 815, 21, 1, "#000000", 550);

    // Observações (EAR multi-linha)
    const obsTexto = String(props.observacoes || "");
    const linhasObs = obsTexto.split("\n");
    const obsY = 1250;
    linhasObs.forEach((linha, index) => {
      txt(linha, 300, obsY + (index * 24), 20, false, "#000000", 780);
    });

    // Local Emissão + UF
    txt(`${props.localEmissao}, ${props.ufEmissao}`, 320, 1538, 22, 1, "#000000", 490);

    // Nome do Estado por extenso em destaque (Painel 2)
    ctx.save();
    ctx.textAlign = "center";
    const ufDigitada = (props.ufEmissao || "").trim().toUpperCase();
    const nomeEstadoCompleto = NOMES_ESTADOS[ufDigitada] || "SÃO PAULO";
    ctx.font = "bold 38px 'Ultra', Arial, sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText(nomeEstadoCompleto, 600, 1630);
    ctx.textAlign = "left";
    ctx.restore();

    // ── Bloco "ASSINADO DIGITALMENTE / DEPARTAMENTO ESTADUAL DE TRÂNSITO" ──
    ctx.save();
    ctx.textAlign = "right";
    ctx.fillStyle = "#333333";
    ctx.font = "18px 'Ultra', Arial, sans-serif";
    ctx.fillText("ASSINADO DIGITALMENTE", 1100, 1425);
    ctx.fillStyle = "#555555";
    ctx.font = "16px 'Ultra', Arial, sans-serif";
    ctx.fillText("DEPARTAMENTO ESTADUAL DE TRÂNSITO", 1100, 1445);
    // Linha horizontal acima
    ctx.fillStyle = "#888888";
    ctx.fillRect(830, 1420, 270, 1);
    ctx.textAlign = "left";
    ctx.restore();

    // ── Assinaturas digitais (números de série) ──────────────────────────
    ctx.save();
    ctx.font = "22px 'Ultra', Arial, sans-serif";
    ctx.fillStyle = "#333333";
    ctx.textAlign = "center";
    ctx.fillText(props.assDigital1 || "46418356416", 945, 1475);
    ctx.fillText(props.assDigital2 || "SP032337809", 945, 1500);
    ctx.restore();

    // ── Textos laterais verticais (Nº Espelho) ───────────────────────────
    ctx.save();
    ctx.translate(213, 930);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "40px 'Ultra', Arial, sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText(props.espelho || "5053403062", 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(213, 1670);
    ctx.rotate(-Math.PI / 2);
    ctx.font = "40px 'Ultra', Arial, sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText(props.espelho || "5053403062", 0, 0);
    ctx.restore();

    // ═══════════════════════════════════════════════════════════════════
    // TABELA EXPANDIDA DE CATEGORIAS (14 tipos com datas de validade)
    // Esquerda: ACC, A, A1, B, B1, C, C1
    // Direita:  D, D1, BE, CE, C1E, DE, D1E
    // ═══════════════════════════════════════════════════════════════════
    const catsEsq: Record<string, { x: number; y: number }> = {
      ACC: { x: 385, y: 900 },
      A:   { x: 530, y: 1010 },
      A1:  { x: 530, y: 1048 },
      B:   { x: 530, y: 1086 },
      B1:  { x: 530, y: 1124 },
      C:   { x: 530, y: 1158 },
      C1:  { x: 530, y: 1196 },
    };
    const catsDir: Record<string, { x: number; y: number }> = {
      D:   { x: 952, y: 1010 },
      D1:  { x: 952, y: 1048 },
      BE:  { x: 952, y: 1086 },
      CE:  { x: 952, y: 1124 },
      C1E: { x: 952, y: 1158 },
      DE:  { x: 952, y: 1196 },
      D1E: { x: 952, y: 1234 },
    };
    const allCats = { ...catsEsq, ...catsDir };

    // Expandir categorias conforme hierarquia oficial
    let userCat = (props.categoria || "").toUpperCase();
    if (userCat.includes("D1E")) userCat += "DCED1CBEB1A1DEDE";
    else if (userCat.includes("DE")) userCat += "DCED1CBEB1A1";
    else if (userCat.includes("CE")) userCat += "DCB";
    else if (userCat.includes("C1E")) userCat += "C1B";
    else if (userCat.includes("BE")) userCat += "B";
    else if (userCat.includes("E") && !userCat.includes("BE")) userCat += "DCB";
    else if (userCat.includes("D")) userCat += "CB";
    else if (userCat.includes("C")) userCat += "B";

    Object.entries(allCats).forEach(([k, pos]) => {
      const habilitada = userCat === k ||
        userCat.includes(k) ||
        (k === "B" && userCat.includes("B")) ||
        (k === "C" && (userCat.includes("C") || userCat.includes("E")));

      if (habilitada) {
        txt(d(props.validade), pos.x, pos.y, 14, 1, "#000000", 130);
      }
    });

    // ═══════════════════════════════════════════════════════════════════
    // FOTO DO CONDUTOR (proporção 3x4 perfeita, clip exato)
    // ═══════════════════════════════════════════════════════════════════
    if (props.fotoUrl) {
      try {
        const fotoImg = await loadImage(props.fotoUrl);
        const scale = props.fotoScale ?? 1.0;
        const offsetX = props.fotoOffsetX ?? 0;
        const offsetY = props.fotoOffsetY ?? 0;
        const baseBw = 250, baseBh = 335;
        const bw = Math.round(baseBw * scale);
        const bh = Math.round(baseBh * scale);
        const bx = 135 + Math.round((baseBw - bw) / 2) + offsetX;
        const by = 485 + Math.round((baseBh - bh) / 2) + offsetY;

        ctx.save();
        ctx.beginPath();
        ctx.rect(135, 485, baseBw, baseBh);
        ctx.clip();

        const imgRatio = fotoImg.width / fotoImg.height;
        const boxRatio = bw / bh;
        let drawW: number, drawH: number, drawX: number, drawY: number;
        if (imgRatio > boxRatio) {
          drawH = bh; drawW = bh * imgRatio;
          drawX = bx - (drawW - bw) / 2; drawY = by;
        } else {
          drawW = bw; drawH = bw / imgRatio;
          drawX = bx; drawY = by - (drawH - bh) / 2;
        }
        ctx.drawImage(fotoImg, drawX, drawY, drawW, drawH);
        ctx.restore();
      } catch (e) { console.warn("Erro foto 3x4:", e); }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ASSINATURA DO CONDUTOR (PNG transparente)
    // ═══════════════════════════════════════════════════════════════════
    if (props.assinaturaUrl) {
      try {
        const assImg = await loadImage(props.assinaturaUrl);
        const scale = props.assScale ?? 1.0;
        const offsetX = props.assOffsetX ?? 0;
        const offsetY = props.assOffsetY ?? 0;
        const baseBw = 250, baseBh = 60;
        const bw = Math.round(baseBw * scale);
        const bh = Math.round(baseBh * scale);
        const bx = 135 + Math.round((baseBw - bw) / 2) + offsetX;
        const by = 845 + Math.round((baseBh - bh) / 2) + offsetY;

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
          if (r > 180 && g > 180 && b > 180) {
            dataPixels[i + 3] = 0;
          } else {
            dataPixels[i] = 10;
            dataPixels[i + 1] = 10;
            dataPixels[i + 2] = 10;
          }
        }
        tctx.putImageData(imgData, 0, 0);

        const ratio = Math.min(bw / assImg.width, bh / assImg.height);
        const drawW = assImg.width * ratio;
        const drawH = assImg.height * ratio;
        const drawX = bx + (bw - drawW) / 2;
        const drawY = by + (bh - drawH) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(135, 815, baseBw, baseBh);
        ctx.clip();
        ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);
        ctx.restore();
      } catch (e) { console.warn("Erro assinatura PNG:", e); }
    }

    // ═══════════════════════════════════════════════════════════════════
    // MRZ (OCR-B 26px @300DPI) — 3 linhas calibradas na área inferior
    // ═══════════════════════════════════════════════════════════════════
    const mrz = gerarMRZ(props);
    ctx.font = "26px 'OCR-B', monospace";
    ctx.fillStyle = "#353535";
    ctx.textBaseline = "top";
    mrz.forEach((l, i) => ctx.fillText(l, 317, 2360 + (i * 55)));

    // ═══════════════════════════════════════════════════════════════════
    // QR CODE SERPRO (desenhado dentro da moldura oficial da CNH_BASE.PNG)
    // Posição calibrada 1:1: x=1416, y=425 — tamanho 752x752 px
    // URL: https://validacao-online-vio.digital/?id={UUID_DO_DOCUMENTO}
    // ═══════════════════════════════════════════════════════════════════
    const codigoQrFinal = props.codigoQR && props.codigoQR !== "PREVIEW" ? props.codigoQR : "";
    const qrUrl = codigoQrFinal
      ? `https://validacao-online-vio.digital/?id=${codigoQrFinal}`
      : "https://validacao-online-vio.digital/";

    try {
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 752,
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      const qrImg = await loadImage(qrDataUrl);

      if (props.blurred || !codigoQrFinal) {
        ctx.save();
        ctx.filter = "blur(12px)";
        ctx.drawImage(qrImg, 1416, 425, 752, 752);
        ctx.restore();
      } else {
        ctx.drawImage(qrImg, 1416, 425, 752, 752);
      }
    } catch (e) {
      console.warn("Erro ao gerar QR Code:", e);
    }
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
