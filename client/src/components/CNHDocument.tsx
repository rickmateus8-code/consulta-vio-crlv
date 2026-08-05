/**
 * CNHDocument — Geração visual da CNH Digital A4 (PDF SENATRAN/SERPRO)
 *
 * Layout 1:1 com CNH-e (COMPLETO).pdf:
 *  - Página 1: CNH frente (canvas @300DPI) | Painel QR-CODE + SERPRO/SENATRAN
 *  - Página 2: Legenda multilíngue (PT / EN / ES) dos campos
 *
 * QR Code aponta para: https://validacao-online-vio.digital/?cpf={CPF}
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

// ─── Gerador do Painel QR (lado direito no PDF) ───────────────────────────────
async function gerarPainelQR(qrDataUrl: string, cpfFormatado: string): Promise<HTMLCanvasElement> {
  // Painel branco 960 x 2600 px
  const W = 960;
  const H = 2600;
  const cvs = document.createElement("canvas");
  cvs.width = W;
  cvs.height = H;
  const ctx = cvs.getContext("2d")!;

  // Fundo branco
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);

  // Borda esquerda sutil
  ctx.fillStyle = "#dde3da";
  ctx.fillRect(0, 0, 2, H);

  // Label "QR-CODE"
  ctx.fillStyle = "#333333";
  ctx.font = "bold 48px Arial, sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("QR-CODE", 60, 60);

  // Linha separadora
  ctx.fillStyle = "#cccccc";
  ctx.fillRect(60, 120, W - 120, 2);

  // QR Code image (620x620)
  try {
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, 60, 140, 620, 620);
  } catch (_) {
    // fallback: retângulo placeholder
    ctx.fillStyle = "#eeeeee";
    ctx.fillRect(60, 140, 620, 620);
    ctx.fillStyle = "#999";
    ctx.font = "28px Arial";
    ctx.textAlign = "center";
    ctx.fillText("QR CODE", 370, 450);
    ctx.textAlign = "left";
  }

  // Texto de conformidade MP 2200-2/2001
  ctx.fillStyle = "#444444";
  ctx.font = "24px Arial, sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const linhasTexto = [
    "Documento assinado com certificado digital em",
    "conformidade com a Medida Provisória nº 2200-2/2001.",
    "Sua validade poderá ser confirmada pelo programa",
    "Assinador Serpro.",
    "",
    "As orientações para instalar o Assinador Serpro e",
    "realizar a validação do documento digital estão",
    "disponíveis em:",
    "https://www.serpro.gov.br/assinador-digital",
  ];

  let textY = 800;
  for (const linha of linhasTexto) {
    ctx.fillText(linha, 60, textY);
    textY += linha === "" ? 12 : 34;
  }

  // Rodapé SERPRO / SENATRAN
  ctx.fillStyle = "#555555";
  ctx.font = "bold 36px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("SERPRO / SENATRAN", W - 60, H - 100);

  ctx.textAlign = "left";
  return cvs;
}

// ─── Gerador da Página 2 (Legenda Multilíngue) ───────────────────────────────
function gerarPaginaLegenda(): HTMLCanvasElement {
  const W = PAGE_W;
  const H = PAGE_H;
  const cvs = document.createElement("canvas");
  cvs.width = W;
  cvs.height = H;
  const ctx = cvs.getContext("2d")!;

  // Fundo verde claro (idêntico ao template)
  ctx.fillStyle = "#e8ede5";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#333333";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = "30px Arial, sans-serif";

  const legendaLinhas = [
    "2 e 1. Nome e Sobrenome / Name and Surname / Nombre y Apellidos – Primeira Habilitação / First Driver License / Primera Licencia de Conducir – 3. Data e",
    "Local de Nascimento / Date and Place of Birth DD/MM/YYYY / Fecha y Lugar de Nacimiento – 4a. Data de Emissão / Issuing Date DD/MM/YYYY / Fecha de Emisión – 4b.",
    "Data de Validade / Expiration Date DD/MM/YYYY / Valido Hasta – ACC – 4c. Documento Identidade - Órgão emissor / Identity Document - Issuing Authority /",
    "Documento de Identificación - Autoridad Expedidora – 4d. CPF – 5. Número de registro da CNH / Driver License Number / Número de Permiso de Conducir – 9.",
    "Categoria de Veículos da Carteira de Habilitação / Driver license Class / Categoria de Permisos de Conducir – Nacionalidade / Nationality / Nacionalidad –",
    "Filiação / Filiation / Filiación – 12. Observações / Observations / Observaciones - Local / Place / Lugar",
  ];

  let y = 300;
  for (const linha of legendaLinhas) {
    ctx.fillText(linha, 200, y);
    y += 50;
  }

  return cvs;
}

// ─── Export para PDF (2 páginas: CNH+QR | Legenda) ──────────────────────────
async function exportToPdf(cnhCanvas: HTMLCanvasElement, props: CNHDocumentProps) {
  const { default: jsPDF } = await import("jspdf");

  const cleanCpf = (props.cpf || "").replace(/\D/g, "");
  const qrUrl = cleanCpf
    ? `https://validacao-online-vio.digital/?cpf=${cleanCpf}`
    : "https://validacao-online-vio.digital/";

  // Gerar QR Code Data URL
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 620,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  // ── PÁGINA 1: Layout A4 Retrato com CNH (esq) + Painel QR (dir) ──────────
  // Usar A4 paisagem para acomodar ambos side by side
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  // A4 paisagem: 297mm x 210mm

  // Canvas combinado: CNH (2481px) + Painel QR (960px) = 3441px total
  // Escalar para caber em 297mm x 210mm
  const combinadoW = PAGE_W + 960;
  const combinadoH = Math.max(PAGE_H, 2600);
  const combinado = document.createElement("canvas");
  combinado.width = combinadoW;
  combinado.height = combinadoH;
  const ctxComb = combinado.getContext("2d")!;

  // Fundo branco
  ctxComb.fillStyle = "#FFFFFF";
  ctxComb.fillRect(0, 0, combinadoW, combinadoH);

  // CNH à esquerda
  ctxComb.drawImage(cnhCanvas, 0, 0, PAGE_W, PAGE_H);

  // Painel QR à direita
  const painelQR = await gerarPainelQR(qrDataUrl, formatarCPF(cleanCpf));
  ctxComb.drawImage(painelQR, PAGE_W, 0, 960, 2600);

  const imgData1 = combinado.toDataURL("image/jpeg", 0.94);
  pdf.addImage(imgData1, "JPEG", 0, 0, 297, 210);

  // ── PÁGINA 2: Legenda Multilíngue ────────────────────────────────────────
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

    // 2. Template CNH_BASE.pdf (@300DPI)
    try {
      const bg = await loadImage("/assets/cnh_base_template.png");
      ctx.drawImage(bg, 0, 0, PAGE_W, PAGE_H);
    } catch (_) {
      console.warn("Template cnh_base_template.png não encontrado — usando fundo verde claro");
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
    // DADOS DO CONDUTOR (coordenadas calibradas @300DPI sobre o template)
    // ═══════════════════════════════════════════════════════════════════

    // Nome Completo
    txt(props.nome, 245, 455, 26, 1, "#000000", 620);

    // 1ª Habilitação
    txt(d(props.primeiraHabilitacao), 915, 455, 22, 1, "#000000", 180);

    // Data Nascimento, Local, UF
    txt(`${d(props.dataNascimento)}, ${props.localNascimento}, ${props.ufNascimento}`, 425, 512, 22, 1, "#000000", 450);

    // Data Emissão
    txt(d(props.dataEmissao), 425, 568, 22, 1, "#000000", 180);

    // Validade (vermelho)
    txt(d(props.validade), 680, 568, 22, 1, "#c0392b", 180);

    // Tipo CNH (D = Definitiva, P = Permissão)
    const tipoLetra = props.tipo === "Permissão" ? "P" : "D";
    txt(tipoLetra, 1045, 568, 24, 1, "#000000", 80);

    // RG + Órgão Emissor / UF
    txt(`${props.rg} ${props.orgaoEmissor}/${props.ufRG}`, 425, 624, 22, 1, "#000000", 450);

    // CPF
    txt(formatarCPF(props.cpf), 425, 680, 22, 1, "#000000", 250);

    // Nº Registro (vermelho)
    txt(props.registro, 680, 680, 22, 1, "#c0392b", 210);

    // Categoria (vermelho)
    txt(props.categoria, 920, 680, 22, 1, "#c0392b", 120);

    // Nacionalidade
    txt(props.nacionalidade || "BRASILEIRO(A)", 425, 736, 22, 1, "#000000", 500);

    // Filiação — Pai
    txt(props.nomePai, 425, 792, 22, 1, "#000000", 550);
    // Filiação — Mãe
    txt(props.nomeMae, 425, 827, 22, 1, "#000000", 550);

    // Observações (EAR multi-linha)
    const obsTexto = String(props.observacoes || "");
    const linhasObs = obsTexto.split("\n");
    const obsY = 1340;
    linhasObs.forEach((linha, index) => {
      txt(linha, 320, obsY + (index * 22), 20, false, "#000000", 680);
    });

    // Local Emissão + UF
    txt(`${props.localEmissao}, ${props.ufEmissao}`, 318, 1569, 22, 1, "#000000", 450);

    // Nome do Estado por extenso em destaque (Painel 2)
    ctx.save();
    ctx.textAlign = "center";
    const ufDigitada = (props.ufEmissao || "").trim().toUpperCase();
    const nomeEstadoCompleto = NOMES_ESTADOS[ufDigitada] || "SÃO PAULO";
    ctx.font = "bold 44px 'Ultra', Arial, sans-serif";
    ctx.fillStyle = "#000000";
    ctx.fillText(nomeEstadoCompleto, 670, 1660);
    ctx.textAlign = "left";
    ctx.restore();

    // ── Bloco "ASSINADO DIGITALMENTE / DEPARTAMENTO ESTADUAL DE TRÂNSITO" ──
    ctx.save();
    ctx.textAlign = "right";
    ctx.fillStyle = "#333333";
    ctx.font = "18px 'Ultra', Arial, sans-serif";
    ctx.fillText("ASSINADO DIGITALMENTE", 1100, 1490);
    ctx.fillStyle = "#555555";
    ctx.font = "16px 'Ultra', Arial, sans-serif";
    ctx.fillText("DEPARTAMENTO ESTADUAL DE TRÂNSITO", 1100, 1513);
    // Linha horizontal acima
    ctx.fillStyle = "#888888";
    ctx.fillRect(830, 1485, 270, 1);
    ctx.textAlign = "left";
    ctx.restore();

    // ── Assinaturas digitais (números de série) ──────────────────────────
    ctx.save();
    ctx.font = "23px 'Ultra', Arial, sans-serif";
    ctx.fillStyle = "#333333";
    ctx.textAlign = "center";
    ctx.fillText(props.assDigital1 || "46418156416", 945, 1545);
    ctx.fillText(props.assDigital2 || "SP032377809", 945, 1575);
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
      // Checar se a categoria está habilitada
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
        const by = 825 + Math.round((baseBh - bh) / 2) + offsetY;

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
        ctx.rect(135, 825, baseBw, baseBh);
        ctx.clip();
        ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);
        ctx.restore();
      } catch (e) { console.warn("Erro assinatura PNG:", e); }
    }

    // ═══════════════════════════════════════════════════════════════════
    // MRZ (OCR-B 28px @300DPI) — 3 linhas
    // ═══════════════════════════════════════════════════════════════════
    const mrz = gerarMRZ(props);
    ctx.font = "28px 'OCR-B', monospace";
    ctx.fillStyle = "#353535";
    ctx.textBaseline = "top";
    mrz.forEach((l, i) => ctx.fillText(l, 335, 2225 + (i * 33)));

    // ═══════════════════════════════════════════════════════════════════
    // QR CODE NO PREVIEW (preview somente — na exportação vai ao painel lateral)
    // Posição: x=1441, y=430 — canva de 700x700
    // ═══════════════════════════════════════════════════════════════════
    const cleanCpf = (props.cpf || "").replace(/\D/g, "");
    const qrUrl = cleanCpf
      ? `https://validacao-online-vio.digital/?cpf=${cleanCpf}`
      : "https://validacao-online-vio.digital/";

    try {
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 700,
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      const qrImg = await loadImage(qrDataUrl);

      if (props.blurred || props.codigoQR === "PREVIEW") {
        ctx.save();
        ctx.filter = "blur(12px)";
        ctx.drawImage(qrImg, 1441, 430, 700, 700);
        ctx.restore();
      } else {
        ctx.drawImage(qrImg, 1441, 430, 700, 700);
      }

      // Label "QR-CODE" acima do QR no canvas
      ctx.font = "bold 28px Arial, sans-serif";
      ctx.fillStyle = "#222222";
      ctx.textBaseline = "top";
      ctx.fillText("QR-CODE", 1641, 395);

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
