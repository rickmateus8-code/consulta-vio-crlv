import { useEffect, useRef } from "react";
import { generateQRCodeDataURL } from "@/lib/qrCodeEngine";
import { gerarMRZ } from "@/lib/cnh/mrz";
import { getCNHValidationUrl } from "@/lib/cnh/validation";
import {
  WALLET_FRONT_LAYOUT, WALLET_FRONT_ELEMENTS,
  WALLET_BACK_LAYOUT,  WALLET_BACK_ELEMENTS,
  type TextElement, type CompositeTextElement, type ImageElement, type RectElement,
} from "@/lib/cnh/walletGeometry";

export interface CNH3PartDocumentProps {
  id?: string;
  slide: 1 | 2 | 3 | 4; // 1: Frente, 2: Verso, 3: MRZ, 4: QR Code VIO
  nome: string;
  cpf: string;
  rg?: string;
  orgaoEmissor?: string;
  ufRG?: string;
  sexo?: string;
  nacionalidade?: string;
  dataNascimento?: string;
  localNascimento?: string;
  ufNascimento?: string;
  nomePai?: string;
  nomeMae?: string;
  categoria?: string;
  registro?: string;
  espelho?: string;
  validade?: string;
  dataEmissao?: string;
  primeiraHabilitacao?: string;
  localEmissao?: string;
  ufEmissao?: string;
  observacoes?: string;
  fotoUrl?: string;
  assinaturaUrl?: string;
  codigoQR?: string;
  codigo_validacao?: string;
  codigo_qr?: string;
  qrCodeUrl?: string;
  assDigital1?: string;
  assDigital2?: string;
  previewWidth?: number;
}

const ESTADOS_POR_EXTENSO: Record<string, string> = {
  AC: "ACRE", AL: "ALAGOAS", AP: "AMAPÁ", AM: "AMAZONAS", BA: "BAHIA",
  CE: "CEARÁ", DF: "DISTRITO FEDERAL", ES: "ESPÍRITO SANTO", GO: "GOIÁS",
  MA: "MARANHÃO", MT: "MATO GROSSO", MS: "MATO GROSSO DO SUL", MG: "MINAS GERAIS",
  PA: "PARÁ", PB: "PARAIBA", PR: "PARANÁ", PE: "PERNAMBUCO", PI: "PIAUÍ",
  RJ: "RIO DE JANEIRO", RN: "RIO GRANDE DO NORTE", RS: "RIO GRANDE DO SUL",
  RO: "RONDÔNIA", RR: "RORAIMA", SC: "SANTA CATARINA", SP: "SÃO PAULO",
  SE: "SERGIPE", TO: "TOCANTINS"
};

function fmtDate(d?: string): string {
  if (!d) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, dd] = d.slice(0, 10).split("-");
    return `${dd}/${m}/${y}`;
  }
  return d;
}

function formatCPF(v?: string): string {
  if (!v) return "";
  const d = v.replace(/\D/g, "");
  if (d.length !== 11) return v;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// ─── Geração MRZ (OCR-B) ─────────────────────────────────────────────────────
// Implementação centralizada em @/lib/cnh/mrz — gerarMRZ importado acima.

// ─── Helper de fonte para walletGeometry ─────────────────────────────────────
// Converte FontSpec declarativo em string CSS de canvas. Permanece no renderer.
function gFont(el: { font: { weight: string; size: number; family: string } }): string {
  return `${el.font.weight} ${el.font.size}px ${el.font.family}`;
}

async function drawCleanSignature(
  ctx: CanvasRenderingContext2D,
  imgUrl: string,
  x: number,
  y: number,
  width: number,
  height: number
) {
  try {
    const assImg = new Image();
    assImg.crossOrigin = "anonymous";
    assImg.src = imgUrl;
    await new Promise((res) => { assImg.onload = res; assImg.onerror = res; });
    
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = assImg.width;
    tempCanvas.height = assImg.height;
    const tctx = tempCanvas.getContext("2d");
    if (!tctx) return;
    
    tctx.drawImage(assImg, 0, 0);
    const imgData = tctx.getImageData(0, 0, assImg.width, assImg.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if (a < 30 || (r > 160 && g > 160 && b > 160)) {
        data[i+3] = 0;
      } else {
        data[i] = 0;
        data[i+1] = 0;
        data[i+2] = 0;
        const luminance = (r + g + b) / 3;
        const factor = Math.max(0, (160 - luminance) / 160);
        data[i+3] = Math.round(a * factor);
      }
    }
    tctx.putImageData(imgData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tempCanvas, x, y, width, height);
  } catch {}
}

export default function CNH3PartDocument(props: CNH3PartDocumentProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { slide } = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isMounted = true;

    const render = async () => {
      if (slide === 4) {
        // --- SLIDE 4: QR CODE VIO OFICIAL DO /CNHCRIA (SQUARE 680x680) ---
        const W = 680;
        const H = 680;
        canvas.width = W;
        canvas.height = H;

        ctx.fillStyle = "#c8cbd0";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(40, 40, 600, 600);

        let codigoQrFinal = props.codigo_validacao || props.codigo_qr || props.codigoQR || props.id || "";
        let qrUrl = "";
        if (props.qrCodeUrl && props.qrCodeUrl.startsWith("http")) {
          qrUrl = props.qrCodeUrl;
        } else if (codigoQrFinal.startsWith("http")) {
          qrUrl = codigoQrFinal;
        } else {
          if (!codigoQrFinal || codigoQrFinal.includes(".")) {
            codigoQrFinal = props.id || "31c64778-606e-436e-9f9d-287574f23abe";
          }
          qrUrl = getCNHValidationUrl(codigoQrFinal);
        }

        try {
          const qrDataUrl = await generateQRCodeDataURL({
            data: qrUrl,
            intensity: 3,
            size: 520,
            margin: 2,
            errorCorrectionLevel: "H"
          });
          const qrImg = new Image();
          qrImg.src = qrDataUrl;
          await new Promise((res) => { qrImg.onload = res; qrImg.onerror = res; });
          if (isMounted) {
            ctx.drawImage(qrImg, 80, 80, 520, 520);
          }
        } catch {
          const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=520x520&data=${encodeURIComponent(qrUrl)}`;
          const qrImg = new Image();
          qrImg.crossOrigin = "anonymous";
          qrImg.src = fallbackUrl;
          await new Promise((res) => { qrImg.onload = res; qrImg.onerror = res; });
          if (isMounted) {
            ctx.drawImage(qrImg, 80, 80, 520, 520);
          }
        }
        return;
      }

      // --- SLIDES 1, 2, 3: CARDS PORTRAIT COM POSICIONAMENTO ESTRITO A ESQUERDA (680x963) ---
      const W = 680;
      const H = 963;
      canvas.width = W;
      canvas.height = H;

      ctx.clearRect(0, 0, W, H);

      const off = document.createElement("canvas");
      off.width = 963;
      off.height = 680;
      const octx = off.getContext("2d");
      if (!octx) return;

      if (slide === 1) {
        // --- SLIDE 1: FRENTE (PARTE SUPERIOR) — geometria via WALLET_FRONT_LAYOUT ---
        const bgImg = new Image();
        bgImg.src = WALLET_FRONT_LAYOUT.background;
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        octx.drawImage(bgImg, 0, 0, WALLET_FRONT_LAYOUT.sourceWidth, WALLET_FRONT_LAYOUT.sourceHeight);

        const FE = WALLET_FRONT_ELEMENTS;

        // 1. MOLDURA DA FOTO 3X4 COM ENQUADRAMENTO BRANCO PURO
        const fPhotoFrame = FE["front.photoFrame"] as RectElement;
        octx.fillStyle = fPhotoFrame.color;
        octx.fillRect(fPhotoFrame.x, fPhotoFrame.y, fPhotoFrame.width, fPhotoFrame.height);

        // Foto 3x4 do Condutor com recorte perfeito na moldura
        if (props.fotoUrl) {
          try {
            const foto = new Image();
            foto.crossOrigin = "anonymous";
            foto.src = props.fotoUrl;
            await new Promise((res) => { foto.onload = res; foto.onerror = res; });
            if (isMounted) {
              const fPhoto = FE["front.photo"] as ImageElement;
              octx.save();
              octx.beginPath();
              octx.rect(fPhoto.clip!.x, fPhoto.clip!.y, fPhoto.clip!.width, fPhoto.clip!.height);
              octx.clip();
              octx.drawImage(foto, fPhoto.x, fPhoto.y, fPhoto.width, fPhoto.height);
              octx.restore();
            }
          } catch {}
        }

        // Assinatura do Condutor com tratamento de transparência forense
        if (props.assinaturaUrl) {
          const fAss = FE["front.assinatura"] as ImageElement;
          await drawCleanSignature(octx, props.assinaturaUrl, fAss.x, fAss.y, fAss.width, fAss.height);
        }

        // 2. NÚMERO DO ESPELHO / FORMULÁRIO (TOPO ESQUERDO)
        const fEspelho = FE["front.espelho"] as TextElement;
        octx.fillStyle = fEspelho.color;
        octx.font = gFont(fEspelho);
        octx.fillText(props.espelho || props.registro || "5728237792", fEspelho.x, fEspelho.y);

        // 3. MAPEAMENTO DE CAMPOS DE TEXTO DA FRENTE (PARIDADE 1:1 COM /CNHCRIA)
        const fNome = FE["front.nome"] as TextElement;
        octx.fillStyle = fNome.color;
        octx.font = gFont(fNome);

        // Campo 1 e 2: Nome e Sobrenome
        octx.fillText((props.nome || "").toUpperCase(), fNome.x, fNome.y);

        // Campo 1ª Habilitação
        const fPrimHab = FE["front.primeiraHabilitacao"] as TextElement;
        octx.fillText(fmtDate(props.primeiraHabilitacao || props.dataEmissao), fPrimHab.x, fPrimHab.y);

        // Campo 3: Data, Local e UF de Nascimento
        const fNasc = FE["front.nascimento"] as CompositeTextElement;
        const localNasc = [props.dataNascimento ? fmtDate(props.dataNascimento) : "", props.localNascimento || "BRASÍLIA", props.ufNascimento || "DF"].filter(Boolean).join(" - ");
        octx.fillText(localNasc.toUpperCase(), fNasc.x, fNasc.y);

        // Campo 4a: Data de Emissão
        const fEmissao = FE["front.dataEmissao"] as TextElement;
        octx.fillText(fmtDate(props.dataEmissao), fEmissao.x, fEmissao.y);

        // Campo 4b: Validade (Cor Vermelha de Segurança Oficial)
        const fValidade = FE["front.validade"] as TextElement;
        octx.fillStyle = fValidade.color;
        octx.fillText(fmtDate(props.validade), fValidade.x, fValidade.y);
        octx.fillStyle = fNome.color; // reset → preto

        // Campo 4c: Doc Identidade / Órgão Emissor / UF
        const fDocId = FE["front.docIdentidade"] as CompositeTextElement;
        const docId = [props.rg || "0000000", props.orgaoEmissor || "SSP", props.ufRG || props.ufEmissao || "DF"].filter(Boolean).join(" ");
        octx.fillText(docId.toUpperCase(), fDocId.x, fDocId.y);

        // Campo 4d: CPF
        const fCpf = FE["front.cpf"] as TextElement;
        octx.fillText(formatCPF(props.cpf), fCpf.x, fCpf.y);

        // Campo 5: Nº Registro (Cor Vermelha de Segurança Oficial)
        const fRegistro = FE["front.registro"] as TextElement;
        octx.fillStyle = fRegistro.color;
        octx.fillText(props.registro || "00000000000", fRegistro.x, fRegistro.y);

        // Campo 9: Categoria (Cor Vermelha de Segurança Oficial)
        const fCat = FE["front.categoria"] as TextElement;
        octx.fillText((props.categoria || "AB").toUpperCase(), fCat.x, fCat.y);
        octx.fillStyle = fNome.color; // reset → preto

        // Nacionalidade
        const fNac = FE["front.nacionalidade"] as TextElement;
        octx.fillText((props.nacionalidade || "BRASILEIRA").toUpperCase(), fNac.x, fNac.y);

        // Filiação (Nome da Mãe e do Pai)
        const fMae = FE["front.nomeMae"] as TextElement;
        octx.font = gFont(fMae);
        if (props.nomeMae) octx.fillText(props.nomeMae.toUpperCase(), fMae.x, fMae.y);
        const fPai = FE["front.nomePai"] as TextElement;
        if (props.nomePai) octx.fillText(props.nomePai.toUpperCase(), fPai.x, fPai.y);

      } else if (slide === 2) {
        // --- SLIDE 2: VERSO (PARTE INFERIOR) — geometria via WALLET_BACK_LAYOUT ---
        const bgImg = new Image();
        bgImg.src = WALLET_BACK_LAYOUT.background;
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        octx.drawImage(bgImg, 0, 0, WALLET_BACK_LAYOUT.sourceWidth, WALLET_BACK_LAYOUT.sourceHeight);

        const BE = WALLET_BACK_ELEMENTS;

        // Número do Espelho (Topo)
        const bEspelho = BE["back.espelho"] as TextElement;
        octx.fillStyle = bEspelho.color;
        octx.font = gFont(bEspelho);
        octx.fillText(props.espelho || props.registro || "5728237792", bEspelho.x, bEspelho.y);

        // Nome do Estado por Extenso
        const ufSigla = (props.ufEmissao || "SP").toUpperCase();
        const estadoExtenso = ESTADOS_POR_EXTENSO[ufSigla] || "SÃO PAULO";
        const bEstado = BE["back.estadoExtenso"] as TextElement;
        octx.font = gFont(bEstado);
        octx.fillText(estadoExtenso, bEstado.x, bEstado.y);

        // Datas da Tabela de Categorias (Vermelho, condicional por categoria)
        const bValidA = BE["back.validadeA"] as TextElement;
        octx.font = gFont(bValidA);
        octx.fillStyle = bValidA.color;
        const catStr = (props.categoria || "AB").toUpperCase();
        const validFmt = fmtDate(props.validade);

        const bValidB = BE["back.validadeB"] as TextElement;
        const bValidC = BE["back.validadeC"] as TextElement;
        const bValidD = BE["back.validadeD"] as TextElement;
        if (catStr.includes("A")) octx.fillText(validFmt, bValidA.x, bValidA.y);
        if (catStr.includes("B")) octx.fillText(validFmt, bValidB.x, bValidB.y);
        if (catStr.includes("C")) octx.fillText(validFmt, bValidC.x, bValidC.y);
        if (catStr.includes("D")) octx.fillText(validFmt, bValidD.x, bValidD.y);
        octx.fillStyle = bEspelho.color; // reset → preto

        // Campo 12: Observações (EAR)
        const bObs = BE["back.observacoes"] as TextElement;
        octx.font = gFont(bObs);
        const obs = (props.observacoes || "EXERCE ATIVIDADE REMUNERADA").toUpperCase();
        octx.fillText(obs, bObs.x, bObs.y);

        // Local e UF de Emissão
        const bLocal = BE["back.localEmissao"] as CompositeTextElement;
        const localUF = `${(props.localEmissao || "BRASÍLIA").toUpperCase()}, ${ufSigla}`;
        octx.fillText(localUF, bLocal.x, bLocal.y);

        // Assinatura Digital do Detran
        const bAss = BE["back.assDigital"] as CompositeTextElement;
        octx.font = gFont(bAss);
        const assDetran = `${props.assDigital1 || "7386321121"} ${props.assDigital2 || (ufSigla + "54171992")}`;
        octx.fillText(assDetran, bAss.x, bAss.y);

      } else if (slide === 3) {
        // --- SLIDE 3: CÓDIGO MRZ ---
        const bgImg = new Image();
        bgImg.src = "/img/cnh-templates/codigo_mrz.jpg";
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        octx.drawImage(bgImg, 0, 0, 963, 680);

        const mrzLines = gerarMRZ({
          registro:       props.registro,
          espelho:        props.espelho,
          nome:           props.nome,
          dataNascimento: props.dataNascimento,
          sexo:           props.sexo,
          validade:       props.validade,
        });
        octx.fillStyle = "#000000";
        octx.font = "bold 26px monospace";
        octx.textAlign = "center";

        octx.fillText(mrzLines[0], (963 / 2), 280);
        octx.fillText(mrzLines[1], (963 / 2), 350);
        octx.fillText(mrzLines[2], (963 / 2), 420);
        octx.textAlign = "left";
      }

      // ROTACAO DE RETRATO -90 GRAUS (-90° CCW / ANTI-HORARIO)
      ctx.save();
      ctx.translate(0, H);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    };

    render();

    return () => {
      isMounted = false;
    };
  }, [slide, props]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas ref={canvasRef} className="max-w-full max-h-full rounded-xl shadow-xs" />
    </div>
  );
}
