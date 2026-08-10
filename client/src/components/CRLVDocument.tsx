/**
 * CRLVDocument — Geração visual 1:1 do Certificado de Registro e Licenciamento de Veículo (CRLV Digital A4 @300DPI)
 *
 * Espelhamento forense e estrutural do CRLV oficial SENATRAN / DETRAN
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
  fontFamily = "Arial, sans-serif"
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

  // 1. Fundo Branco Absoluto
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // Carregar Logos de Referência se disponíveis
  let brasaoImg: HTMLImageElement | null = null;
  let govbrImg: HTMLImageElement | null = null;

  try {
    brasaoImg = await loadImage("/assets/brasao_republica.png");
  } catch {
    try { brasaoImg = await loadImage("/assets/brasao_republica_federal.jpg"); } catch {}
  }
  try {
    govbrImg = await loadImage("/img/logo.png");
  } catch {}

  // ─── CABEÇALHO ─────────────────────────────────────────────────────────────
  const marginX = 70;
  const midX = PAGE_W / 2; // 1240.5

  // Brasão da República (Top Left)
  if (brasaoImg) {
    ctx.drawImage(brasaoImg, marginX, 60, 150, 150);
  }

  // Texto República / SENATRAN
  ctx.fillStyle = "#000000";
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("REPÚBLICA FEDERATIVA DO BRASIL", marginX + 175, 75);

  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillStyle = "#222222";
  ctx.fillText("MINISTÉRIO DOS TRANSPORTES SECRETARIA NACIONAL DE", marginX + 175, 115);
  ctx.fillText("TRÂNSITO - SENATRAN", marginX + 175, 143);

  // Logo gov.br (Top Right)
  if (govbrImg) {
    ctx.drawImage(govbrImg, PAGE_W - marginX - 190, 75, 190, 70);
  } else {
    ctx.font = "bold italic 42px Arial, sans-serif";
    ctx.fillStyle = "#002B5C";
    ctx.textAlign = "right";
    ctx.fillText("gov.br", PAGE_W - marginX, 75);
    ctx.textAlign = "left";
  }

  // DETRAN- UF e Título
  const ufDetran = (props.detranUF || props.emissaoDetranUF || "PR").toUpperCase();
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillStyle = "#333333";
  ctx.fillText(`DETRAN- ${ufDetran}`, marginX, 230);

  ctx.font = "bold 32px Arial, sans-serif";
  ctx.fillStyle = "#000000";
  ctx.fillText("CERTIFICADO DE REGISTRO E LICENCIAMENTO DE VEÍCULO - DIGITAL", marginX, 260);

  // Linha Separadora Horizontal abaixo do título
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(marginX, 310);
  ctx.lineTo(PAGE_W - marginX, 310);
  ctx.stroke();

  // Linha Vertical Dotted (Pontilhada Central)
  ctx.save();
  ctx.strokeStyle = "#444444";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(midX, 310);
  ctx.lineTo(midX, 1780);
  ctx.stroke();
  ctx.restore();

  // ─── COLUNA ESQUERDA (DADOS DO VEÍCULO) ───────────────────────────────────
  const leftW = midX - marginX - 40; // ~1130px

  // CÓDIGO RENAVAM
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillStyle = "#000000";
  ctx.fillText("CÓDIGO RENAVAM", marginX, 335);

  ctx.font = "bold 44px Arial, sans-serif";
  ctx.fillText(props.renavam || "00278581161", marginX, 370);

  // QR CODE BOX (lado direito da coluna esquerda)
  const qrSize = 420;
  const qrX = marginX + leftW - qrSize;
  const qrY = 330;

  // Gerar QR Code Canvas
  const crlvBaseUrl = "https://consulta-vio-crlv.pages.dev";
  const qrVal = props.codigoQR && props.codigoQR !== "PREVIEW"
    ? (props.codigoQR.startsWith("http") ? props.codigoQR : `${crlvBaseUrl}/?codigo=${encodeURIComponent(props.codigoQR)}`)
    : `${crlvBaseUrl}/?codigo=BDC8CA0686D839EE1CB1CB2E84D05F63`;

  try {
    const qrDataUrl = await QRCode.toDataURL(qrVal, { margin: 1, width: qrSize, errorCorrectionLevel: "M" });
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  } catch (e) {
    ctx.strokeStyle = "#000000";
    ctx.strokeRect(qrX, qrY, qrSize, qrSize);
  }

  // Texto Vertical ao lado do QR Code: "Valide este QRCode com app Vio"
  ctx.save();
  ctx.translate(qrX + qrSize + 28, qrY + qrSize);
  ctx.rotate(-Math.PI / 2);
  ctx.font = "19px Arial, sans-serif";
  ctx.fillStyle = "#000000";
  ctx.fillText("Valide este QRCode com app Vio", 0, 0);
  ctx.restore();

  // PLACA e EXERCÍCIO
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("PLACA", marginX, 470);
  ctx.fillText("EXERCÍCIO", marginX + 340, 470);

  ctx.font = "bold 42px Arial, sans-serif";
  ctx.fillText((props.placa || "MPK5502").toUpperCase(), marginX, 505);
  ctx.fillText(props.exercicio || "2026", marginX + 340, 505);

  // Linha horizontal interna
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(marginX, 560); ctx.lineTo(qrX - 20, 560); ctx.stroke();

  // ANO FABRICAÇÃO e ANO MODELO
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("ANO FABRICAÇÃO", marginX, 580);
  ctx.fillText("ANO MODELO", marginX + 340, 580);

  ctx.font = "bold 42px Arial, sans-serif";
  ctx.fillText(props.anoFabricacao || "1993", marginX, 615);
  ctx.fillText(props.anoModelo || "1993", marginX + 340, 615);

  // Linha horizontal interna
  ctx.beginPath(); ctx.moveTo(marginX, 670); ctx.lineTo(qrX - 20, 670); ctx.stroke();

  // NÚMERO DO CRV
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("NÚMERO DO CRV", marginX, 690);
  ctx.font = "bold 42px Arial, sans-serif";
  ctx.fillText(props.numeroCRV || "***", marginX, 725);

  // Linha separadora completa abaixo do bloco superior do QR Code
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(marginX, 770); ctx.lineTo(midX - 30, 770); ctx.stroke();

  // CÓDIGO DE SEGURANÇA DO CLA e CAT
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("CÓDIGO DE SEGURANÇA DO CLA", marginX, 795);
  ctx.fillText("CAT", marginX + 640, 795);

  ctx.font = "bold 40px Arial, sans-serif";
  ctx.fillText(props.codigoSegurancaCLA || "66545815734", marginX, 835);
  ctx.fillText(props.cat || "***", marginX + 640, 835);

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(marginX, 875); ctx.lineTo(midX - 30, 875); ctx.stroke();

  // MARCA / MODELO / VERSÃO
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("MARCA / MODELO / VERSÃO", marginX, 900);
  drawClippedText(ctx, (props.marcaModeloVersao || "GM/OMEGA GLS").toUpperCase(), marginX, 940, leftW, 40, true);

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(marginX, 980); ctx.lineTo(midX - 30, 980); ctx.stroke();

  // ESPÉCIE / TIPO
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("ESPÉCIE / TIPO", marginX, 1005);
  drawClippedText(ctx, (props.especieTipo || "PASSAGEIRO AUTOMOVEL").toUpperCase(), marginX, 1045, leftW, 40, true);

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(marginX, 1085); ctx.lineTo(midX - 30, 1085); ctx.stroke();

  // PLACA ANTERIOR / UF e CHASSI
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("PLACA ANTERIOR / UF", marginX, 1110);
  ctx.fillText("CHASSI", marginX + 480, 1110);

  ctx.font = "bold 38px Arial, sans-serif";
  ctx.fillText((props.placaAnteriorUF || "*******/**").toUpperCase(), marginX, 1150);
  drawClippedText(ctx, (props.chassi || "9BGVP19BPPB233276").toUpperCase(), marginX + 480, 1150, leftW - 480, 38, true);

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(marginX, 1190); ctx.lineTo(midX - 30, 1190); ctx.stroke();

  // COR PREDOMINANTE e COMBUSTÍVEL
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("COR PREDOMINANTE", marginX, 1215);
  ctx.fillText("COMBUSTÍVEL", marginX + 380, 1215);

  ctx.font = "bold 40px Arial, sans-serif";
  ctx.fillText((props.corPredominante || "PRETA").toUpperCase(), marginX, 1255);
  ctx.fillText((props.combustivel || "GASOLINA").toUpperCase(), marginX + 380, 1255);

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(marginX, 1295); ctx.lineTo(midX - 30, 1295); ctx.stroke();

  // Linha de Rodapé de Emissão
  const ufEmi = (props.emissaoDetranUF || props.detranUF || "SE").toUpperCase();
  const hashEmi = props.emissaoDetranHash || "D72C8C94ED88BF41";
  const dataEmiStr = props.emissaoDataHora || "30/06/2026 às 14:11:30";
  ctx.font = "17px Arial, sans-serif";
  ctx.fillStyle = "#222222";
  ctx.fillText(`Documento emitido por DETRAN ${ufEmi} (${hashEmi}) em ${dataEmiStr}.`, marginX, 1320);

  // ─── COLUNA DIREITA (ESPECIFICAÇÕES & PROPRIETÁRIO) ─────────────────────
  const rightX = midX + 40;
  const rightW = PAGE_W - marginX - rightX;

  // CATEGORIA e CAPACIDADE
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillStyle = "#000000";
  ctx.fillText("CATEGORIA", rightX, 335);
  ctx.fillText("CAPACIDADE", rightX + 680, 335);

  ctx.font = "bold 42px Arial, sans-serif";
  ctx.fillText((props.categoria || "PARTICULAR").toUpperCase(), rightX, 375);
  ctx.fillText(props.capacidade || "*.*", rightX + 680, 375);

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(rightX, 420); ctx.lineTo(PAGE_W - marginX, 420); ctx.stroke();

  // POTÊNCIA/CILINDRADA e PESO BRUTO TOTAL
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("POTÊNCIA/CILINDRADA", rightX, 445);
  ctx.fillText("PESO BRUTO TOTAL", rightX + 680, 445);

  ctx.font = "bold 40px Arial, sans-serif";
  ctx.fillText((props.potenciaCilindrada || "116CV/2198").toUpperCase(), rightX, 485);
  ctx.fillText(props.pesoBrutoTotal || "1.29", rightX + 680, 485);

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(rightX, 530); ctx.lineTo(PAGE_W - marginX, 530); ctx.stroke();

  // MOTOR, CMT, EIXOS, LOTAÇÃO
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("MOTOR", rightX, 555);
  ctx.fillText("CMT", rightX + 540, 555);
  ctx.fillText("EIXOS", rightX + 740, 555);
  ctx.fillText("LOTAÇÃO", rightX + 890, 555);

  ctx.font = "bold 38px Arial, sans-serif";
  drawClippedText(ctx, (props.motor || "C20NE31022309V").toUpperCase(), rightX, 595, 520, 38, true);
  ctx.fillText(props.cmt || "3.05", rightX + 540, 595);
  ctx.fillText(props.eixos || "2", rightX + 740, 595);
  ctx.fillText(props.lotacao || "05P", rightX + 890, 595);

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(rightX, 640); ctx.lineTo(PAGE_W - marginX, 640); ctx.stroke();

  // CARROCERIA
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("CARROCERIA", rightX, 665);
  ctx.font = "bold 40px Arial, sans-serif";
  ctx.fillText((props.carroceria || "NÃO APLICAVEL").toUpperCase(), rightX, 705);

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(rightX, 750); ctx.lineTo(PAGE_W - marginX, 750); ctx.stroke();

  // NOME
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("NOME", rightX, 775);
  drawClippedText(ctx, (props.nome || "ANTONIO CAMILO ALMEIDA FREITAS JUNIOR").toUpperCase(), rightX, 815, rightW, 40, true);

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(rightX, 860); ctx.lineTo(PAGE_W - marginX, 860); ctx.stroke();

  // CPF / CNPJ
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("CPF / CNPJ", rightX + 540, 885);
  ctx.font = "bold 40px Arial, sans-serif";
  ctx.fillText(props.cpfCnpj || "042.512.909-84", rightX + 540, 925);

  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(rightX, 970); ctx.lineTo(PAGE_W - marginX, 970); ctx.stroke();

  // LOCAL e DATA
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("LOCAL", rightX, 995);
  ctx.fillText("DATA", rightX + 740, 995);

  ctx.font = "bold 40px Arial, sans-serif";
  drawClippedText(ctx, (props.local || "CURITIBA PR").toUpperCase(), rightX, 1035, 700, 40, true);
  ctx.fillText(props.dataEmissaoDoc || "21/01/2026", rightX + 740, 1035);

  // Assinatura Digital do Detran
  ctx.font = "18px Arial, sans-serif";
  ctx.fillStyle = "#333333";
  ctx.textAlign = "center";
  ctx.fillText("ASSINADO DIGITALMENTE PELO DETRAN", rightX + (rightW / 2), 1100);
  ctx.textAlign = "left";

  // ─── BLOCO: DADOS DO SEGURO DPVAT (Coluna Direita Meio) ───────────────────
  const dpvatY = 1140;
  const dpvatH = 430;

  // Caixa externa
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#333333";
  ctx.strokeRect(rightX, dpvatY, rightW, dpvatH);

  // Título embutido
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillStyle = "#000000";
  ctx.fillText("DADOS DO SEGURO DPVAT", rightX + 15, dpvatY + 30);

  // Sub-campos DPVAT
  ctx.font = "18px Arial, sans-serif";
  ctx.fillText("CAT. TARIF", rightX + 15, dpvatY + 75);
  ctx.fillText("DATA DE QUITAÇÃO", rightX + 220, dpvatY + 75);
  ctx.fillText("PAGAMENTO", rightX + 540, dpvatY + 75);

  // Val
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(props.dpvatCatTarif || "*", rightX + 15, dpvatY + 110);
  ctx.fillText(props.dpvatDataQuitacao || "*", rightX + 220, dpvatY + 110);

  // Checkboxes
  ctx.strokeRect(rightX + 540, dpvatY + 92, 24, 24);
  ctx.font = "18px Arial, sans-serif";
  ctx.fillText("COTA ÚNICA", rightX + 575, dpvatY + 110);

  ctx.strokeRect(rightX + 730, dpvatY + 92, 24, 24);
  ctx.fillText("PARCELADO", rightX + 765, dpvatY + 110);

  if (props.dpvatPagamento === "COTA ÚNICA") {
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.fillText("X", rightX + 544, dpvatY + 111);
  } else if (props.dpvatPagamento === "PARCELADO") {
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.fillText("X", rightX + 734, dpvatY + 111);
  }

  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rightX, dpvatY + 140); ctx.lineTo(PAGE_W - marginX, dpvatY + 140); ctx.stroke();

  // Linha 2
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("REPASSE OBRIGATÓRIO AO", rightX + 15, dpvatY + 168);
  ctx.fillText("FUNDO NACIONAL DE SAÚDE (R$)", rightX + 15, dpvatY + 190);
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(props.dpvatRepasseFns || "*", rightX + 15, dpvatY + 230);

  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("CUSTO DO", rightX + 410, dpvatY + 168);
  ctx.fillText("BILHETE (R$)", rightX + 410, dpvatY + 190);
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(props.dpvatCustoBilhete || "*", rightX + 410, dpvatY + 230);

  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("CUSTO EFETIVO", rightX + 700, dpvatY + 168);
  ctx.fillText("DO SEGURO (R$)", rightX + 700, dpvatY + 190);
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(props.dpvatCustoEfetivo || "*", rightX + 700, dpvatY + 230);

  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(rightX, dpvatY + 260); ctx.lineTo(PAGE_W - marginX, dpvatY + 260); ctx.stroke();

  // Linha 3
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("REPASSE OBRIGATÓRIO AO", rightX + 15, dpvatY + 288);
  ctx.fillText("DEPARTAMENTO NACIONAL DE", rightX + 15, dpvatY + 310);
  ctx.fillText("TRÂNSITO (R$)", rightX + 15, dpvatY + 332);
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(props.dpvatRepasseDenatran || "*", rightX + 15, dpvatY + 375);

  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("VALOR DO IOF (R$)", rightX + 410, dpvatY + 288);
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(props.dpvatValorIof || "*", rightX + 410, dpvatY + 375);

  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("VALOR TOTAL A SER PAGO", rightX + 700, dpvatY + 288);
  ctx.fillText("PELO SEGURADO (R$)", rightX + 700, dpvatY + 310);
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText(props.dpvatValorTotal || "*", rightX + 700, dpvatY + 375);

  // ─── BLOCO: OBSERVAÇÕES DO VEÍCULO (Coluna Esquerda Baixo) ───────────────
  const obsY = 1380;
  const obsH = 1200;
  const radius = 24;

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#333333";
  ctx.beginPath();
  ctx.roundRect(marginX, obsY, leftW, obsH, radius);
  ctx.stroke();

  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillStyle = "#000000";
  ctx.fillText("OBSERVAÇÕES DO VEÍCULO", marginX + 30, obsY + 45);

  ctx.font = "bold 36px Arial, sans-serif";
  ctx.fillText(props.observacoesVeiculo || "SEM OBSERVAÇÕES", marginX + 30, obsY + 110);

  // ─── BLOCO: MENSAGENS SENATRAN (Coluna Esquerda Fundo) ───────────────────
  const msgY = 2620;
  const msgH = 800;

  ctx.beginPath();
  ctx.roundRect(marginX, msgY, leftW, msgH, radius);
  ctx.stroke();

  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText("MENSAGENS SENATRAN", marginX + 30, msgY + 45);

  ctx.font = "bold 26px Arial, sans-serif";
  ctx.fillText("Você Sabia?", marginX + 30, msgY + 100);

  ctx.font = "22px Arial, sans-serif";
  const line1 = "Na Carteira Digital de Trânsito - CDT, você tem acesso ao CRLV, à CNH e";
  const line2 = "ainda ganha desconto de 40% nas infrações, além de muitos outros";
  const line3 = "serviços de trânsito, sem nenhum custo!";
  ctx.fillText(line1, marginX + 30, msgY + 150);
  ctx.fillText(line2, marginX + 30, msgY + 190);
  ctx.fillText(line3, marginX + 30, msgY + 230);

  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText("Leia o QR Code e baixe agora.", marginX + 30, msgY + 300);

  // Gerar QR Codes para Google Play e App Store
  try {
    const cdtQrUrl = await QRCode.toDataURL("https://play.google.com/store/apps/details?id=br.gov.serpro.cnhe", { margin: 1, width: 220 });
    const cdtQrImg = await loadImage(cdtQrUrl);
    ctx.drawImage(cdtQrImg, marginX + 80, msgY + 360, 220, 220);
    ctx.drawImage(cdtQrImg, marginX + 380, msgY + 360, 220, 220);
  } catch {}

  // Textos explicativos dos Apps
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillText("Google Play", marginX + 130, msgY + 605);
  ctx.fillText("App Store", marginX + 440, msgY + 605);

  // ─── BLOCO: INFORMAÇÕES DO SEGURO DPVAT (Coluna Direita Fundo) ────────────
  const infY = 1600;
  const infH = 1820;

  ctx.beginPath();
  ctx.roundRect(rightX, infY, rightW, infH, radius);
  ctx.stroke();

  ctx.font = "bold 22px Arial, sans-serif";
  ctx.fillText("INFORMAÇÕES DO SEGURO DPVAT", rightX + 30, infY + 45);

  if (props.informacoesDpvat) {
    ctx.font = "24px Arial, sans-serif";
    const lines = props.informacoesDpvat.split("\n");
    let ly = infY + 110;
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
    ctx.font = "bold 90px Arial, sans-serif";
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
