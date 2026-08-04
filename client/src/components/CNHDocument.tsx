/**
 * CNHDocument — Geração visual da CNH Digital A4 (PDF SENATRAN/SERPRO)
 *
 * Utiliza /assets/cnh_base_template.png (CNH_BASE.pdf renderizado @300DPI em 2481x3508px)
 * como background oficial 1:1, sobrepondo os dados do formulário nas coordenadas exatas.
 *
 * QR Code direcionado para: https://validacao-online-vio.digital/?cpf={CPF}
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

// Canvas A4 dimensões @300DPI (2481 x 3508 px)
const PAGE_W = 2481;
const PAGE_H = 3508;

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
      console.warn("Template cnh_base_template.png não encontrado");
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

    // ═══════════════════════════════════════════════════════════════
    // SOBREPOSIÇÃO DOS DADOS DO CONDUTOR (Coordenadas calibradas @300DPI)
    // ═══════════════════════════════════════════════════════════════

    // Nome Completo
    txt(props.nome, 308, 450, 26, 1, "#000000", 620);

    // 1ª Habilitação
    txt(d(props.primeiraHabilitacao), 958, 450, 22, 1, "#000000", 180);

    // Data Nascimento, Local, UF
    txt(`${d(props.dataNascimento)}, ${props.localNascimento}, ${props.ufNascimento}`, 308, 570, 22, 1, "#000000", 450);

    // Data Emissão
    txt(d(props.dataEmissao), 308, 630, 22, 1, "#000000", 180);

    // Validade (vermelho)
    txt(d(props.validade), 775, 570, 22, 1, "#c0392b", 180);

    // Tipo CNH (D = Definitiva, P = Permissão)
    const tipoLetra = props.tipo === "Permissão" ? "P" : "D";
    txt(tipoLetra, 1055, 555, 55, 1, "#000000", 80);

    // RG + Órgão Emissor / UF
    txt(`${props.rg} ${props.orgaoEmissor}/${props.ufRG}`, 597, 630, 22, 1, "#000000", 450);

    // CPF
    txt(formatarCPF(props.cpf), 597, 695, 22, 1, "#000000", 250);

    // Nº Registro (vermelho)
    txt(props.registro, 801, 695, 22, 1, "#c0392b", 210);

    // Categoria (vermelho)
    txt(props.categoria, 990, 695, 22, 1, "#c0392b", 120);

    // Nacionalidade
    txt(props.nacionalidade || "BRASILEIRO(A)", 308, 760, 22, 1, "#000000", 500);

    // Filiação
    txt(props.nomePai, 597, 826, 22, 1, "#000000", 550);
    txt(props.nomeMae, 597, 869, 22, 1, "#000000", 550);

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

    // Assinaturas digitais
    ctx.font = "23px 'Ultra', Arial, sans-serif";
    ctx.fillText(props.assDigital1 || "46418156416", 945, 1545);
    ctx.fillText(props.assDigital2 || "SP032377809", 945, 1575);
    ctx.restore();

    // Textos laterais verticais (Nº Espelho)
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

    // ═══════════════════════════════════════════════════════════════
    // TABELA DE CATEGORIAS (Datas de validade)
    // ═══════════════════════════════════════════════════════════════
    const cats: Record<string, { x: number; y: number }> = {
      ACC: { x: 385, y: 900 },
      A:   { x: 530, y: 1086 },
      B:   { x: 530, y: 1158 },
      C:   { x: 530, y: 1227 },
      D:   { x: 952, y: 1054 },
      BE:  { x: 952, y: 1158 },
    };

    let userCat = (props.categoria || "").toUpperCase();
    if (userCat.includes("E")) userCat += "DCB";
    else if (userCat.includes("D")) userCat += "CB";
    else if (userCat.includes("C")) userCat += "B";

    Object.keys(cats).forEach((k) => {
      if (userCat.includes(k)) {
        txt(d(props.validade), cats[k].x, cats[k].y, 14, 1, "#000000", 120);
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // FOTO DO CONDUTOR
    // ═══════════════════════════════════════════════════════════════
    if (props.fotoUrl) {
      try {
        const fotoImg = await loadImage(props.fotoUrl);
        const scale = props.fotoScale ?? 1.0;
        const offsetX = props.fotoOffsetX ?? 0;
        const offsetY = props.fotoOffsetY ?? 0;
        const baseBw = 247, baseBh = 300;
        const bw = Math.round(baseBw * scale);
        const bh = Math.round(baseBh * scale);
        const bx = 305 + Math.round((baseBw - bw) / 2) + offsetX;
        const by = 550 + Math.round((baseBh - bh) / 2) + offsetY;
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx, by, bw, bh);
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
      } catch (e) { console.warn("Erro foto:", e); }
    }

    // ═══════════════════════════════════════════════════════════════
    // ASSINATURA DO CONDUTOR
    // ═══════════════════════════════════════════════════════════════
    if (props.assinaturaUrl) {
      try {
        const assImg = await loadImage(props.assinaturaUrl);
        const scale = props.assScale ?? 1.0;
        const offsetX = props.assOffsetX ?? 0;
        const offsetY = props.assOffsetY ?? 0;
        const baseBw = 250, baseBh = 60;
        const bw = Math.round(baseBw * scale);
        const bh = Math.round(baseBh * scale);
        const bx = 303 + Math.round((baseBw - bw) / 2) + offsetX;
        const by = 870 + Math.round((baseBh - bh) / 2) + offsetY;
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx, by, bw, bh);
        ctx.clip();

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = assImg.width;
        tempCanvas.height = assImg.height;
        const tctx = tempCanvas.getContext('2d')!;
        tctx.fillStyle = '#FFFFFF';
        tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tctx.drawImage(assImg, 0, 0);

        const ratio = Math.min(bw / assImg.width, bh / assImg.height);
        const drawW = assImg.width * ratio;
        const drawH = assImg.height * ratio;
        const drawX = bx + (bw - drawW) / 2;
        const drawY = by + (bh - drawH) / 2;

        ctx.filter = "contrast(5) brightness(0.3) grayscale(1)";
        ctx.drawImage(tempCanvas, drawX, drawY, drawW, drawH);
        ctx.restore();
      } catch (e) { console.warn("Erro assinatura:", e); }
    }

    // ═══════════════════════════════════════════════════════════════
    // MRZ (OCR-B 28px @300DPI)
    // ═══════════════════════════════════════════════════════════════
    const mrz = gerarMRZ(props);
    ctx.font = "28px 'OCR-B', monospace";
    ctx.fillStyle = "#353535";
    ctx.textBaseline = "top";
    mrz.forEach((l, i) => ctx.fillText(l, 335, 2225 + (i * 33)));

    // ═══════════════════════════════════════════════════════════════
    // QR CODE (Box 700x700px em x=1441, y=430)
    // Direciona para https://validacao-online-vio.digital/?cpf={CPF}
    // ═══════════════════════════════════════════════════════════════
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
