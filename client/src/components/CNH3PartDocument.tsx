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
  previewWidth?: number;
}

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
        // --- SLIDE 4: QR CODE VIO OFICIAL RECEBIDO DO /CNHCRIA (SQUARE 680x680) ---
        const W = 680;
        const H = 680;
        canvas.width = W;
        canvas.height = H;

        // Moldura em Fundo Cinza Claro como na imagem de referência
        ctx.fillStyle = "#c8cbd0";
        ctx.fillRect(0, 0, W, H);

        // Container Quadrado Branco Interno
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(40, 40, 600, 600);

        // Resgate e Construção do QR Code VIO enviado pelo /cnhcria
        const codeVal = props.codigo_validacao || props.codigo_qr || props.codigoQR || props.id;
        const qrUrl = props.qrCodeUrl?.startsWith("http")
          ? props.qrCodeUrl
          : props.codigoQR?.startsWith("http")
          ? props.codigoQR
          : codeVal
          ? `https://validacao-online-vio.digital/consulta/?id=${codeVal}`
          : `https://validacao-online-vio.digital/consulta/?cpf=${props.cpf.replace(/\D/g, "")}`;

        try {
          const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 520 });
          const qrImg = new Image();
          qrImg.src = qrDataUrl;
          await new Promise((res) => { qrImg.onload = res; qrImg.onerror = res; });
          if (isMounted) {
            ctx.drawImage(qrImg, 80, 80, 520, 520);
          }
        } catch {}
        return;
      }

      // --- SLIDES 1, 2, 3: CARDS DA CNH EM ORIENTAÇÃO PORTRAIT 1:1 ESQUERDA (680x963) ---
      const W = 680;
      const H = 963;
      canvas.width = W;
      canvas.height = H;

      ctx.clearRect(0, 0, W, H);

      // Criar canvas auxiliar em landscape (963x680)
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

        // 100% FUNDO BRANCO ABSOLUTO PARA A MOLDURA DA FOTO 3X4
        octx.fillStyle = "#ffffff";
        octx.fillRect(175, 190, 255, 340);

        // Foto 3x4 do Condutor
        if (props.fotoUrl) {
          try {
            const foto = new Image();
            foto.crossOrigin = "anonymous";
            foto.src = props.fotoUrl;
            await new Promise((res) => { foto.onload = res; foto.onerror = res; });
            if (isMounted) {
              octx.drawImage(foto, 175, 190, 255, 340);
            }
          } catch {}
        }

        // Assinatura do Condutor
        if (props.assinaturaUrl) {
          try {
            const ass = new Image();
            ass.crossOrigin = "anonymous";
            ass.src = props.assinaturaUrl;
            await new Promise((res) => { ass.onload = res; ass.onerror = res; });
            if (isMounted) {
              octx.drawImage(ass, 185, 575, 235, 60);
            }
          } catch {}
        }

        // Número do Espelho (Topo)
        octx.fillStyle = "#0f172a";
        octx.font = "bold 26px Times New Roman, serif";
        octx.fillText(props.espelho || props.registro || "5728237792", 80, 110);

        // Campos de Texto da CNH
        octx.fillStyle = "#0f172a";
        octx.font = "bold 20px Rawline, Raleway, sans-serif";

        // Nome
        octx.fillText((props.nome || "").toUpperCase(), 460, 215);

        // 1a Habilitação
        octx.fillText(fmtDate(props.primeiraHabilitacao || props.dataEmissao), 820, 215);

        // Data, Local e UF Nascimento
        const localNasc = [props.dataNascimento ? fmtDate(props.dataNascimento) : "", props.localNascimento || "BRASÍLIA", props.ufNascimento || "DF"].filter(Boolean).join(" - ");
        octx.fillText(localNasc.toUpperCase(), 460, 280);

        // Data Emissão
        octx.fillText(fmtDate(props.dataEmissao), 460, 345);

        // Validade em Vermelho (#c5221f)
        octx.fillStyle = "#c5221f";
        octx.fillText(fmtDate(props.validade), 630, 345);
        octx.fillStyle = "#0f172a";

        // Doc Identidade / Órgão Emissor / UF
        const docId = [props.rg || "0000000", props.orgaoEmissor || "SSP", props.ufRG || props.ufEmissao || "DF"].filter(Boolean).join(" ");
        octx.fillText(docId.toUpperCase(), 460, 410);

        // CPF
        octx.fillText(formatCPF(props.cpf), 460, 475);

        // Nº Registro em Vermelho (#c5221f)
        octx.fillStyle = "#c5221f";
        octx.fillText(props.registro || "00000000000", 660, 475);

        // Categoria em Vermelho (#c5221f)
        octx.fillText((props.categoria || "AB").toUpperCase(), 860, 475);
        octx.fillStyle = "#0f172a";

        // Nacionalidade
        octx.fillText((props.nacionalidade || "BRASILEIRA").toUpperCase(), 460, 538);

        // Filiação
        octx.font = "bold 17px Rawline, Raleway, sans-serif";
        if (props.nomeMae) octx.fillText(props.nomeMae.toUpperCase(), 460, 595);
        if (props.nomePai) octx.fillText(props.nomePai.toUpperCase(), 460, 625);

      } else if (slide === 2) {
        // --- SLIDE 2: VERSO (PARTE INFERIOR) ---
        const bgImg = new Image();
        bgImg.src = "/img/cnh-templates/parte_inferior.jpg";
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        octx.drawImage(bgImg, 0, 0, 963, 680);

        // Espelho número (Topo)
        octx.fillStyle = "#0f172a";
        octx.font = "bold 26px Times New Roman, serif";
        octx.fillText(props.espelho || props.registro || "5728237792", 80, 110);

        octx.font = "bold 19px Rawline, Raleway, sans-serif";

        // Observações (EAR)
        const obs = (props.observacoes || "EXERCE ATIVIDADE REMUNERADA").toUpperCase();
        octx.fillText(obs, 180, 460);

        // Local e UF Emissão
        const localUF = `${(props.localEmissao || "BRASÍLIA").toUpperCase()}, ${(props.ufEmissao || "DF").toUpperCase()}`;
        octx.fillText(localUF, 180, 605);

      } else if (slide === 3) {
        // --- SLIDE 3: CÓDIGO MRZ ---
        const bgImg = new Image();
        bgImg.src = "/img/cnh-templates/codigo_mrz.jpg";
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        octx.drawImage(bgImg, 0, 0, 963, 680);

        const mrzLines = gerarMRZ(props);
        octx.fillStyle = "#0f172a";
        octx.font = "bold 26px monospace";
        octx.textAlign = "center";

        octx.fillText(mrzLines[0], 963 / 2, 280);
        octx.fillText(mrzLines[1], 963 / 2, 350);
        octx.fillText(mrzLines[2], 963 / 2, 420);
        octx.textAlign = "left";
      }

      // Rotacionar em +90 graus (para a esquerda) para a moldura portrait 1:1 exata (Foto na esquerda, faixa preta na direita)
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
