/**
 * CRLVDocument — Geração visual 1:1 baseada no Gabarito Vetorial PDF em Alta Definição (A4 @300DPI)
 *
 * Utiliza o modelo limpo vetorial 600DPI enviado pelo usuário como BACKGROUND PRINCIPAL ABSOLUTO
 * e desenha os textos dinâmicos em Courier Prime Bold com fontes 5% MAIORES e elevação de 2% (subir Y).
 */
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import QRCode from "qrcode";

export interface CRLVDocumentProps {
  renavam: string;
  placa: string;
  exercicio: string;
  anoFabricacao: string;
  anoModelo: string;
  numeroCRV: string;
  codigoSegurancaCLA: string;
  cat: string;
  marcaModeloVersao: string;
  especieTipo: string;
  placaAnteriorUF: string;
  chassi: string;
  corPredominante: string;
  combustivel: string;

  detranUF?: string;
  emissaoDetranUF?: string;
  emissaoDetranHash?: string;
  emissaoDataHora?: string;

  categoria: string;
  capacidade: string;
  potenciaCilindrada: string;
  pesoBrutoTotal: string;
  motor: string;
  cmt: string;
  eixos: string;
  lotacao: string;
  carroceria: string;
  nome: string;
  cpfCnpj: string;
  local: string;
  dataEmissaoDoc: string;

  dpvatCatTarif?: string;
  dpvatDataQuitacao?: string;
  dpvatPagamento?: "COTA ÚNICA" | "PARCELADO" | "";
  dpvatRepasseFns?: string;
  dpvatCustoBilhete?: string;
  dpvatCustoEfetivo?: string;
  dpvatRepasseDenatran?: string;
  dpvatValorIof?: string;
  dpvatValorTotal?: string;

  observacoesVeiculo?: string;
  informacoesDpvat?: string;

  codigoQR?: string;
  blurred?: boolean;
  previewWidth?: number;
}

export interface CRLVDocumentHandle {
  exportAsBlob: () => Promise<Blob | null>;
  exportAsPdf: () => Promise<void>;
  getCanvas: () => HTMLCanvasElement | null;
}

const PAGE_W = 2480;
const PAGE_H = 3508;
const FONT_VAL = '"Courier Prime", "Courier New", monospace';
const FONT_LBL = 'Arial, sans-serif';

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
    img.onerror = (e) => {
      console.warn("Erro ao carregar imagem CRLV:", src, e);
      reject(e);
    };
    img.src = src;
  });
}

function drawClippedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  fontBaseSize = 40,
  isBold = true,
  fontFamily = FONT_VAL
) {
  let size = fontBaseSize;
  ctx.font = `${isBold ? "bold " : ""}${size}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxW && size > 14) {
    size -= 1;
    ctx.font = `${isBold ? "bold " : ""}${size}px ${fontFamily}`;
  }
  ctx.fillText(text, x, y);
}

// ─── Renderização Principal no Canvas ──────────────────────────────────────────
async function drawCRLVToCanvas(cvs: HTMLCanvasElement, props: CRLVDocumentProps) {
  cvs.width = PAGE_W;
  cvs.height = PAGE_H;
  const ctx = cvs.getContext("2d")!;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Pré-carregamento da fonte Courier Prime
  try {
    await document.fonts.load(`bold 42px "Courier Prime"`);
  } catch {}

  // 1. Fundo Branco Inicial
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // 2. Carregar Imagem BASE Principal Original do Gabarito Vetorial (600DPI)
  let bgImg: HTMLImageElement | null = null;
  try {
    bgImg = await loadImage("/assets/crlv_template_clean.png");
  } catch {
    try { bgImg = await loadImage("/assets/crlv_base.png"); } catch {}
  }

  if (bgImg) {
    // DESENHAR O MODELO VETORIAL BASE ULTRA HD COMO BACKGROUND PRINCIPAL (1:1)
    ctx.drawImage(bgImg, 0, 0, PAGE_W, PAGE_H);
  }

  // Configuração padrão de alinhamento para valores
  ctx.fillStyle = "#000000";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const marginX = 129;
  const midX = PAGE_W / 2; // 1240
  const leftW = midX - marginX - 40; // ~1071px
  const rightX = 1319;
  const rightW = PAGE_W - marginX - rightX;

  // ─── SOBREPOSIÇÃO: FONTES +5% MAIORES & ELEVAÇÃO Y -2% (SUBIR) ──────────────────

  // 1. DETRAN - UF (Desenhado na barra superior se alterado)
  const detranUf = (props.detranUF || props.emissaoDetranUF || "PR").toUpperCase();
  if (detranUf !== "PR") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(200, 215, 65, 26);
    ctx.fillStyle = "#000000";
    ctx.font = `bold 19px ${FONT_LBL}`;
    ctx.fillText(detranUf, 200, 235);
  }

  // 2. CÓDIGO RENAVAM (Valor Y=435, Fonte: 44px)
  ctx.fillStyle = "#000000";
  ctx.font = `bold 44px ${FONT_VAL}`;
  ctx.fillText(props.renavam || "00278581161", marginX, 435);

  // 3. QR CODE PRINCIPAL DO DOCUMENTO (Coordenadas exatas do gabarito)
  const qrSize = 425;
  const qrX = 690;
  const qrY = 265;

  const crlvBaseUrl = "https://consulta-vio-crlv.pages.dev";
  const qrVal = props.codigoQR && props.codigoQR !== "PREVIEW"
    ? (props.codigoQR.startsWith("http") ? props.codigoQR : `${crlvBaseUrl}/?codigo=${encodeURIComponent(props.codigoQR)}`)
    : `${crlvBaseUrl}/?codigo=BDC8CA0686D839EE1CB1CB2E84D05F63`;

  try {
    const qrDataUrl = await QRCode.toDataURL(qrVal, { margin: 1, width: qrSize, errorCorrectionLevel: "M" });
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch {
    ctx.strokeStyle = "#000000";
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);
  }

  // 4. PLACA & EXERCÍCIO (Valor Y=545, Fonte: 42px)
  ctx.font = `bold 42px ${FONT_VAL}`;
  ctx.fillText((props.placa || "MPK5502").toUpperCase(), marginX, 545);
  ctx.fillText(props.exercicio || "2026", 427, 545);

  // 5. ANO FABRICAÇÃO & ANO MODELO (Valor Y=655, Fonte: 42px)
  ctx.font = `bold 42px ${FONT_VAL}`;
  ctx.fillText(props.anoFabricacao || "1993", marginX, 655);
  ctx.fillText(props.anoModelo || "1993", 427, 655);

  // 6. NÚMERO DO CRV (Valor Y=765, Fonte: 42px)
  ctx.font = `bold 42px ${FONT_VAL}`;
  ctx.fillText(props.numeroCRV || "***", marginX, 765);

  // 7. CÓDIGO DE SEGURANÇA DO CLA & CAT (Valor Y=1075, Fonte: 40px)
  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText(props.codigoSegurancaCLA || "66545815734", marginX, 1075);
  ctx.fillText(props.cat || "***", 676, 1075);

  // 8. MARCA / MODELO / VERSÃO (Valor Y=1225, Fonte: 40px)
  drawClippedText(ctx, (props.marcaModeloVersao || "GM/OMEGA GLS").toUpperCase(), marginX, 1225, leftW, 40, true, FONT_VAL);

  // 9. ESPÉCIE / TIPO (Valor Y=1370, Fonte: 40px)
  drawClippedText(ctx, (props.especieTipo || "PASSAGEIRO AUTOMOVEL").toUpperCase(), marginX, 1370, leftW, 40, true, FONT_VAL);

  // 10. PLACA ANTERIOR / UF & CHASSI (Valor Y=1518, Fonte: 38px)
  ctx.font = `bold 38px ${FONT_VAL}`;
  ctx.fillText((props.placaAnteriorUF || "*******/**").toUpperCase(), marginX, 1518);
  drawClippedText(ctx, (props.chassi || "9BGVP19BPPB233276").toUpperCase(), 543, 1518, leftW - 420, 38, true, FONT_VAL);

  // 11. COR PREDOMINANTE & COMBUSTÍVEL (Valor Y=1665, Fonte: 40px)
  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText((props.corPredominante || "PRETA").toUpperCase(), marginX, 1665);
  ctx.fillText((props.combustivel || "GASOLINA").toUpperCase(), 426, 1665);

  // 12. RODAPÉ DE EMISSÃO DETRAN (Y=1730)
  const ufEmi = (props.emissaoDetranUF || props.detranUF || "SE").toUpperCase();
  const hashEmi = props.emissaoDetranHash || "D72C8C94ED88BF41";
  const dataEmiStr = props.emissaoDataHora || "30/06/2026 às 14:11:30";
  ctx.font = `16px ${FONT_LBL}`;
  ctx.fillStyle = "#333333";
  ctx.fillText(`Documento emitido por DETRAN ${ufEmi} (${hashEmi}) em ${dataEmiStr}.`, marginX, 1730);

  // 13. OBSERVAÇÕES DO VEÍCULO (Valor Y=1880, Fonte: 36px - DENTRO DA CAIXA)
  ctx.font = `bold 36px ${FONT_VAL}`;
  ctx.fillStyle = "#000000";
  ctx.fillText(props.observacoesVeiculo || "SEM OBSERVAÇÕES", marginX, 1880);

  // ─── COLUNA DIREITA (ESPECIFICAÇÕES & PROPRIETÁRIO) ─────────────────────

  // 14. CATEGORIA & CAPACIDADE (Valor Y=335, Fonte: 42px)
  ctx.font = `bold 42px ${FONT_VAL}`;
  ctx.fillText((props.categoria || "PARTICULAR").toUpperCase(), rightX, 335);
  ctx.fillText(props.capacidade || "*.*", 2127, 335);

  // 15. POTÊNCIA/CILINDRADA & PESO BRUTO TOTAL (Valor Y=495, Fonte: 40px)
  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText((props.potenciaCilindrada || "116CV/2198").toUpperCase(), rightX, 495);
  ctx.fillText(props.pesoBrutoTotal || "1.29", 2126, 495);

  // 16. MOTOR, CMT, EIXOS, LOTAÇÃO (Valor Y=605, Fonte: 38px)
  ctx.font = `bold 38px ${FONT_VAL}`;
  drawClippedText(ctx, (props.motor || "C20NE31022309V").toUpperCase(), rightX, 605, 520, 38, true, FONT_VAL);
  ctx.fillText(props.cmt || "3.05", 1887, 605);
  ctx.fillText(props.eixos || "2", 2099, 605);
  ctx.fillText(props.lotacao || "05P", 2242, 605);

  // 17. CARROCERIA (Valor Y=715, Fonte: 40px)
  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText((props.carroceria || "NÃO APLICAVEL").toUpperCase(), rightX, 715);

  // 18. NOME DO PROPRIETÁRIO (Valor Y=820, Fonte: 40px)
  drawClippedText(ctx, (props.nome || "ANTONIO CAMILO ALMEIDA FREITAS JUNIOR").toUpperCase(), rightX, 820, rightW, 40, true, FONT_VAL);

  // 19. CPF / CNPJ (Valor Y=945, Fonte: 40px)
  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText(props.cpfCnpj || "042.512.909-84", 1928, 945);

  // 20. LOCAL & DATA (Valor Y=1075, Fonte: 40px)
  drawClippedText(ctx, (props.local || "CURITIBA PR").toUpperCase(), rightX, 1075, 700, 40, true, FONT_VAL);
  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText(props.dataEmissaoDoc || "21/01/2026", 2124, 1075);

  // 21. DPVAT VALORES (Se preenchidos diferentemente de *)
  const dpvatY = 1200;
  if (props.dpvatCatTarif && props.dpvatCatTarif !== "*") {
    ctx.font = `bold 25px ${FONT_VAL}`;
    ctx.fillText(props.dpvatCatTarif, rightX + 20, dpvatY + 85);
  }
  if (props.dpvatDataQuitacao && props.dpvatDataQuitacao !== "*") {
    ctx.font = `bold 25px ${FONT_VAL}`;
    ctx.fillText(props.dpvatDataQuitacao, rightX + 240, dpvatY + 85);
  }

  // Checkboxes DPVAT
  if (props.dpvatPagamento === "COTA ÚNICA") {
    ctx.font = `bold 21px ${FONT_VAL}`;
    ctx.fillText("X", rightX + 554, dpvatY + 86);
  } else if (props.dpvatPagamento === "PARCELADO") {
    ctx.font = `bold 21px ${FONT_VAL}`;
    ctx.fillText("X", rightX + 734, dpvatY + 86);
  }

  // 22. INFORMAÇÕES DO SEGURO DPVAT (Linhas adicionais)
  const infY = 1800;
  if (props.informacoesDpvat) {
    ctx.font = `25px ${FONT_VAL}`;
    ctx.fillStyle = "#000000";
    const lines = props.informacoesDpvat.split("\n");
    let ly = infY + 80;
    lines.forEach(l => {
      ctx.fillText(l, rightX + 30, ly);
      ly += 35;
    });
  }

  // Marca d'água se blurred / não emitido
  if (props.blurred) {
    ctx.save();
    ctx.translate(PAGE_W / 2, PAGE_H / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.font = `bold 90px ${FONT_LBL}`;
    ctx.fillStyle = "rgba(220, 38, 38, 0.28)";
    ctx.textAlign = "center";
    ctx.fillText("DOCUMENTO INVALIDO - NÃO EMITIDO - PRÉVIA", 0, 0);
    ctx.restore();
  }
}

// ─── Export para PDF ────────────────────────────────────────────────────────
async function exportToPdf(cvs: HTMLCanvasElement, props: CRLVDocumentProps) {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const imgData = cvs.toDataURL("image/jpeg", 0.98);
  pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);

  const nomeClean = (props.nome || "CRLV")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
  pdf.save(`CRLV_${props.placa || nomeClean}.pdf`);
}

// ─── Componente React ─────────────────────────────────────────────────────────
const CRLVDocument = forwardRef<CRLVDocumentHandle, CRLVDocumentProps>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    exportAsBlob: async () => {
      const cvs = document.createElement("canvas");
      await drawCRLVToCanvas(cvs, { ...props, blurred: false });
      return new Promise<Blob | null>((resolve) => {
        cvs.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
      });
    },
    exportAsPdf: async () => {
      const cvs = document.createElement("canvas");
      await drawCRLVToCanvas(cvs, { ...props, blurred: false });
      await exportToPdf(cvs, props);
    },
    getCanvas: () => canvasRef.current,
  }));

  const renderCanvas = async () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    await drawCRLVToCanvas(cvs, props);
  };

  useEffect(() => {
    renderCanvas();
  }, [props]);

  const displayWidth = props.previewWidth || 720;
  const displayHeight = (displayWidth * PAGE_H) / PAGE_W;

  return (
    <div className="relative inline-block bg-white shadow-2xl rounded-sm overflow-hidden border border-slate-300">
      <canvas
        ref={canvasRef}
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
          imageRendering: "crisp-edges",
        }}
      />
    </div>
  );
});

export default CRLVDocument;
