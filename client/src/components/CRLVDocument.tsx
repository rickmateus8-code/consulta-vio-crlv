/**
 * CRLVDocument — Geração visual 1:1 do Certificado de Registro e Licenciamento de Veículo (CRLV Digital A4 @300DPI)
 *
 * Espelhamento forense e estrutural do CRLV oficial SENATRAN / DETRAN
 * Fonte para informações: "Courier Prime" em NEGRITO
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

const PAGE_W = 2481;
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
  fontBaseSize = 36,
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

/**
 * Desenha caixas com títulos recortando a borda superior (1:1 com modelo oficial SENATRAN)
 */
function drawTitledBox(
  ctx: CanvasRenderingContext2D,
  title: string,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 20,
  fontSize = 22
) {
  ctx.save();
  // 1. Desenhar caixa arredondada
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();

  // 2. Limpar a linha da borda no local do título (Cutout)
  ctx.font = `bold ${fontSize}px ${FONT_LBL}`;
  const titleW = ctx.measureText(title).width;
  const paddingX = 12;
  const titleX = x + 30;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(titleX - paddingX, y - (fontSize / 2) - 2, titleW + (paddingX * 2), fontSize + 6);

  // 3. Escrever o título
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "middle";
  ctx.fillText(title, titleX, y);
  ctx.restore();
}

// ─── Renderização Principal no Canvas ──────────────────────────────────────────
async function drawCRLVToCanvas(cvs: HTMLCanvasElement, props: CRLVDocumentProps) {
  cvs.width = PAGE_W;
  cvs.height = PAGE_H;
  const ctx = cvs.getContext("2d")!;

  // Garantir carregamento prévio da fonte Courier Prime se disponível
  try {
    await document.fonts.load(`bold 40px "Courier Prime"`);
  } catch {}

  // 1. Fundo Branco Absoluto
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // Carregar Logos de Referência
  let brasaoImg: HTMLImageElement | null = null;
  let govbrImg: HTMLImageElement | null = null;

  try { brasaoImg = await loadImage("/assets/brasao_republica.png"); } catch {
    try { brasaoImg = await loadImage("/assets/brasao_republica_federal.jpg"); } catch {}
  }
  try { govbrImg = await loadImage("/img/logo.png"); } catch {}

  const marginX = 70;
  const midX = PAGE_W / 2; // 1240.5

  // ─── CABEÇALHO ESCURO SENATRAN (Top Dark Bar 1:1) ─────────────────────────
  const headerH = 150;
  ctx.fillStyle = "#2c3036"; // Cor grafite chumbo oficial do topo SENATRAN
  ctx.fillRect(0, 0, PAGE_W, headerH);

  // Brasão da República (Top Left no topo escuro)
  if (brasaoImg) {
    ctx.drawImage(brasaoImg, marginX, 20, 110, 110);
  }

  // Texto República / SENATRAN (Texto Branco)
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 24px ${FONT_LBL}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("REPÚBLICA FEDERATIVA DO BRASIL", marginX + 130, 32);

  ctx.font = `18px ${FONT_LBL}`;
  ctx.fillStyle = "#E2E8F0";
  ctx.fillText("MINISTÉRIO DOS TRANSPORTES SECRETARIA NACIONAL DE", marginX + 130, 68);
  ctx.fillText("TRÂNSITO - SENATRAN", marginX + 130, 94);

  // Logo gov.br (Top Right no topo escuro)
  if (govbrImg) {
    ctx.drawImage(govbrImg, PAGE_W - marginX - 170, 45, 170, 60);
  } else {
    ctx.font = `bold 44px ${FONT_LBL}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "right";
    ctx.fillText("gov.br", PAGE_W - marginX, 45);
    ctx.textAlign = "left";
  }

  // ─── SUB-CABEÇALHO BRANCO DETRAN ──────────────────────────────────────────
  const ufDetran = (props.detranUF || props.emissaoDetranUF || "PR").toUpperCase();
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillStyle = "#444444";
  ctx.fillText(`DETRAN- ${ufDetran}`, marginX, 175);

  ctx.font = `bold 28px ${FONT_LBL}`;
  ctx.fillStyle = "#000000";
  ctx.fillText("CERTIFICADO DE REGISTRO E LICENCIAMENTO DE VEÍCULO - DIGITAL", marginX, 202);

  // Linha Separadora Horizontal abaixo do sub-cabeçalho
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(marginX, 245);
  ctx.lineTo(PAGE_W - marginX, 245);
  ctx.stroke();

  // Linha Vertical Dotted (Pontilhada Central Divisória das 2 Colunas)
  ctx.save();
  ctx.strokeStyle = "#666666";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(midX, 245);
  ctx.lineTo(midX, 3420);
  ctx.stroke();
  ctx.restore();

  // ─── COLUNA ESQUERDA (DADOS DO VEÍCULO) ───────────────────────────────────
  const leftW = midX - marginX - 40; // ~1130px

  // CÓDIGO RENAVAM
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillStyle = "#000000";
  ctx.fillText("CÓDIGO RENAVAM", marginX, 270);

  ctx.font = `bold 42px ${FONT_VAL}`;
  ctx.fillText(props.renavam || "00278581161", marginX, 305);

  // QR CODE BOX (lado direito da coluna esquerda)
  const qrSize = 420;
  const qrX = marginX + leftW - qrSize;
  const qrY = 270;

  // Gerar QR Code Canvas
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

  // Texto Vertical ao lado do QR Code: "Valide este QRCode com app Vio" (-90deg)
  ctx.save();
  ctx.translate(qrX + qrSize + 28, qrY + qrSize);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `19px ${FONT_LBL}`;
  ctx.fillStyle = "#000000";
  ctx.fillText("Valide este QRCode com app Vio", 0, 0);
  ctx.restore();

  // PLACA e EXERCÍCIO
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("PLACA", marginX, 405);
  ctx.fillText("EXERCÍCIO", marginX + 340, 405);

  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText((props.placa || "MPK5502").toUpperCase(), marginX, 440);
  ctx.fillText(props.exercicio || "2026", marginX + 340, 440);

  // Linha horizontal interna
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(marginX, 495); ctx.lineTo(qrX - 20, 495); ctx.stroke();

  // ANO FABRICAÇÃO e ANO MODELO
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("ANO FABRICAÇÃO", marginX, 515);
  ctx.fillText("ANO MODELO", marginX + 340, 515);

  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText(props.anoFabricacao || "1993", marginX, 550);
  ctx.fillText(props.anoModelo || "1993", marginX + 340, 550);

  // Linha horizontal interna
  ctx.beginPath(); ctx.moveTo(marginX, 605); ctx.lineTo(qrX - 20, 605); ctx.stroke();

  // NÚMERO DO CRV
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("NÚMERO DO CRV", marginX, 625);
  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText(props.numeroCRV || "***", marginX, 660);

  // Linha separadora completa abaixo do bloco superior do QR Code
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(marginX, 715); ctx.lineTo(midX - 30, 715); ctx.stroke();

  // CÓDIGO DE SEGURANÇA DO CLA e CAT
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("CÓDIGO DE SEGURANÇA DO CLA", marginX, 735);
  ctx.fillText("CAT", marginX + 640, 735);

  ctx.font = `bold 38px ${FONT_VAL}`;
  ctx.fillText(props.codigoSegurancaCLA || "66545815734", marginX, 770);
  ctx.fillText(props.cat || "***", marginX + 640, 770);

  ctx.beginPath(); ctx.moveTo(marginX, 815); ctx.lineTo(midX - 30, 815); ctx.stroke();

  // MARCA / MODELO / VERSÃO
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("MARCA / MODELO / VERSÃO", marginX, 835);
  drawClippedText(ctx, (props.marcaModeloVersao || "GM/OMEGA GLS").toUpperCase(), marginX, 875, leftW, 38, true, FONT_VAL);

  ctx.beginPath(); ctx.moveTo(marginX, 920); ctx.lineTo(midX - 30, 920); ctx.stroke();

  // ESPÉCIE / TIPO
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("ESPÉCIE / TIPO", marginX, 940);
  drawClippedText(ctx, (props.especieTipo || "PASSAGEIRO AUTOMOVEL").toUpperCase(), marginX, 980, leftW, 38, true, FONT_VAL);

  ctx.beginPath(); ctx.moveTo(marginX, 1025); ctx.lineTo(midX - 30, 1025); ctx.stroke();

  // PLACA ANTERIOR / UF e CHASSI
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("PLACA ANTERIOR / UF", marginX, 1045);
  ctx.fillText("CHASSI", marginX + 480, 1045);

  ctx.font = `bold 36px ${FONT_VAL}`;
  ctx.fillText((props.placaAnteriorUF || "*******/**").toUpperCase(), marginX, 1085);
  drawClippedText(ctx, (props.chassi || "9BGVP19BPPB233276").toUpperCase(), marginX + 480, 1085, leftW - 480, 36, true, FONT_VAL);

  ctx.beginPath(); ctx.moveTo(marginX, 1130); ctx.lineTo(midX - 30, 1130); ctx.stroke();

  // COR PREDOMINANTE e COMBUSTÍVEL
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("COR PREDOMINANTE", marginX, 1150);
  ctx.fillText("COMBUSTÍVEL", marginX + 380, 1150);

  ctx.font = `bold 38px ${FONT_VAL}`;
  ctx.fillText((props.corPredominante || "PRETA").toUpperCase(), marginX, 1190);
  ctx.fillText((props.combustivel || "GASOLINA").toUpperCase(), marginX + 380, 1190);

  ctx.beginPath(); ctx.moveTo(marginX, 1235); ctx.lineTo(midX - 30, 1235); ctx.stroke();

  // Linha de Rodapé de Emissão
  const ufEmi = (props.emissaoDetranUF || props.detranUF || "SE").toUpperCase();
  const hashEmi = props.emissaoDetranHash || "D72C8C94ED88BF41";
  const dataEmiStr = props.emissaoDataHora || "30/06/2026 às 14:11:30";
  ctx.font = `16px ${FONT_LBL}`;
  ctx.fillStyle = "#333333";
  ctx.fillText(`Documento emitido por DETRAN ${ufEmi} (${hashEmi}) em ${dataEmiStr}.`, marginX, 1260);

  // ─── OBSERVAÇÕES DO VEÍCULO (Caixa arredondada com cutout de título) ─────
  const obsY = 1320;
  const obsH = 1100;

  drawTitledBox(ctx, "OBSERVAÇÕES DO VEÍCULO", marginX, obsY, leftW, obsH, 20, 22);

  ctx.font = `bold 34px ${FONT_VAL}`;
  ctx.fillStyle = "#000000";
  ctx.fillText(props.observacoesVeiculo || "SEM OBSERVAÇÕES", marginX + 30, obsY + 80);

  // ─── MENSAGENS SENATRAN (Caixa arredondada com cutout de título) ─────────
  const msgY = 2460;
  const msgH = 920;

  drawTitledBox(ctx, "MENSAGENS SENATRAN", marginX, msgY, leftW, msgH, 20, 22);

  ctx.font = `bold 26px ${FONT_LBL}`;
  ctx.fillStyle = "#000000";
  ctx.fillText("Você Sabia?", marginX + 30, msgY + 80);

  ctx.font = `22px ${FONT_LBL}`;
  const line1 = "Na Carteira Digital de Trânsito - CDT, você tem acesso ao CRLV, à CNH e";
  const line2 = "ainda ganha desconto de 40% nas infrações, além de muitos outros";
  const line3 = "serviços de trânsito, sem nenhum custo!";
  ctx.fillText(line1, marginX + 30, msgY + 130);
  ctx.fillText(line2, marginX + 30, msgY + 170);
  ctx.fillText(line3, marginX + 30, msgY + 210);

  ctx.font = `bold 22px ${FONT_LBL}`;
  ctx.fillText("Leia o QR Code e baixe agora.", marginX + 30, msgY + 270);

  // QR Codes dos Apps CDT
  try {
    const cdtQrUrl = await QRCode.toDataURL("https://play.google.com/store/apps/details?id=br.gov.serpro.cnhe", { margin: 1, width: 220 });
    const cdtQrImg = await loadImage(cdtQrUrl);
    ctx.drawImage(cdtQrImg, marginX + 100, msgY + 330, 220, 220);
    ctx.drawImage(cdtQrImg, marginX + 480, msgY + 330, 220, 220);
  } catch {}

  // Badges Google Play e App Store
  ctx.font = `bold 15px ${FONT_LBL}`;
  ctx.fillStyle = "#333333";
  ctx.fillRect(marginX + 90, msgY + 575, 240, 45);
  ctx.fillRect(marginX + 470, msgY + 575, 240, 45);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("Google Play", marginX + 150, msgY + 588);
  ctx.fillText("App Store", marginX + 540, msgY + 588);

  // ─── COLUNA DIREITA (ESPECIFICAÇÕES & PROPRIETÁRIO) ─────────────────────
  const rightX = midX + 40;
  const rightW = PAGE_W - marginX - rightX;

  // CATEGORIA e CAPACIDADE
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillStyle = "#000000";
  ctx.fillText("CATEGORIA", rightX, 270);
  ctx.fillText("CAPACIDADE", rightX + 680, 270);

  ctx.font = `bold 40px ${FONT_VAL}`;
  ctx.fillText((props.categoria || "PARTICULAR").toUpperCase(), rightX, 305);
  ctx.fillText(props.capacidade || "*.*", rightX + 680, 305);

  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(rightX, 355); ctx.lineTo(PAGE_W - marginX, 355); ctx.stroke();

  // POTÊNCIA/CILINDRADA e PESO BRUTO TOTAL
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("POTÊNCIA/CILINDRADA", rightX, 375);
  ctx.fillText("PESO BRUTO TOTAL", rightX + 680, 375);

  ctx.font = `bold 38px ${FONT_VAL}`;
  ctx.fillText((props.potenciaCilindrada || "116CV/2198").toUpperCase(), rightX, 410);
  ctx.fillText(props.pesoBrutoTotal || "1.29", rightX + 680, 410);

  ctx.beginPath(); ctx.moveTo(rightX, 460); ctx.lineTo(PAGE_W - marginX, 460); ctx.stroke();

  // MOTOR, CMT, EIXOS, LOTAÇÃO (4 Colunas)
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("MOTOR", rightX, 480);
  ctx.fillText("CMT", rightX + 530, 480);
  ctx.fillText("EIXOS", rightX + 730, 480);
  ctx.fillText("LOTAÇÃO", rightX + 880, 480);

  ctx.font = `bold 36px ${FONT_VAL}`;
  drawClippedText(ctx, (props.motor || "C20NE31022309V").toUpperCase(), rightX, 515, 500, 36, true, FONT_VAL);
  ctx.fillText(props.cmt || "3.05", rightX + 530, 515);
  ctx.fillText(props.eixos || "2", rightX + 730, 515);
  ctx.fillText(props.lotacao || "05P", rightX + 880, 515);

  ctx.beginPath(); ctx.moveTo(rightX, 565); ctx.lineTo(PAGE_W - marginX, 565); ctx.stroke();

  // CARROCERIA
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("CARROCERIA", rightX, 585);
  ctx.font = `bold 38px ${FONT_VAL}`;
  ctx.fillText((props.carroceria || "NÃO APLICAVEL").toUpperCase(), rightX, 620);

  ctx.beginPath(); ctx.moveTo(rightX, 670); ctx.lineTo(PAGE_W - marginX, 670); ctx.stroke();

  // NOME
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("NOME", rightX, 690);
  drawClippedText(ctx, (props.nome || "ANTONIO CAMILO ALMEIDA FREITAS JUNIOR").toUpperCase(), rightX, 730, rightW, 38, true, FONT_VAL);

  ctx.beginPath(); ctx.moveTo(rightX, 780); ctx.lineTo(PAGE_W - marginX, 780); ctx.stroke();

  // CPF / CNPJ
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("CPF / CNPJ", rightX + 530, 800);
  ctx.font = `bold 38px ${FONT_VAL}`;
  ctx.fillText(props.cpfCnpj || "042.512.909-84", rightX + 530, 840);

  ctx.beginPath(); ctx.moveTo(rightX, 890); ctx.lineTo(PAGE_W - marginX, 890); ctx.stroke();

  // LOCAL e DATA
  ctx.font = `bold 18px ${FONT_LBL}`;
  ctx.fillText("LOCAL", rightX, 910);
  ctx.fillText("DATA", rightX + 730, 910);

  ctx.font = `bold 38px ${FONT_VAL}`;
  drawClippedText(ctx, (props.local || "CURITIBA PR").toUpperCase(), rightX, 950, 700, 38, true, FONT_VAL);
  ctx.fillText(props.dataEmissaoDoc || "21/01/2026", rightX + 730, 950);

  ctx.beginPath(); ctx.moveTo(rightX, 1000); ctx.lineTo(PAGE_W - marginX, 1000); ctx.stroke();

  // Texto de Assinatura Digital do Detran com asterisco *
  ctx.font = `16px ${FONT_LBL}`;
  ctx.fillStyle = "#333333";
  ctx.textAlign = "center";
  ctx.fillText("ASSINADO DIGITALMENTE PELO DETRAN", rightX + (rightW / 2), 1030);
  ctx.font = `bold 24px ${FONT_VAL}`;
  ctx.fillText("*", PAGE_W - marginX - 15, 1030);
  ctx.textAlign = "left";

  // ─── BLOCO: DADOS DO SEGURO DPVAT (Caixa arredondada com cutout) ────────
  const dpvatY = 1060;
  const dpvatH = 430;

  drawTitledBox(ctx, "DADOS DO SEGURO DPVAT", rightX, dpvatY, rightW, dpvatH, 20, 22);

  // Sub-campos DPVAT - Linha 1
  ctx.font = `16px ${FONT_LBL}`;
  ctx.fillStyle = "#000000";
  ctx.fillText("CAT. TARIF", rightX + 20, dpvatY + 50);
  ctx.fillText("DATA DE QUITAÇÃO", rightX + 240, dpvatY + 50);
  ctx.fillText("PAGAMENTO", rightX + 550, dpvatY + 50);

  ctx.font = `bold 24px ${FONT_VAL}`;
  ctx.fillText(props.dpvatCatTarif || "*", rightX + 20, dpvatY + 85);
  ctx.fillText(props.dpvatDataQuitacao || "*", rightX + 240, dpvatY + 85);

  // Checkboxes DPVAT
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rightX + 550, dpvatY + 68, 22, 22);
  ctx.font = `16px ${FONT_LBL}`;
  ctx.fillText("COTA ÚNICA", rightX + 582, dpvatY + 85);

  ctx.strokeRect(rightX + 730, dpvatY + 68, 22, 22);
  ctx.fillText("PARCELADO", rightX + 762, dpvatY + 85);

  if (props.dpvatPagamento === "COTA ÚNICA") {
    ctx.font = `bold 20px ${FONT_VAL}`;
    ctx.fillText("X", rightX + 554, dpvatY + 86);
  } else if (props.dpvatPagamento === "PARCELADO") {
    ctx.font = `bold 20px ${FONT_VAL}`;
    ctx.fillText("X", rightX + 734, dpvatY + 86);
  }

  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rightX, dpvatY + 120); ctx.lineTo(PAGE_W - marginX, dpvatY + 120); ctx.stroke();

  // Linha 2 DPVAT
  ctx.font = `15px ${FONT_LBL}`;
  ctx.fillText("REPASSE OBRIGATÓRIO AO", rightX + 20, dpvatY + 145);
  ctx.fillText("FUNDO NACIONAL DE SAÚDE (R$)", rightX + 20, dpvatY + 167);
  ctx.font = `bold 24px ${FONT_VAL}`;
  ctx.fillText(props.dpvatRepasseFns || "*", rightX + 20, dpvatY + 205);

  ctx.font = `15px ${FONT_LBL}`;
  ctx.fillText("CUSTO DO", rightX + 410, dpvatY + 145);
  ctx.fillText("BILHETE (R$)", rightX + 410, dpvatY + 167);
  ctx.font = `bold 24px ${FONT_VAL}`;
  ctx.fillText(props.dpvatCustoBilhete || "*", rightX + 410, dpvatY + 205);

  ctx.font = `15px ${FONT_LBL}`;
  ctx.fillText("CUSTO EFETIVO", rightX + 700, dpvatY + 145);
  ctx.fillText("DO SEGURO (R$)", rightX + 700, dpvatY + 167);
  ctx.font = `bold 24px ${FONT_VAL}`;
  ctx.fillText(props.dpvatCustoEfetivo || "*", rightX + 700, dpvatY + 205);

  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rightX, dpvatY + 240); ctx.lineTo(PAGE_W - marginX, dpvatY + 240); ctx.stroke();

  // Linha 3 DPVAT
  ctx.font = `15px ${FONT_LBL}`;
  ctx.fillText("REPASSE OBRIGATÓRIO AO", rightX + 20, dpvatY + 265);
  ctx.fillText("DEPARTAMENTO NACIONAL DE", rightX + 20, dpvatY + 287);
  ctx.fillText("TRÂNSITO (R$)", rightX + 20, dpvatY + 309);
  ctx.font = `bold 24px ${FONT_VAL}`;
  ctx.fillText(props.dpvatRepasseDenatran || "*", rightX + 20, dpvatY + 355);

  ctx.font = `15px ${FONT_LBL}`;
  ctx.fillText("VALOR DO IOF (R$)", rightX + 410, dpvatY + 265);
  ctx.font = `bold 24px ${FONT_VAL}`;
  ctx.fillText(props.dpvatValorIof || "*", rightX + 410, dpvatY + 355);

  ctx.font = `15px ${FONT_LBL}`;
  ctx.fillText("VALOR TOTAL A SER PAGO", rightX + 700, dpvatY + 265);
  ctx.fillText("PELO SEGURADO (R$)", rightX + 700, dpvatY + 287);
  ctx.font = `bold 24px ${FONT_VAL}`;
  ctx.fillText(props.dpvatValorTotal || "*", rightX + 700, dpvatY + 355);

  // ─── BLOCO: INFORMAÇÕES DO SEGURO DPVAT (Coluna Direita Fundo) ────────────
  const infY = 1520;
  const infH = 1860;

  drawTitledBox(ctx, "INFORMAÇÕES DO SEGURO DPVAT", rightX, infY, rightW, infH, 20, 22);

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
