import { useEffect, useRef } from "react";
import { generateQRCodeDataURL } from "@/lib/qrCodeEngine";
import { gerarMRZ } from "@/lib/cnh/mrz";
import { getCNHValidationUrl } from "@/lib/cnh/validation";

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
        // --- SLIDE 1: FRENTE (PARTE SUPERIOR) ---
        const bgImg = new Image();
        bgImg.src = "/img/cnh-templates/parte_superior.jpg";
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        octx.drawImage(bgImg, 0, 0, 963, 680);

        // 1. MOLDURA DA FOTO 3X4 COM ENQUADRAMENTO BRANCO PURO (177, 192, 250, 335)
        octx.fillStyle = "#ffffff";
        octx.fillRect(177, 192, 250, 335);

        // Foto 3x4 do Condutor com recorte perfeito na moldura
        if (props.fotoUrl) {
          try {
            const foto = new Image();
            foto.crossOrigin = "anonymous";
            foto.src = props.fotoUrl;
            await new Promise((res) => { foto.onload = res; foto.onerror = res; });
            if (isMounted) {
              octx.save();
              octx.beginPath();
              octx.rect(177, 192, 250, 335);
              octx.clip();
              octx.drawImage(foto, 177, 192, 250, 335);
              octx.restore();
            }
          } catch {}
        }

        // Assinatura do Condutor com tratamento de transparência forense (187, 580, 230, 54)
        if (props.assinaturaUrl) {
          await drawCleanSignature(octx, props.assinaturaUrl, 187, 580, 230, 54);
        }

        // 2. NÚMERO DO ESPELHO / FORMULÁRIO (TOPO ESQUERDO)
        octx.fillStyle = "#000000";
        octx.font = "bold 24px Times New Roman, serif";
        octx.fillText(props.espelho || props.registro || "5728237792", 80, 110);

        // 3. MAPEAMENTO DE CAMPOS DE TEXTO DA FRENTE (PARIDADE 1:1 COM /CNHCRIA)
        octx.fillStyle = "#000000";
        octx.font = "bold 19px Rawline, Arial, sans-serif";

        // Campo 1 e 2: Nome e Sobrenome
        octx.fillText((props.nome || "").toUpperCase(), 400, 215);

        // Campo 1ª Habilitação
        octx.fillText(fmtDate(props.primeiraHabilitacao || props.dataEmissao), 820, 215);

        // Campo 3: Data, Local e UF de Nascimento
        const localNasc = [props.dataNascimento ? fmtDate(props.dataNascimento) : "", props.localNascimento || "BRASÍLIA", props.ufNascimento || "DF"].filter(Boolean).join(" - ");
        octx.fillText(localNasc.toUpperCase(), 460, 280);

        // Campo 4a: Data de Emissão
        octx.fillText(fmtDate(props.dataEmissao), 460, 345);

        // Campo 4b: Validade (Cor Vermelha de Segurança Oficial #c0392b)
        octx.fillStyle = "#c0392b";
        octx.fillText(fmtDate(props.validade), 630, 345);
        octx.fillStyle = "#000000";

        // Campo 4c: Doc Identidade / Órgão Emissor / UF
        const docId = [props.rg || "0000000", props.orgaoEmissor || "SSP", props.ufRG || props.ufEmissao || "DF"].filter(Boolean).join(" ");
        octx.fillText(docId.toUpperCase(), 460, 410);

        // Campo 4d: CPF
        octx.fillText(formatCPF(props.cpf), 460, 475);

        // Campo 5: Nº Registro (Cor Vermelha de Segurança Oficial #c0392b)
        octx.fillStyle = "#c0392b";
        octx.fillText(props.registro || "00000000000", 660, 475);

        // Campo 9: Categoria (Cor Vermelha de Segurança Oficial #c0392b)
        octx.fillText((props.categoria || "AB").toUpperCase(), 860, 475);
        octx.fillStyle = "#000000";

        // Nacionalidade
        octx.fillText((props.nacionalidade || "BRASILEIRA").toUpperCase(), 460, 538);

        // Filiação (Nome da Mãe e do Pai)
        octx.font = "bold 17px Rawline, Arial, sans-serif";
        if (props.nomeMae) octx.fillText(props.nomeMae.toUpperCase(), 460, 595);
        if (props.nomePai) octx.fillText(props.nomePai.toUpperCase(), 460, 625);

      } else if (slide === 2) {
        // --- SLIDE 2: VERSO (PARTE INFERIOR) ---
        const bgImg = new Image();
        bgImg.src = "/img/cnh-templates/parte_inferior.jpg";
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        octx.drawImage(bgImg, 0, 0, 963, 680);

        // Número do Espelho (Topo)
        octx.fillStyle = "#000000";
        octx.font = "bold 24px Times New Roman, serif";
        octx.fillText(props.espelho || props.registro || "5728237792", 80, 110);

        // Nome do Estado por Extenso
        const ufSigla = (props.ufEmissao || "SP").toUpperCase();
        const estadoExtenso = ESTADOS_POR_EXTENSO[ufSigla] || "SÃO PAULO";
        octx.font = "bold 32px Rawline, Arial, sans-serif";
        octx.fillText(estadoExtenso, 80, 400);

        // Datas da Tabela de Categorias (Vermelho #c0392b)
        octx.font = "bold 15px Rawline, Arial, sans-serif";
        octx.fillStyle = "#c0392b";
        const catStr = (props.categoria || "AB").toUpperCase();
        const validFmt = fmtDate(props.validade);
        
        if (catStr.includes("A")) octx.fillText(validFmt, 855, 232);
        if (catStr.includes("B")) octx.fillText(validFmt, 855, 296);
        if (catStr.includes("C")) octx.fillText(validFmt, 855, 360);
        if (catStr.includes("D")) octx.fillText(validFmt, 855, 590);
        octx.fillStyle = "#000000";

        // Campo 12: Observações (EAR)
        octx.font = "bold 18px Rawline, Arial, sans-serif";
        const obs = (props.observacoes || "EXERCE ATIVIDADE REMUNERADA").toUpperCase();
        octx.fillText(obs, 180, 220);

        // Local e UF de Emissão
        const localUF = `${(props.localEmissao || "BRASÍLIA").toUpperCase()}, ${ufSigla}`;
        octx.fillText(localUF, 180, 595);

        // Assinatura Digital do Detran
        octx.font = "bold 12px Rawline, Arial, sans-serif";
        const assDetran = `${props.assDigital1 || "7386321121"} ${props.assDigital2 || (ufSigla + "54171992")}`;
        octx.fillText(assDetran, 330, 635);

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
