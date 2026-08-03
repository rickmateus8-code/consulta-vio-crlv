/**
 * CNHDocument — Geração visual da CNH Digital via Canvas
 *
 * Usa o template de imagem (cnh_modelo.jpg) como background e desenha
 * todos os campos por cima via Canvas 2D, replicando fielmente
 * o layout do elitedoc.store com coordenadas pixel-perfect.
 *
 * Fontes: Ultra (AltraW00-SmallCaps.woff2) + OCR-B (ocrbstd.otf)
 * Exporta como imagem JPEG de alta qualidade.
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

function gerarMRZ(user: CNHDocumentProps): string[] {
  const pad = (s: string, l: number) => (s || "UNKNOWN").toUpperCase().replace(/[^A-Z0-9]/g, "<").padEnd(l, "<");
  const fmtData = (d: string) => {
    if (!d) return "000000";
    const p = d.split("-");
    if (p.length === 3) return `${p[0].slice(2)}${p[1]}${p[2]}`;
    // Fallback para DD/MM/YYYY
    const p2 = d.split("/");
    if (p2.length === 3) return `${p2[2].slice(2)}${p2[1]}${p2[0]}`;
    return "000000";
  };
  const r = (user.registro || "00000000000").replace(/\D/g, "").padEnd(11, "<").slice(0, 11);
  const e = (user.espelho || "000000000").replace(/\D/g, "").padEnd(9, "<").slice(0, 9);
  const nomeTruncado = pad(user.nome, 30).substring(0, 30);
  return [
    `I<BRA${r}<${e}<<<<`,
    `${fmtData(user.dataNascimento)}0${user.sexo ? user.sexo.charAt(0) : "M"}${fmtData(user.validade)}5BRA<<<<<<<<<<<<`,
    nomeTruncado,
  ];
}

function getCrossOrigin(url: string): "" | "anonymous" | undefined {
  if (!url) return undefined;
  if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("/")) {
    return undefined;
  }
  return "anonymous";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const crossOrigin = getCrossOrigin(src);
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      console.warn("Erro ao carregar imagem:", src, e);
      reject(e);
    };
    img.src = src;
  });
}

// Carregar fontes customizadas
let fontsLoaded = false;
async function loadFonts() {
  if (fontsLoaded) return;
  try {
    const ultraFont = new FontFace("Ultra", "url(/assets/AltraW00-SmallCaps.woff2)");
    const ocrFont = new FontFace("OCR-B", "url(/assets/ocrbstd.otf)");
    const [f1, f2] = await Promise.all([ultraFont.load(), ocrFont.load()]);
    document.fonts.add(f1);
    document.fonts.add(f2);
    fontsLoaded = true;
  } catch (e) {
    console.warn("Fontes customizadas não carregaram, usando fallback:", e);
  }
}

export interface CNHDocumentHandle {
  exportAsBlob: () => Promise<Blob | null>;
  exportAsPdf: () => Promise<void>;
  getCanvas: () => HTMLCanvasElement | null;
  exportCropBlob: (x: number, y: number, w: number, h: number) => Promise<Blob | null>;
}

const CNHDocument = forwardRef<CNHDocumentHandle, CNHDocumentProps>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    exportAsBlob: async () => {
      const cvs = canvasRef.current;
      if (!cvs) return null;
      // Usar canvas já renderizado pelo useEffect; garantir fundo branco
      const whiteCvs = document.createElement("canvas");
      whiteCvs.width = cvs.width;
      whiteCvs.height = cvs.height;
      const wctx = whiteCvs.getContext("2d");
      if (!wctx) return null;
      wctx.fillStyle = "#FFFFFF";
      wctx.fillRect(0, 0, cvs.width, cvs.height);
      wctx.drawImage(cvs, 0, 0);
      return new Promise<Blob | null>((resolve) => {
        whiteCvs.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
      });
    },
    exportAsPdf: async () => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const { default: jsPDF } = await import("jspdf");

      // Usar canvas já renderizado pelo useEffect; garantir fundo branco
      const whiteCvs = document.createElement("canvas");
      whiteCvs.width = cvs.width;
      whiteCvs.height = cvs.height;
      const wctx = whiteCvs.getContext("2d");
      if (!wctx) return;
      wctx.fillStyle = "#FFFFFF";
      wctx.fillRect(0, 0, cvs.width, cvs.height);
      wctx.drawImage(cvs, 0, 0);

      // Dimensions in mm at 96 DPI (1px = 0.2646mm)
      const cw = cvs.width;
      const ch = cvs.height;
      const pxToMm = 0.2646;
      const wMm = cw * pxToMm;
      const hMm = ch * pxToMm;
      const orientation = wMm > hMm ? "l" : "p";
      const pdf = new jsPDF({ orientation, unit: "mm", format: [wMm, hMm] });
      const imgData = whiteCvs.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, wMm, hMm);
      const nomeFormatado = (props.nome || "DOCUMENTO")
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^A-Z0-9_]/g, "");
      pdf.save(`CNH_${nomeFormatado}.pdf`);
    },
    getCanvas: () => canvasRef.current,
    exportCropBlob: async (x: number, y: number, w: number, h: number) => {
      const cvs = canvasRef.current;
      if (!cvs) return null;
      const crop = document.createElement('canvas');
      crop.width = w;
      crop.height = h;
      const cctx = crop.getContext('2d');
      if (!cctx) return null;
      cctx.fillStyle = "#FFFFFF";
      cctx.fillRect(0, 0, w, h);
      cctx.drawImage(cvs, x, y, w, h, 0, 0, w, h);
      return new Promise<Blob | null>((resolve) => {
        crop.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
      });
    },
  }));

  const renderCanvas = async () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    // Carregar fontes antes de renderizar
    await loadFonts();

    try {
      // Carregar template original do elitedoc (cnh_modelo.jpg)
      const bg = await loadImage("/assets/cnh_modelo.jpg");
      cvs.width = bg.width;
      cvs.height = bg.height;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, bg.width, bg.height);
      ctx.drawImage(bg, 0, 0);

      // Configurar texto padrão
      ctx.fillStyle = "#000";
      ctx.textBaseline = "top";

      // Função helper txt() — idêntica à do elitedoc
      // txt(texto, x, y, tamanho, bold, cor, maxWidth)
      const txt = (t: string, x: number, y: number, s: number, _b?: boolean | number, c?: string, mw?: number) => {
        if (!t) return;
        ctx.font = `${s}px 'Ultra', serif`;
        ctx.fillStyle = c || "#000";
        t = String(t).toUpperCase();

        if (mw) {
          const w = ctx.measureText(t).width;
          if (w > mw) {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(mw / w, 1);
            ctx.fillText(t, 0, 0);
            ctx.restore();
          } else {
            ctx.fillText(t, x, y);
          }
        } else {
          ctx.fillText(t, x, y);
        }
      };

      const d = (v: string) => fmtDate(v);

      // ===== CAMPOS PRINCIPAIS (posições idênticas ao elitedoc) =====

      // Nome Completo
      txt(props.nome, 314, 452, 22, 1, "#000", 520);

      // Data Nascimento + Local + UF
      let ln = d(props.dataNascimento);
      if (props.localNascimento) ln += ` ${props.localNascimento}`;
      if (props.ufNascimento) ln += `/${props.ufNascimento}`;
      txt(ln, 597, 510, 22, 1, "#000", 450);

      // Nacionalidade
      txt(props.nacionalidade, 599, 752, 22, 1, "#000", 300);

      // Data Emissão (4a)
      txt(d(props.dataEmissao), 597, 570, 22, 1, "#000", 180);

      // Validade (4b) - em vermelho
      txt(d(props.validade), 775, 570, 22, 1, "#c0392b", 180);

      // RG + Órgão Emissor / UF
      txt(`${props.rg} ${props.orgaoEmissor}/${props.ufRG}`, 597, 630, 22, 1, "#000", 450);

      // CPF
      txt(formatarCPF(props.cpf), 597, 695, 22, 1, "#000", 250);

      // Nome Pai
      txt(props.nomePai, 597, 826, 22, 1, "#000", 550);

      // Nome Mãe
      txt(props.nomeMae, 597, 869, 22, 1, "#000", 550);

      // Nº Registro - em vermelho
      txt(props.registro, 801, 695, 22, 1, "#c0392b", 210);

      // Categoria - em vermelho
      txt(props.categoria, 990, 695, 22, 1, "#c0392b", 120);

      // Observações (multi-linha)
      const obsTexto = String(props.observacoes || "");
      const linhasObs = obsTexto.split("\n");
      const obsY = 1340;
      linhasObs.forEach((linha, index) => {
        txt(linha, 320, obsY + (index * 20), 20, false, "#000", 680);
      });

      // Local Emissão + UF
      txt(`${props.localEmissao}, ${props.ufEmissao}`, 318, 1569, 22, 1, "#000", 450);

      // 1ª Habilitação
      txt(d(props.primeiraHabilitacao), 958, 450, 22, 1, "#000", 180);

      // Tipo CNH (D = Definitiva, P = Permissão) - letra grande no box
      const tipoLetra = props.tipo === "Permissão" ? "P" : "D";
      txt(tipoLetra, 1055, 555, 55, 1, "#000", 80);

      // ===== TEXTOS LATERAIS VERTICAIS =====
      // Nº CNH (Espelho) rotacionado na lateral esquerda (2 posições)
      ctx.save();
      ctx.translate(213, 930);
      ctx.rotate(-Math.PI / 2);
      ctx.font = "40px 'Ultra', serif";
      ctx.fillStyle = "#000";
      ctx.fillText(props.espelho || "0000000000", 0, 0);
      ctx.restore();

      ctx.save();
      ctx.translate(213, 1670);
      ctx.rotate(-Math.PI / 2);
      ctx.font = "40px 'Ultra', serif";
      ctx.fillStyle = "#000";
      ctx.fillText(props.espelho || "0000000000", 0, 0);
      ctx.restore();

      // ===== NOME DO ESTADO POR EXTENSO =====
      ctx.save();
      ctx.textAlign = "center";
      const ufDigitada = (props.ufEmissao || "").trim().toUpperCase();
      const nomeEstadoCompleto = NOMES_ESTADOS[ufDigitada] || "";
      ctx.font = "bold 44px 'Ultra', sans-serif";
      ctx.fillStyle = "#000";
      ctx.fillText(nomeEstadoCompleto, 670, 1660);

      // Assinaturas digitais
      ctx.font = "23px 'Ultra'";
      ctx.fillText(props.assDigital1, 945, 1545);
      ctx.fillText(props.assDigital2, 945, 1575);
      ctx.restore();

      // ===== MRZ =====
      const mrz = gerarMRZ(props);
      ctx.font = "28px 'OCR-B', monospace";
      ctx.fillStyle = "#353535";
      mrz.forEach((l, i) => ctx.fillText(l, 335, 2225 + (i * 33)));

      // ===== TABELA DE CATEGORIAS =====
      const cats: Record<string, { x: number; y: number }> = {
        ACC: { x: 385, y: 900 },
        A: { x: 530, y: 1086 },
        B: { x: 530, y: 1158 },
        C: { x: 530, y: 1227 },
        D: { x: 952, y: 1054 },
        E: { x: 952, y: 1158 },
      };

      let userCat = (props.categoria || "").toUpperCase();
      // Lógica de herança de categorias (E inclui D,C,B; D inclui C,B; C inclui B)
      if (userCat.includes("E")) userCat += "DCB";
      else if (userCat.includes("D")) userCat += "CB";
      else if (userCat.includes("C")) userCat += "B";

      Object.keys(cats).forEach((k) => {
        if (userCat.includes(k)) {
          txt(d(props.validade), cats[k].x, cats[k].y, 14, 1, "#000", 120);
        }
      });

      // ===== FOTO DO ROSTO =====
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
          // Centralizar e cobrir o box (cover)
          const imgRatio = fotoImg.width / fotoImg.height;
          const boxRatio = bw / bh;
          let drawW: number, drawH: number, drawX: number, drawY: number;
          if (imgRatio > boxRatio) {
            drawH = bh;
            drawW = bh * imgRatio;
            drawX = bx - (drawW - bw) / 2;
            drawY = by;
          } else {
            drawW = bw;
            drawH = bw / imgRatio;
            drawX = bx;
            drawY = by - (drawH - bh) / 2;
          }
          ctx.drawImage(fotoImg, drawX, drawY, drawW, drawH);
          ctx.restore();
        } catch (e) {
          console.warn("Erro ao carregar foto:", e);
        }
      }

      // ===== ASSINATURA =====
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
        } catch (e) {
          console.warn("Erro ao carregar assinatura:", e);
        }
      }


      // ===== QR CODE =====
      if (props.codigoQR && props.codigoQR !== "PREVIEW") {
        try {
          const qrUrl = `https://docmaster.store/v/${props.codigoQR}`;
          const qrDataUrl = await QRCode.toDataURL(qrUrl, {
            width: 700,
            margin: 0,
            errorCorrectionLevel: "M",
          });
          const qrImg = await loadImage(qrDataUrl);

          if (props.blurred) {
            // Desenhar QR borrado (anti-fraude)
            ctx.save();
            ctx.filter = "blur(12px)";
            ctx.drawImage(qrImg, 1441, 430, 700, 700);
            ctx.restore();
          } else {
            ctx.drawImage(qrImg, 1441, 430, 700, 700);
          }
        } catch (e) {
          console.warn("Erro ao gerar QR:", e);
        }
      } else if (props.codigoQR === "PREVIEW") {
        // QR placeholder borrado (anti-fraude antes da emissão)
        try {
          const qrDataUrl = await QRCode.toDataURL("https://docmaster.store", {
            width: 700,
            margin: 0,
            errorCorrectionLevel: "M",
          });
          const qrImg = await loadImage(qrDataUrl);
          ctx.save();
          ctx.filter = "blur(12px)";
          ctx.drawImage(qrImg, 1441, 430, 700, 700);
          ctx.restore();
        } catch (e) {
          console.warn("Erro ao gerar QR preview:", e);
        }
      }
    } catch (e) {
      console.error("Erro ao renderizar CNH:", e);
    }
  };

  // Disparar renderização sempre que as props mudarem
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { renderCanvas(); }, [props]);

  // Escala para preview (o canvas é ~2461x3496, escalar para caber na tela)
  const previewScale = 595 / 2461;

  return (
    <div ref={containerRef} style={{ width: 595, overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{
          width: 595,
          height: Math.round(3496 * previewScale),
          display: "block",
        }}
      />
    </div>
  );
});

CNHDocument.displayName = "CNHDocument";
export default CNHDocument;
