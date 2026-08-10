/**
 * CRLVDocument — Geração visual 1:1 com a Imagem Base Original do SENATRAN / DETRAN (A4 @300DPI)
 *
 * Utiliza o modelo limpo original /assets/crlv_template_clean.png como BACKGROUND PRINCIPAL
 * e desenha as informações em texto dinâmico sobrepostas com a fonte "Courier Prime" em NEGRITO.
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
  fontBaseSize = 38,
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

  // Garantir pré-carregamento da fonte Courier Prime
  try {
    await document.fonts.load(`bold 40px "Courier Prime"`);
  } catch {}

  // 1. Fundo Branco Inicial
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // 2. Carregar Imagem BASE Principal Original do Template
  let bgImg: HTMLImageElement | null = null;
  try {
    bgImg = await loadImage("/assets/crlv_template_clean.png");
  } catch {
    try { bgImg = await loadImage("/assets/crlv_template_base.png"); } catch {}
  }

  if (bgImg) {
    // DESENHAR O MODELO BASE ORIGINAL COMO BACKGROUND PRINCIPAL (1:1)
    ctx.drawImage(bgImg, 0, 0, PAGE_W, PAGE_H);
  } else {
    // Fallback de contingência caso a imagem falhe ao carregar
    ctx.fillStyle = "#2c3036";
    ctx.fillRect(0, 0, PAGE_W, 150);
  }

  // Configuração padrão de alinhamento e cor de texto para valores
  ctx.fillStyle = "#000000";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const marginX = 70;
  const midX = PAGE_W / 2; // 1240
  const leftW = midX - marginX - 40; // ~1130px
  const rightX = midX + 40;
  const rightW = PAGE_W - marginX - rightX;

  // ─── SOBREPOSIÇÃO DOS DADOS EM TEXTO (Courier Prime em NEGRITO) ─────────────

  // 1. DETRAN - UF (Se alterado pelo usuário)
  const detranUf = (props.detranUF || props.emissaoDetranUF || "PR").toUpperCase();
  if (detranUf !== "PR") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(marginX + 95, 158, 60, 24);
    ctx.fillStyle = "#000000";
    ctx.font = `bold 18px ${FONT_LBL}`;
    ctx.fillText(detranUf, marginX + 95, 177);
  }

  // 2. CÓDIGO RENAVAM
  ctx.fillStyle = "#000000";
  ctx.font = `bold 42px ${FONT_VAL}`;
  ctx.fillText(props.renavam || "00278581161", marginX, 350);

  // 3. QR CODE PRINCIPAL DO DOCUMENTO
  const qrSize = 430;
  const qrX = 705;
  const qrY = 270;

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

  // 4. PLACA & EXERCÍCIO
  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText((props.placa || "MPK5502").toUpperCase(), marginX, 485);
  ctx.fillText(props.exercicio || "2026", marginX + 340, 485);

  // 5. ANO FABRICAÇÃO & ANO MODELO
  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText(props.anoFabricacao || "1993", marginX, 595);
  ctx.fillText(props.anoModelo || "1993", marginX + 340, 595);

  // 6. NÚMERO DO CRV
  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText(props.numeroCRV || "***", marginX, 705);

  // 7. CÓDIGO DE SEGURANÇA DO CLA & CAT
  ctx.font = `bold 38px ${FONT_VAL}`;
  ctx.fillText(props.codigoSegurancaCLA || "66545815734", marginX, 815);
  ctx.fillText(props.cat || "***", marginX + 640, 815);

  // 8. MARCA / MODELO / VERSÃO
  drawClippedText(ctx, (props.marcaModeloVersao || "GM/OMEGA GLS").toUpperCase(), marginX, 920, leftW, 38, true, FONT_VAL);

  // 9. ESPÉCIE / TIPO
  drawClippedText(ctx, (props.especieTipo || "PASSAGEIRO AUTOMOVEL").toUpperCase(), marginX, 1025, leftW, 38, true, FONT_VAL);

  // 10. PLACA ANTERIOR / UF & CHASSI
  ctx.font = `bold 36px ${FONT_VAL}`;
  ctx.fillText((props.placaAnteriorUF || "*******/**").toUpperCase(), marginX, 1130);
  drawClippedText(ctx, (props.chassi || "9BGVP19BPPB233276").toUpperCase(), marginX + 480, 1130, leftW - 480, 36, true, FONT_VAL);

  // 11. COR PREDOMINANTE & COMBUSTÍVEL
  ctx.font = `bold 38px ${FONT_VAL}`;
  ctx.fillText((props.corPredominante || "PRETA").toUpperCase(), marginX, 1235);
  ctx.fillText((props.combustivel || "GASOLINA").toUpperCase(), marginX + 380, 1235);

  // 12. RODAPÉ DE EMISSÃO DETRAN
  const ufEmi = (props.emissaoDetranUF || props.detranUF || "SE").toUpperCase();
  const hashEmi = props.emissaoDetranHash || "D72C8C94ED88BF41";
  const dataEmiStr = props.emissaoDataHora || "30/06/2026 às 14:11:30";
  ctx.font = `16px ${FONT_LBL}`;
  ctx.fillStyle = "#333333";
  ctx.fillText(`Documento emitido por DETRAN ${ufEmi} (${hashEmi}) em ${dataEmiStr}.`, marginX, 1272);

  // 13. OBSERVAÇÕES DO VEÍCULO
  ctx.font = `bold 34px ${FONT_VAL}`;
  ctx.fillStyle = "#000000";
  ctx.fillText(props.observacoesVeiculo || "SEM OBSERVAÇÕES", marginX + 30, 1440);

  // ─── COLUNA DIREITA (ESPECIFICAÇÕES & PROPRIETÁRIO) ─────────────────────

  // 14. CATEGORIA & CAPACIDADE
  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText((props.categoria || "PARTICULAR").toUpperCase(), rightX, 350);
  ctx.fillText(props.capacidade || "*.*", rightX + 680, 350);

  // 15. POTÊNCIA/CILINDRADA & PESO BRUTO TOTAL
  ctx.font = `bold 38px ${FONT_VAL}`;
  ctx.fillText((props.potenciaCilindrada || "116CV/2198").toUpperCase(), rightX, 455);
  ctx.fillText(props.pesoBrutoTotal || "1.29", rightX + 680, 455);

  // 16. MOTOR, CMT, EIXOS, LOTAÇÃO (4 Sub-colunas)
  ctx.font = `bold 36px ${FONT_VAL}`;
  drawClippedText(ctx, (props.motor || "C20NE31022309V").toUpperCase(), rightX, 560, 500, 36, true, FONT_VAL);
  ctx.fillText(props.cmt || "3.05", rightX + 530, 560);
  ctx.fillText(props.eixos || "2", rightX + 730, 560);
  ctx.fillText(props.lotacao || "05P", rightX + 880, 560);

  // 17. CARROCERIA
  ctx.font = `bold 38px ${FONT_VAL}`;
  ctx.fillText((props.carroceria || "NÃO APLICAVEL").toUpperCase(), rightX, 665);

  // 18. NOME DO PROPRIETÁRIO
  drawClippedText(ctx, (props.nome || "ANTONIO CAMILO ALMEIDA FREITAS JUNIOR").toUpperCase(), rightX, 775, rightW, 38, true, FONT_VAL);

  // 19. CPF / CNPJ (Alinhado)
  ctx.font = `bold 38px ${FONT_VAL}`;
  ctx.fillText(props.cpfCnpj || "042.512.909-84", rightX + 530, 880);

  // 20. LOCAL & DATA
  drawClippedText(ctx, (props.local || "CURITIBA PR").toUpperCase(), rightX, 985, 700, 38, true, FONT_VAL);
  ctx.font = `bold 38px ${FONT_VAL}`;
  ctx.fillText(props.dataEmissaoDoc || "21/01/2026", rightX + 730, 985);

  // 21. ASTERISCO NA ASSINATURA DETRAN
  ctx.font = `bold 24px ${FONT_VAL}`;
  ctx.fillText("*", PAGE_W - marginX - 15, 1030);

  // 22. DADOS DO SEGURO DPVAT
  const dpvatY = 1060;
  ctx.font = `bold 24px ${FONT_VAL}`;
  ctx.fillText(props.dpvatCatTarif || "*", rightX + 20, dpvatY + 85);
  ctx.fillText(props.dpvatDataQuitacao || "*", rightX + 240, dpvatY + 85);

  // Checkboxes DPVAT
  if (props.dpvatPagamento === "COTA ÚNICA") {
    ctx.font = `bold 20px ${FONT_VAL}`;
    ctx.fillText("X", rightX + 554, dpvatY + 86);
  } else if (props.dpvatPagamento === "PARCELADO") {
    ctx.font = `bold 20px ${FONT_VAL}`;
    ctx.fillText("X", rightX + 734, dpvatY + 86);
  }

  // Valores DPVAT Linha 2
  ctx.font = `bold 24px ${FONT_VAL}`;
  ctx.fillText(props.dpvatRepasseFns || "*", rightX + 20, dpvatY + 205);
  ctx.fillText(props.dpvatCustoBilhete || "*", rightX + 410, dpvatY + 205);
  ctx.fillText(props.dpvatCustoEfetivo || "*", rightX + 700, dpvatY + 205);

  // Valores DPVAT Linha 3
  ctx.fillText(props.dpvatRepasseDenatran || "*", rightX + 20, dpvatY + 355);
  ctx.fillText(props.dpvatValorIof || "*", rightX + 410, dpvatY + 355);
  ctx.fillText(props.dpvatValorTotal || "*", rightX + 700, dpvatY + 355);

  // 23. INFORMAÇÕES DO SEGURO DPVAT (Linhas customizadas)
  const infY = 1520;
  if (props.informacoesDpvat) {
    ctx.font = `24px ${FONT_VAL}`;
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
        }}
      />
    </div>
  );
});

export default CRLVDocument;
