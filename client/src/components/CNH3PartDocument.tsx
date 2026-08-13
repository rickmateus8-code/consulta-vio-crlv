import { useEffect, useRef } from "react";
import { generateQRCodeDataURL } from "@/lib/qrCodeEngine";
import { gerarMRZ } from "@/lib/cnh/mrz";
import { getCNHValidationUrl } from "@/lib/cnh/validation";
import {
  WALLET_FRONT_LAYOUT, WALLET_FRONT_ELEMENTS,
  WALLET_BACK_LAYOUT,  WALLET_BACK_ELEMENTS,
  type TextElement, type CompositeTextElement, type ImageElement, type RectElement,
} from "@/lib/cnh/walletGeometry";
import type { CNHRenderInput } from "@/lib/cnh/renderInput";
import { cNH3PartDocumentPropsToRenderInput } from "@/lib/cnh/normalize";

export interface CNH3PartDocumentProps {
  id?: string;
  slide: 1 | 2 | 3 | 4; // 1: Frente, 2: Verso, 3: MRZ, 4: QR Code VIO
  // â”€â”€â”€ Legacy props (mantidas para retrocompatibilidade) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Quando renderInput NÃƒO Ã© fornecido, estas props sÃ£o convertidas via
  // cNH3PartDocumentPropsToRenderInput(). NÃƒO remover nesta fase (Phase 2D).
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
  // â”€â”€â”€ Render Input canÃ´nico (Phase 2D) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Quando fornecido, TODOS os dados vÃªm exclusivamente daqui.
  // NÃƒO misturar com legacy props campo a campo â€” regra anti-hÃ­brida.
  renderInput?: CNHRenderInput;
}

const ESTADOS_POR_EXTENSO: Record<string, string> = {
  AC: "ACRE", AL: "ALAGOAS", AP: "AMAPÃ", AM: "AMAZONAS", BA: "BAHIA",
  CE: "CEARÃ", DF: "DISTRITO FEDERAL", ES: "ESPÃRITO SANTO", GO: "GOIÃS",
  MA: "MARANHÃƒO", MT: "MATO GROSSO", MS: "MATO GROSSO DO SUL", MG: "MINAS GERAIS",
  PA: "PARÃ", PB: "PARAIBA", PR: "PARANÃ", PE: "PERNAMBUCO", PI: "PIAUÃ",
  RJ: "RIO DE JANEIRO", RN: "RIO GRANDE DO NORTE", RS: "RIO GRANDE DO SUL",
  RO: "RONDÃ”NIA", RR: "RORAIMA", SC: "SANTA CATARINA", SP: "SÃƒO PAULO",
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

// â”€â”€â”€ GeraÃ§Ã£o MRZ (OCR-B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ImplementaÃ§Ã£o centralizada em @/lib/cnh/mrz â€” gerarMRZ importado acima.

// â”€â”€â”€ Helper de fonte para walletGeometry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ REGRA ANTI-HÃBRIDA (Phase 2D) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Se renderInput for fornecido: TODOS os dados vÃªm dele.
  // Se ausente: TODOS os dados vÃªm do adapter de legacy props.
  // NUNCA misturar as duas fontes campo a campo.
  const effectiveInput: CNHRenderInput = props.renderInput
    ?? cNH3PartDocumentPropsToRenderInput(props);
  const p = {
    ...effectiveInput.data,
    id: effectiveInput.identity.emissionId || props.id,
    validationId: effectiveInput.identity.validationId,
    codigoQR: (
      props.renderInput
        ? effectiveInput.identity.validationId   // fonte canÃ´nica
        : (props.codigoQR || props.codigo_validacao || props.codigo_qr || effectiveInput.identity.validationId)
    ),
    previewWidth: props.previewWidth,
    slide,
  };
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

        // codigoQR já resolvido pela regra anti-híbrida em p.codigoQR
        // (= validationId se renderInput, ou codigo_validacao||codigo_qr||codigoQR||id se legacy)
        let codigoQrFinal = p.codigoQR || p.id || "";
        let qrUrl = "";
        if (codigoQrFinal.startsWith("http")) {
          qrUrl = codigoQrFinal;
        } else {
          if (!codigoQrFinal || codigoQrFinal.includes(".")) {
            codigoQrFinal = p.id || "31c64778-606e-436e-9f9d-287574f23abe";
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
        // --- SLIDE 1: FRENTE (PARTE SUPERIOR) â€” geometria via WALLET_FRONT_LAYOUT ---
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
        if (p.fotoUrl) {
          try {
            const foto = new Image();
            foto.crossOrigin = "anonymous";
            foto.src = p.fotoUrl;
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

        // Assinatura do Condutor com tratamento de transparÃªncia forense
        if (p.assinaturaUrl) {
          const fAss = FE["front.assinatura"] as ImageElement;
          await drawCleanSignature(octx, p.assinaturaUrl, fAss.x, fAss.y, fAss.width, fAss.height);
        }

        // 2. NÃšMERO DO ESPELHO / FORMULÃRIO (TOPO ESQUERDO)
        const fEspelho = FE["front.espelho"] as TextElement;
        octx.fillStyle = fEspelho.color;
        octx.font = gFont(fEspelho);
        octx.fillText(p.espelho || p.registro || "5728237792", fEspelho.x, fEspelho.y);

        // 3. MAPEAMENTO DE CAMPOS DE TEXTO DA FRENTE (PARIDADE 1:1 COM /CNHCRIA)
        const fNome = FE["front.nome"] as TextElement;
        octx.fillStyle = fNome.color;
        octx.font = gFont(fNome);

        // Campo 1 e 2: Nome e Sobrenome
        octx.fillText((p.nome || "").toUpperCase(), fNome.x, fNome.y);

        // Campo 1Âª HabilitaÃ§Ã£o
        const fPrimHab = FE["front.primeiraHabilitacao"] as TextElement;
        octx.fillText(fmtDate(p.primeiraHabilitacao || p.dataEmissao), fPrimHab.x, fPrimHab.y);

        // Campo 3: Data, Local e UF de Nascimento
        const fNasc = FE["front.nascimento"] as CompositeTextElement;
        const localNasc = [p.dataNascimento ? fmtDate(p.dataNascimento) : "", p.localNascimento || "BRASÃLIA", p.ufNascimento || "DF"].filter(Boolean).join(" - ");
        octx.fillText(localNasc.toUpperCase(), fNasc.x, fNasc.y);

        // Campo 4a: Data de EmissÃ£o
        const fEmissao = FE["front.dataEmissao"] as TextElement;
        octx.fillText(fmtDate(p.dataEmissao), fEmissao.x, fEmissao.y);

        // Campo 4b: Validade (Cor Vermelha de SeguranÃ§a Oficial)
        const fValidade = FE["front.validade"] as TextElement;
        octx.fillStyle = fValidade.color;
        octx.fillText(fmtDate(p.validade), fValidade.x, fValidade.y);
        octx.fillStyle = fNome.color; // reset â†’ preto

        // Campo 4c: Doc Identidade / Ã“rgÃ£o Emissor / UF
        const fDocId = FE["front.docIdentidade"] as CompositeTextElement;
        const docId = [p.rg || "0000000", p.orgaoEmissor || "SSP", p.ufRG || p.ufEmissao || "DF"].filter(Boolean).join(" ");
        octx.fillText(docId.toUpperCase(), fDocId.x, fDocId.y);

        // Campo 4d: CPF
        const fCpf = FE["front.cpf"] as TextElement;
        octx.fillText(formatCPF(p.cpf), fCpf.x, fCpf.y);

        // Campo 5: NÂº Registro (Cor Vermelha de SeguranÃ§a Oficial)
        const fRegistro = FE["front.registro"] as TextElement;
        octx.fillStyle = fRegistro.color;
        octx.fillText(p.registro || "00000000000", fRegistro.x, fRegistro.y);

        // Campo 9: Categoria (Cor Vermelha de SeguranÃ§a Oficial)
        const fCat = FE["front.categoria"] as TextElement;
        octx.fillText((p.categoria || "AB").toUpperCase(), fCat.x, fCat.y);
        octx.fillStyle = fNome.color; // reset â†’ preto

        // Nacionalidade
        const fNac = FE["front.nacionalidade"] as TextElement;
        octx.fillText((p.nacionalidade || "BRASILEIRA").toUpperCase(), fNac.x, fNac.y);

        // FiliaÃ§Ã£o (Nome da MÃ£e e do Pai)
        const fMae = FE["front.nomeMae"] as TextElement;
        octx.font = gFont(fMae);
        if (p.nomeMae) octx.fillText(p.nomeMae.toUpperCase(), fMae.x, fMae.y);
        const fPai = FE["front.nomePai"] as TextElement;
        if (p.nomePai) octx.fillText(p.nomePai.toUpperCase(), fPai.x, fPai.y);

      } else if (slide === 2) {
        // --- SLIDE 2: VERSO (PARTE INFERIOR) â€” geometria via WALLET_BACK_LAYOUT ---
        const bgImg = new Image();
        bgImg.src = WALLET_BACK_LAYOUT.background;
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        octx.drawImage(bgImg, 0, 0, WALLET_BACK_LAYOUT.sourceWidth, WALLET_BACK_LAYOUT.sourceHeight);

        const BE = WALLET_BACK_ELEMENTS;

        // NÃºmero do Espelho (Topo)
        const bEspelho = BE["back.espelho"] as TextElement;
        octx.fillStyle = bEspelho.color;
        octx.font = gFont(bEspelho);
        octx.fillText(p.espelho || p.registro || "5728237792", bEspelho.x, bEspelho.y);

        // Nome do Estado por Extenso
        const ufSigla = (p.ufEmissao || "SP").toUpperCase();
        const estadoExtenso = ESTADOS_POR_EXTENSO[ufSigla] || "SÃƒO PAULO";
        const bEstado = BE["back.estadoExtenso"] as TextElement;
        octx.font = gFont(bEstado);
        octx.fillText(estadoExtenso, bEstado.x, bEstado.y);

        // Datas da Tabela de Categorias (Vermelho, condicional por categoria)
        const bValidA = BE["back.validadeA"] as TextElement;
        octx.font = gFont(bValidA);
        octx.fillStyle = bValidA.color;
        const catStr = (p.categoria || "AB").toUpperCase();
        const validFmt = fmtDate(p.validade);

        const bValidB = BE["back.validadeB"] as TextElement;
        const bValidC = BE["back.validadeC"] as TextElement;
        const bValidD = BE["back.validadeD"] as TextElement;
        if (catStr.includes("A")) octx.fillText(validFmt, bValidA.x, bValidA.y);
        if (catStr.includes("B")) octx.fillText(validFmt, bValidB.x, bValidB.y);
        if (catStr.includes("C")) octx.fillText(validFmt, bValidC.x, bValidC.y);
        if (catStr.includes("D")) octx.fillText(validFmt, bValidD.x, bValidD.y);
        octx.fillStyle = bEspelho.color; // reset â†’ preto

        // Campo 12: ObservaÃ§Ãµes (EAR)
        const bObs = BE["back.observacoes"] as TextElement;
        octx.font = gFont(bObs);
        const obs = (p.observacoes || "EXERCE ATIVIDADE REMUNERADA").toUpperCase();
        octx.fillText(obs, bObs.x, bObs.y);

        // Local e UF de EmissÃ£o
        const bLocal = BE["back.localEmissao"] as CompositeTextElement;
        const localUF = `${(p.localEmissao || "BRASÃLIA").toUpperCase()}, ${ufSigla}`;
        octx.fillText(localUF, bLocal.x, bLocal.y);

        // Assinatura Digital do Detran
        const bAss = BE["back.assDigital"] as CompositeTextElement;
        octx.font = gFont(bAss);
        const assDetran = `${p.assDigital1 || "7386321121"} ${p.assDigital2 || (ufSigla + "54171992")}`;
        octx.fillText(assDetran, bAss.x, bAss.y);

      } else if (slide === 3) {
        // --- SLIDE 3: CÃ“DIGO MRZ ---
        const bgImg = new Image();
        bgImg.src = "/img/cnh-templates/codigo_mrz.jpg";
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        octx.drawImage(bgImg, 0, 0, 963, 680);

        const mrzLines = gerarMRZ({
          registro:       p.registro,
          espelho:        p.espelho,
          nome:           p.nome,
          dataNascimento: p.dataNascimento,
          sexo:           p.sexo,
          validade:       p.validade,
        });
        octx.fillStyle = "#000000";
        octx.font = "bold 26px monospace";
        octx.textAlign = "center";

        octx.fillText(mrzLines[0], (963 / 2), 280);
        octx.fillText(mrzLines[1], (963 / 2), 350);
        octx.fillText(mrzLines[2], (963 / 2), 420);
        octx.textAlign = "left";
      }

      // ROTACAO DE RETRATO -90 GRAUS (-90Â° CCW / ANTI-HORARIO)
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
