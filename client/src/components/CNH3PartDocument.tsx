import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export interface CNH3PartDocumentProps {
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
  const { slide, previewWidth = 360 } = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isMounted = true;

    const render = async () => {
      // 1000x650 Canvas Resolution for High DPI
      const W = 1000;
      const H = 680;
      canvas.width = W;
      canvas.height = H;

      ctx.clearRect(0, 0, W, H);

      if (slide === 1) {
        // --- SLIDE 1: PARTE SUPERIOR (FRENTE) ---
        const bgImg = new Image();
        bgImg.src = "/img/cnh-templates/parte_superior.jpg";
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        ctx.drawImage(bgImg, 0, 0, W, H);

        // Foto 3x4
        if (props.fotoUrl) {
          try {
            const foto = new Image();
            foto.crossOrigin = "anonymous";
            foto.src = props.fotoUrl;
            await new Promise((res) => { foto.onload = res; foto.onerror = res; });
            if (isMounted) {
              ctx.drawImage(foto, 175, 190, 255, 340);
            }
          } catch {}
        }

        // Assinatura
        if (props.assinaturaUrl) {
          try {
            const ass = new Image();
            ass.crossOrigin = "anonymous";
            ass.src = props.assinaturaUrl;
            await new Promise((res) => { ass.onload = res; ass.onerror = res; });
            if (isMounted) {
              ctx.drawImage(ass, 185, 575, 235, 60);
            }
          } catch {}
        }

        // Desenhar Textos dos Campos
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 20px Rawline, Raleway, sans-serif";

        // Nome
        ctx.fillText((props.nome || "").toUpperCase(), 460, 215);

        // 1a Habilitação
        ctx.fillText(fmtDate(props.primeiraHabilitacao || props.dataEmissao), 820, 215);

        // Data, Local e UF Nascimento
        const localNasc = [props.dataNascimento ? fmtDate(props.dataNascimento) : "", props.localNascimento || "BRASÍLIA", props.ufNascimento || "DF"].filter(Boolean).join(" - ");
        ctx.fillText(localNasc.toUpperCase(), 460, 280);

        // Data Emissão | Validade | ACC
        ctx.fillText(fmtDate(props.dataEmissao), 460, 345);
        ctx.fillText(fmtDate(props.validade), 630, 345);

        // Doc Identidade / Órgão Emissor / UF
        const docId = [props.rg || "0000000", props.orgaoEmissor || "SSP", props.ufRG || props.ufEmissao || "DF"].filter(Boolean).join(" ");
        ctx.fillText(docId.toUpperCase(), 460, 410);

        // CPF | N Registro | CAT HAB
        ctx.fillText(formatCPF(props.cpf), 460, 475);
        ctx.fillText(props.registro || "00000000000", 660, 475);
        ctx.fillText((props.categoria || "AB").toUpperCase(), 860, 475);

        // Nacionalidade
        ctx.fillText((props.nacionalidade || "BRASILEIRA").toUpperCase(), 460, 538);

        // Filiação
        ctx.font = "bold 17px Rawline, Raleway, sans-serif";
        if (props.nomeMae) ctx.fillText(props.nomeMae.toUpperCase(), 460, 595);
        if (props.nomePai) ctx.fillText(props.nomePai.toUpperCase(), 460, 625);

      } else if (slide === 2) {
        // --- SLIDE 2: PARTE INFERIOR (VERSO) ---
        const bgImg = new Image();
        bgImg.src = "/img/cnh-templates/parte_inferior.jpg";
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        ctx.drawImage(bgImg, 0, 0, W, H);

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 19px Rawline, Raleway, sans-serif";

        // Observações
        const obs = (props.observacoes || "EXERCE ATIVIDADE REMUNERADA").toUpperCase();
        ctx.fillText(obs, 180, 460);

        // Local e Data de Emissão
        const localData = `${(props.localEmissao || "BRASÍLIA").toUpperCase()} - ${(props.ufEmissao || "DF").toUpperCase()}, ${fmtDate(props.dataEmissao)}`;
        ctx.fillText(localData, 180, 605);

      } else if (slide === 3) {
        // --- SLIDE 3: CÓDIGO MRZ ---
        const bgImg = new Image();
        bgImg.src = "/img/cnh-templates/codigo_mrz.jpg";
        await new Promise((res) => { bgImg.onload = res; bgImg.onerror = res; });
        if (!isMounted) return;

        ctx.drawImage(bgImg, 0, 0, W, H);

        const mrzLines = gerarMRZ(props);
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 26px monospace";
        ctx.textAlign = "center";

        ctx.fillText(mrzLines[0], W / 2, 280);
        ctx.fillText(mrzLines[1], W / 2, 350);
        ctx.fillText(mrzLines[2], W / 2, 420);
        ctx.textAlign = "left";

      } else if (slide === 4) {
        // --- SLIDE 4: QR CODE VIO OFICIAL ---
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);

        // Header VIO
        ctx.fillStyle = "#002e6e";
        ctx.fillRect(0, 0, W, 90);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px Rawline, sans-serif";
        ctx.fillText("VALIDAÇÃO VIO - CNH DIGITAL", 50, 55);

        // Gerar QR Code
        const qrUrl = props.codigoQR || `https://validacao-online-vio.digital/?cpf=${props.cpf}`;
        try {
          const qrDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 340 });
          const qrImg = new Image();
          qrImg.src = qrDataUrl;
          await new Promise((res) => { qrImg.onload = res; qrImg.onerror = res; });
          if (isMounted) {
            ctx.drawImage(qrImg, (W - 340) / 2, 140, 340, 340);
          }
        } catch {}

        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 20px Rawline, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText((props.nome || "").toUpperCase(), W / 2, 530);
        ctx.font = "bold 16px Rawline, sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText(`CPF: ${formatCPF(props.cpf)}`, W / 2, 565);
        ctx.fillText(`QR Code VIO Autêntico - Válido em todo território nacional`, W / 2, 600);
        ctx.textAlign = "left";
      }
    };

    render();

    return () => {
      isMounted = false;
    };
  }, [slide, props]);

  return (
    <div className="w-full flex justify-center items-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full rounded-xl shadow-md border border-slate-200"
        style={{ maxWidth: `${previewWidth}px`, height: "auto" }}
      />
    </div>
  );
}
