import { useEffect, useRef } from "react";
import QRCode from "qrcode";

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

function gerarMRZ(p: CNH3PartDocumentProps): string[] {
  const pad = (s: string, l: number) => (s || "UNKNOWN").toUpperCase().replace(/[^A-Z0-9]/g, "<").padEnd(l, "<");
  const fmtData = (d?: string) => {
    if (!d) return "000000";
    const p2 = d.split("/");
    if (p2.length === 3) return `${p2[2].slice(2)}${p2[1]}${p2[0]}`;
    const p3 = d.split("-");
    if (p3.length === 3) return `${p3[0].slice(2)}${p3[1]}${p3[2]}`;
    return "000000";
  };
  const r = (p.registro || "00000000000").replace(/\D/g, "").padEnd(11, "<").slice(0, 11);
  const e = (p.espelho || "0000000000").replace(/\D/g, "").padEnd(10, "<").slice(0, 10);
  const partes = (p.nome || "").trim().split(/\s+/).filter(Boolean);
  
  let nomeFormatadoRaw = "";
  if (partes.length > 1) {
    const ultimoSobrenome = partes[partes.length - 1];
    const nomesRestantes = partes.slice(0, partes.length - 1).join("<");
    nomeFormatadoRaw = `${ultimoSobrenome}<<${nomesRestantes}`;
  } else {
    nomeFormatadoRaw = partes[0] || "DESCONHECIDO";
  }
  const nomeFormatado = pad(nomeFormatadoRaw, 30).substring(0, 30);

  return [
    `I<BRA${r}<${e}<<<`,
    `${fmtData(p.dataNascimento)}0${p.sexo ? p.sexo.charAt(0).toUpperCase() : "M"}${fmtData(p.validade)}5BRA<<<<<<<<<<<<`,
    nomeFormatado,
  ];
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
      if (a < 50 || (r > 140 && g > 140 && b > 140)) {
        data[i+3] = 0;
      } else {
        data[i] = 0;
        data[i+1] = 0;
        data[i+2] = 0;
        data[i+3] = a > 50 ? a : 255;
      }
    }
    tctx.putImageData(imgData, 0, 0);
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
          qrUrl = `https://validacao-online-vio.digital/consulta/?id=${encodeURIComponent(codigoQrFinal)}`;
        }

        try {
          const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 2, width: 520 });
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

      // --- SLIDES 1, 2, 3: CARDS PORTRAIT COM DESLOCAMENTO GERAL (680x963) ---
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

      const dx = -48;
      const dy = 3.5;

      if (slide === 1) {
        // --- SLIDE 1: FRENTE (PARTE SUPERIOR) ---
        const bgImg = new Image();
        bgImg.src = "/img/cnh-templates/parte_superior.jpg";
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        octx.drawImage(bgImg, 0, 0, 963, 680);

        // 1. MOLDURA DA FOTO 3X4 COM ENQUADRAMENTO BRANCO PURO
        octx.fillStyle = "#ffffff";
        octx.fillRect(191 + dx, 192 + dy, 250, 335);

        // Foto 3x4 do Condutor
        if (props.fotoUrl) {
          try {
            const foto = new Image();
            foto.crossOrigin = "anonymous";
            foto.src = props.fotoUrl;
            await new Promise((res) => { foto.onload = res; foto.onerror = res; });
            if (isMounted) {
              octx.drawImage(foto, 191 + dx, 192 + dy, 250, 335);
            }
          } catch {}
        }

        // Assinatura do Condutor com tratamento de transparência forense
        if (props.assinaturaUrl) {
          await drawCleanSignature(octx, props.assinaturaUrl, 187 + dx, 580 + dy, 230, 54);
        }

        // 2. NÚMERO DO ESPELHO / FORMULÁRIO (TOPO ESQUERDO)
        octx.fillStyle = "#000000";
        octx.font = "bold 24px 'MyriadPro-Regular', sans-serif";
        octx.fillText(props.espelho || props.registro || "5728237792", 80 + dx, 110 + dy);

        // 3. MAPEAMENTO DE CAMPOS DE TEXTO DA FRENTE (PARIDADE 1:1 COM /CNHCRIA)
        octx.fillStyle = "#000000";
        octx.font = "bold 19px 'MyriadPro-Regular', sans-serif";

        // Campo 1 e 2: Nome e Sobrenome
        octx.fillText((props.nome || "").toUpperCase(), 400 + dx, 215 + dy);

        // Campo 1ª Habilitação
        octx.fillText(fmtDate(props.primeiraHabilitacao || props.dataEmissao), 820 + dx, 215 + dy);

        // Campo 3: Data, Local e UF de Nascimento
        const localNasc = [props.dataNascimento ? fmtDate(props.dataNascimento) : "", props.localNascimento || "BRASÍLIA", props.ufNascimento || "DF"].filter(Boolean).join(" - ");
        octx.fillText(localNasc.toUpperCase(), 460 + dx, 280 + dy);

        // Campo 4a: Data de Emissão
        octx.fillText(fmtDate(props.dataEmissao), 460 + dx, 345 + dy);

        // Campo 4b: Validade (Cor Vermelha de Segurança Oficial #c0392b)
        octx.fillStyle = "#c0392b";
        octx.fillText(fmtDate(props.validade), 630 + dx, 345 + dy);
        octx.fillStyle = "#000000";

        // Campo 4c: Doc Identidade / Órgão Emissor / UF
        const docId = [props.rg || "0000000", props.orgaoEmissor || "SSP", props.ufRG || props.ufEmissao || "DF"].filter(Boolean).join(" ");
        octx.fillText(docId.toUpperCase(), 460 + dx, 410 + dy);

        // Campo 4d: CPF
        octx.fillText(formatCPF(props.cpf), 460 + dx, 475 + dy);

        // Campo 5: Nº Registro (Cor Vermelha de Segurança Oficial #c0392b)
        octx.fillStyle = "#c0392b";
        octx.fillText(props.registro || "00000000000", 660 + dx, 475 + dy);

        // Campo 9: Categoria (Cor Vermelha de Segurança Oficial #c0392b)
        octx.fillText((props.categoria || "AB").toUpperCase(), 860 + dx, 475 + dy);
        octx.fillStyle = "#000000";

        // Nacionalidade
        octx.fillText((props.nacionalidade || "BRASILEIRA").toUpperCase(), 460 + dx, 538 + dy);

        // Filiação (Nome da Mãe e do Pai)
        octx.font = "bold 17px 'MyriadPro-Regular', sans-serif";
        if (props.nomeMae) octx.fillText(props.nomeMae.toUpperCase(), 460 + dx, 595 + dy);
        if (props.nomePai) octx.fillText(props.nomePai.toUpperCase(), 460 + dx, 625 + dy);

      } else if (slide === 2) {
        // --- SLIDE 2: VERSO (PARTE INFERIOR) ---
        const bgImg = new Image();
        bgImg.src = "/img/cnh-templates/parte_inferior.jpg";
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        octx.drawImage(bgImg, 0, 0, 963, 680);

        // Número do Espelho (Topo)
        octx.fillStyle = "#000000";
        octx.font = "bold 24px 'MyriadPro-Regular', sans-serif";
        octx.fillText(props.espelho || props.registro || "5728237792", 80 + dx, 110 + dy);

        // Nome do Estado por Extenso
        const ufSigla = (props.ufEmissao || "SP").toUpperCase();
        const estadoExtenso = ESTADOS_POR_EXTENSO[ufSigla] || "SÃO PAULO";
        octx.font = "bold 32px 'MyriadPro-Regular', sans-serif";
        octx.fillText(estadoExtenso, 80 + dx, 400 + dy);

        // Datas da Tabela de Categorias (Vermelho #c0392b)
        octx.font = "bold 15px 'MyriadPro-Regular', sans-serif";
        octx.fillStyle = "#c0392b";
        const catStr = (props.categoria || "AB").toUpperCase();
        const validFmt = fmtDate(props.validade);
        
        if (catStr.includes("A")) octx.fillText(validFmt, 855 + dx, 232 + dy);
        if (catStr.includes("B")) octx.fillText(validFmt, 855 + dx, 296 + dy);
        if (catStr.includes("C")) octx.fillText(validFmt, 855 + dx, 360 + dy);
        if (catStr.includes("D")) octx.fillText(validFmt, 855 + dx, 590 + dy);
        octx.fillStyle = "#000000";

        // Campo 12: Observações (EAR)
        octx.font = "bold 18px 'MyriadPro-Regular', sans-serif";
        const obs = (props.observacoes || "EXERCE ATIVIDADE REMUNERADA").toUpperCase();
        octx.fillText(obs, 180 + dx, 220 + dy);

        // Local e UF de Emissão
        const localUF = `${(props.localEmissao || "BRASÍLIA").toUpperCase()}, ${ufSigla}`;
        octx.fillText(localUF, 180 + dx, 595 + dy);

        // Assinatura Digital do Detran
        octx.font = "bold 12px 'MyriadPro-Regular', sans-serif";
        const assDetran = `${props.assDigital1 || "7386321121"} ${props.assDigital2 || (ufSigla + "54171992")}`;
        octx.fillText(assDetran, 330 + dx, 635 + dy);

      } else if (slide === 3) {
        // --- SLIDE 3: CÓDIGO MRZ ---
        const bgImg = new Image();
        bgImg.src = "/img/cnh-templates/codigo_mrz.jpg";
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        octx.drawImage(bgImg, 0, 0, 963, 680);

        const mrzLines = gerarMRZ(props);
        octx.fillStyle = "#000000";
        octx.font = "bold 26px monospace";
        octx.textAlign = "center";

        octx.fillText(mrzLines[0], (963 / 2) + dx, 280 + dy);
        octx.fillText(mrzLines[1], (963 / 2) + dx, 350 + dy);
        octx.fillText(mrzLines[2], (963 / 2) + dx, 420 + dy);
        octx.textAlign = "left";
      }

      // Rotacionar em +90 graus (para a esquerda) para posicionamento 1:1 perfeito na moldura portrait (680x963)
      ctx.save();
      ctx.translate(W, 0);
      ctx.rotate(Math.PI / 2);
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
