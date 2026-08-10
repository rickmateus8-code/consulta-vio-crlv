import { QRCodeSVG as QRCode } from "qrcode.react";
import { forwardRef } from "react";
import { getQRCodeValue } from "@/config.qrcode";
import { ATTESTATION_LAYOUT } from "@/config/attestationLayout";

interface AttestationData {
  id: string;
  paciente: string;
  sexo: string;
  nascimento: string;
  cpf?: string;
  cns?: string;
  tipoDoc?: "CPF" | "CNS";
  nomeMae: string;
  endereco: string;
  condicao?: string;
  vacinacao?: string;
  cid?: string;
  codigoQR: string;
  dataAssinatura: string;
  horaAssinatura: string;
  medico: string;
  crm: string;
  especialidade: string;
  dataEmissao: string;
  afastamento?: string;
  hideSignatureLine?: boolean;
  hidePatientSignature?: boolean;
  hideAfastamentoText?: boolean;
  [key: string]: any;
}

interface AttestationDocumentProps {
  data: AttestationData;
  logoUrl?: string;
  logoLeft?: string;
  logoRight?: string;
  signatureColor?: string;
  signatureImage?: string;
  documentType?: 'atestado' | 'laudo' | 'relatorio';
  logoLeftScale?: number;
  logoRightScale?: number;
  logoLeftX?: number;
  logoLeftY?: number;
  logoRightX?: number;
  logoRightY?: number;
  stampScale?: number;
  stampX?: number;
  stampY?: number;
  stampRotate?: number;
  hideQRCode?: boolean;
  hideSignatureLine?: boolean;
  hidePatientSignature?: boolean;
  hideAfastamentoText?: boolean;
  showStampInfo?: boolean;
  modoCarimbo?: boolean;
  isExporting?: boolean;
}

// Dimensões A4 exatas em pixels a 96dpi
const DOC_WIDTH_PX = 794;
const DOC_HEIGHT_PX = 1123;
const PAD_H = 56;  
const PAD_V = 60;  

const DIAS_EXTENSO: Record<number, { num: string; ext: string }> = {
  1:  { num: "01", ext: "um" },
  2:  { num: "02", ext: "dois" },
  3:  { num: "03", ext: "três" },
  4:  { num: "04", ext: "quatro" },
  5:  { num: "05", ext: "cinco" },
  6:  { num: "06", ext: "seis" },
  7:  { num: "07", ext: "sete" },
  8:  { num: "08", ext: "oito" },
  9:  { num: "09", ext: "nove" },
  10: { num: "10", ext: "dez" },
  11: { num: "11", ext: "onze" },
  12: { num: "12", ext: "doze" },
  13: { num: "13", ext: "treze" },
  14: { num: "14", ext: "quatorze" },
  15: { num: "15", ext: "quinze" },
};

const AttestationDocument = forwardRef<HTMLDivElement, AttestationDocumentProps>(
  (props, ref) => {
    if (!props.data) return null;
    const {
      data, logoUrl, logoLeft, logoRight, signatureColor, signatureImage, documentType,
      logoLeftScale = 1, logoRightScale = 1, logoLeftX = 0, logoLeftY = 0, logoRightX = 0, logoRightY = 0,
      stampScale, stampX, stampY, stampRotate, hideQRCode, hideSignatureLine, hidePatientSignature, hideAfastamentoText, showStampInfo,
      isExporting = false
    } = props;

    const isEmitted = data.codigoQR && data.codigoQR !== "XXXX.XXXX";
    const rawDateToUse = data.dataAssinatura || data.dataEmissao || "";
    const dataEmissaoForQR = rawDateToUse
      ? (() => {
          const d = String(rawDateToUse).trim();
          const parts = d.split("/");
          if (parts.length === 3 && parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
          return d.substring(0, 10);
        })()
      : undefined;
    const qrValue = isEmitted
      ? getQRCodeValue(data.codigoQR, dataEmissaoForQR)
      : "https://validaratestado.digital";

    const getCrossOrigin = (url: string) => {
      if (!url || url.startsWith("data:") || url.startsWith("/")) return undefined;
      try {
        const urlObj = new URL(url);
        if (urlObj.hostname === window.location.hostname) return undefined;
      } catch {
        return undefined;
      }
      return "anonymous";
    };

    const effectiveLogoLeft = logoLeft || logoUrl || (data as any).logoUrl || (data as any).logo_url || "";
    const effectiveLogoRight = logoRight || (data as any).logoRight || (data as any).logo_right || "";

    const instituicao = (data as any).instituicao || "";
    const unidade = (data as any).unidade || "";
    const enderecoEmitente = (data as any).enderecoEmitente || (data as any).endereco_emitente || "";
    const corAssinatura = signatureColor || (data as any).signatureColor || (data as any).signature_color || "#0b109f";
    const fotoAssinatura = signatureImage || (data as any).signatureImage || (data as any).signature_image || "";
    const textoAtestado = (data as any).textoAtestado || (data as any).texto_atestado || "";
    const cidDisplay = (data as any).cidDisplay || (data as any).cid_display || data.cid || "";
    const cidNome = (data as any).cidNome || (data as any).cid_nome || "";
    const cidade = (data as any).cidade || "";
    const modoCarimbo = (data as any).modoCarimbo || (data as any).modo_carimbo || false;

    const layout = ATTESTATION_LAYOUT;
    const sScale = stampScale ?? (data as any).stampScale ?? (data as any).stamp_scale ?? layout.stamp.defaultScale;
    const sX = stampX ?? (data as any).stampX ?? (data as any).stamp_x ?? layout.stamp.defaultX;
    const sY = stampY ?? (data as any).stampY ?? (data as any).stamp_y ?? layout.stamp.defaultY;
    const sRotate = stampRotate ?? (data as any).stampRotate ?? (data as any).stamp_rotate ?? layout.stamp.defaultRotate;

    // Toggles - prioriza props explicitas (mesmo se for false), senão cai para o banco (snake_case)
    const hQRCode = hideQRCode !== undefined ? hideQRCode : ((data as any).hideQRCode === true || (data as any).hide_qr_code === 1);
    const hSignatureLine = hideSignatureLine !== undefined ? hideSignatureLine : ((data as any).hideSignatureLine === true || (data as any).hide_signature_line === 1);
    const hPatientSignature = hidePatientSignature !== undefined ? hidePatientSignature : ((data as any).hidePatientSignature === true || (data as any).hide_patient_signature === 1);
    const hAfastamentoText = hideAfastamentoText !== undefined ? hideAfastamentoText : ((data as any).hideAfastamentoText === true || (data as any).hide_afastamento_text === 1);
    const sStampInfo = showStampInfo !== undefined ? showStampInfo : ((data as any).showStampInfo !== false && (data as any).show_stamp_info !== 0);

    const docType = (documentType || (data as any).documentType || (data as any).document_type || (data as any).tipo || 'atestado').toLowerCase();

    // Limpeza de redundância: Remove a frase de afastamento caso ela tenha sido salva no corpo do texto no banco
    const cleanedTextoAtestado = textoAtestado.replace(/Informo que (o|a) paciente permanece sem condi[\s\S]*?a contar desta data\.?/gi, "").trim();
    
    const dataFormatada = (data as any).dataEmissaoFormatada || (() => {
      const d = data.dataEmissao || "";
      if (!d || d.length < 10) return d;
      const parts = d.split("/");
      if (parts.length === 3) {
        const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
        const dia = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const ano = parts[2];
        if (isNaN(dia) || isNaN(m) || m < 0 || m > 11 || dia < 1 || dia > 31) return d;
        const cidadeLimpa = String(cidade || "").split(",")[0].trim().toUpperCase();
        return `${cidadeLimpa}, ${String(dia).padStart(2, "0")} DE ${meses[m].toUpperCase()} DE ${ano}`;
      }
      return d;
    })();

    const diasExtenso = (() => {
      const n = parseInt(data.afastamento || "3");
      const d = (DIAS_EXTENSO as any)[n] || { num: "03", ext: "três" };
      return `${d.num} (${d.ext}) dias`;
    })();

    const sexoLabel = (() => {
      const s = data.sexo?.toUpperCase();
      if (s === "MALE" || s === "M" || s === "MASCULINO") return "M";
      if (s === "FEMALE" || s === "F" || s === "FEMININO") return "F";
      return s || "______";
    })();

    return (
      <div
        ref={ref}
        id="attestation-document"
        data-pdf-export="true"
        style={{
          width: `${DOC_WIDTH_PX}px`,
          minHeight: `${DOC_HEIGHT_PX}px`,
          height: `${DOC_HEIGHT_PX}px`,
          backgroundColor: "#ffffff",
          paddingTop: `${PAD_H}px`,
          paddingBottom: `${PAD_H}px`,
          paddingLeft: `${PAD_V}px`,
          paddingRight: `${PAD_V}px`,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          fontFamily: "Arial, Helvetica, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Marca d'água Preview */}
        {(data.id === "XXXX.XXXX" || (data as any).codigoQR === "XXXX.XXXX") && (
          <div data-html2canvas-ignore="true" style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-45deg)",
            fontSize: 48.6,
            fontWeight: 900,
            color: "rgba(220, 38, 38, 0.08)",
            pointerEvents: "none",
            userSelect: "none",
            whiteSpace: "nowrap",
            zIndex: 99,
          }}>
            DOCUMENTO INVALIDO - NÃO EMITIDO - PRÉVIA
          </div>
        )}

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Herr+Von+Muellerhoff&family=Courier+Prime:wght@400;700&display=swap');
          #attestation-document * { box-sizing: border-box; }
        `}</style>

        {docType === 'relatorio' ? (
          /* ─── LAYOUT RELATÓRIO (MODO ALFENAS) ─── */
          <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "Arial, sans-serif" }}>
            <div style={{ position: "relative", marginBottom: 40, border: "1px solid #000", height: 120, display: "flex", alignItems: "center" }}>
              <div style={{ width: 140, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible", zIndex: 2 }}>
                {effectiveLogoLeft && (
                  <img src={effectiveLogoLeft} crossOrigin={getCrossOrigin(effectiveLogoLeft)} style={{ maxHeight: 75, maxWidth: "90%", objectFit: "contain", transform: `scale(${logoLeftScale}) translate(${logoLeftX}px, ${logoLeftY}px)`, transformOrigin: "center center", transition: "transform 0.1s" }} alt="Logo" />
                )}
              </div>
              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", zIndex: 1, pointerEvents: "none" }}>
                <div style={{ padding: "0 150px", pointerEvents: "auto" }}>
                  <div style={{ fontSize: 16.2, fontWeight: 700, textTransform: "uppercase", color: "#000", marginBottom: 8 }}>{unidade || instituicao}</div>
                  <div style={{ fontSize: 11.34, fontWeight: 700, textTransform: "uppercase", color: "#000" }}>{enderecoEmitente}</div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: 50, marginTop: -12 }}>
               <h1 style={{ fontSize: 17.5, fontWeight: 400, textTransform: "uppercase", color: "#000", margin: 0 }}>RELATÓRIO MÉDICO</h1>
            </div>

            <div style={{ flex: 1, fontSize: 12.4, lineHeight: 1.8, color: "#000", textAlign: "justify", marginTop: -22 }}>
               <div style={{ whiteSpace: "pre-wrap", marginBottom: 30 }}>
                  <div style={{ color: "#000" }}><span style={{ fontWeight: 700, color: "#000" }}>Paciente:</span> <span style={{ color: "#000" }}>{data.paciente?.toUpperCase()}</span></div>
                  <div style={{ marginBottom: 15, color: "#000" }}><span style={{ fontWeight: 700, color: "#000" }}>CPF:</span> <span style={{ color: "#000" }}>{data.cpf || data.cns || ""}</span></div>

                  <div style={{ color: "#000" }}>Declaro para os devidos fins que {sexoLabel === "M" ? "o paciente acima identificado" : "a paciente acima identificada"} encontra-se em acompanhamento médico devido ao diagnóstico:</div>

                  <div style={{ marginTop: 25, fontSize: 13.67, color: "#000" }}>
                    <span style={{ fontWeight: 700, color: "#000" }}>CID: </span>
                    <span style={{ fontWeight: 700, color: "#000" }}>{cidDisplay} {cidNome ? `(${cidNome})` : ""}</span>
                  </div>

                  {cleanedTextoAtestado && <div style={{ marginTop: 25, color: "#000" }}>{cleanedTextoAtestado}</div>}

                  {!hAfastamentoText && (
                    <div style={{ marginTop: 15, color: "#000" }}>
                      Informo que {sexoLabel === "M" ? "o paciente" : "a paciente"} permanece sem condições de exercer suas atividades profissionais pelo período estimado de {diasExtenso}, a contar desta data.
                    </div>
                  )}
               </div>

               <div style={{ textAlign: "right", marginTop: 45, marginBottom: 90, fontSize: 12.39 }}>{dataFormatada}</div>

               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: hPatientSignature ? 0 : 145 }}>
                  {!hPatientSignature && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 45 }}>
                       <div style={{ width: 280, borderTop: "1px solid #000" }}></div>
                       <div style={{ fontSize: 12.6, marginTop: 0.1, fontWeight: 700 }}>Assinatura do Paciente ou Responsável</div>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", marginTop: hPatientSignature ? 45 : -35, zIndex: 10 }}>
                     {!hSignatureLine && (
                       <>
                         <div style={{ width: 280, borderTop: "1px solid #000" }}></div>
                         <div style={{ fontSize: 12.6, marginTop: 0.1, fontWeight: 700, color: "#000" }}>Assinatura e Carimbo do Médico</div>
                       </>
                     )}
                  </div>
               </div>
            </div>

            <div style={{ borderTop: "1px solid #eee", paddingTop: 15, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
               <div style={{ fontSize: 9.5, color: "#555", lineHeight: 1.5 }}>
                 Documento assinado digitalmente de acordo com a ICP-Brasil, MP 2.200-2/2001, no sistema certificado SBIS nº 167, 168 169 e 170 v 5.2.<br />
                 por {data.medico?.toUpperCase()} em {data.dataAssinatura || data.dataEmissao} {data.horaAssinatura || "12:54"} Estado da assinatura: Válido<br />
                 Valide este documento em https://validaratestado.digital | Código: {data.codigoQR || "****.****"}<br />
                 <span style={{ fontSize: 8.5, fontWeight: 700 }}>**Esse documento possui dados sensíveis**</span>
               </div>
               <div style={{ fontSize: 11, color: "#555" }}>Página 1 de 1</div>
            </div>
          </div>
        ) : (
          /* ─── LAYOUT ATESTADO / LAUDO ─── */
          <>
            <div id="preview-header" style={{ position: "relative", height: 80, width: "100%", zIndex: 2, flexShrink: 0 }}>
              <div style={{ position: "absolute", left: 0, top: 0, width: 150, height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-start", overflow: "visible" }}>
                {effectiveLogoLeft && (
                  <img src={effectiveLogoLeft} crossOrigin={getCrossOrigin(effectiveLogoLeft)} style={{ maxHeight: "100%", maxWidth: 150, objectFit: "contain", transform: `scale(${logoLeftScale}) translate(${logoLeftX}px, ${logoLeftY}px)`, transformOrigin: "left center", transition: "transform 0.1s" }} alt="Logo" />
                )}
              </div>
              <div style={{ margin: "0 150px", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                {instituicao && <div style={{ fontSize: 14.7, fontWeight: 700, textTransform: "uppercase", marginBottom: 2, color: "#000", lineHeight: 1.3 }}>{instituicao}</div>}
                {unidade && unidade !== instituicao && <div style={{ fontSize: 12.6, fontWeight: 700, textTransform: "uppercase", marginBottom: 2, color: "#000", lineHeight: 1.3 }}>{unidade}</div>}
                {enderecoEmitente && <div style={{ fontSize: 11.025, fontWeight: 400, textTransform: "uppercase", color: "#000", lineHeight: 1.3 }}>{enderecoEmitente}</div>}
              </div>
              <div style={{ position: "absolute", right: 0, top: 0, width: 150, height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-end", overflow: "visible" }}>
                {effectiveLogoRight && (
                  <img src={effectiveLogoRight} crossOrigin={getCrossOrigin(effectiveLogoRight)} style={{ maxHeight: "100%", maxWidth: 150, objectFit: "contain", transform: `scale(${logoRightScale}) translate(${logoRightX}px, ${logoRightY}px)`, transformOrigin: "right center", transition: "transform 0.1s" }} alt="Logo Direita" />
                )}
              </div>
            </div>

            <div style={{ fontWeight: 900, fontSize: 23.15, textTransform: "uppercase", textAlign: "center", marginTop: 15, marginBottom: 11, color: "#000", flexShrink: 0 }}>
              {docType === 'laudo' ? "LAUDO MÉDICO" : "ATESTADO MÉDICO"}
            </div>
            <div style={{ borderTop: "2.04px solid #000", width: "100%", marginBottom: 23, zIndex: 2, flexShrink: 0 }} />

            <div id="preview-patient" style={{ border: "1px solid #000", padding: isExporting ? "6px 15px 22px 15px" : "14.25px 15px", fontSize: 10.815, marginBottom: 10, lineHeight: 1.2, zIndex: 2, background: "#fff", flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", color: "#000" }}>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", color: "#000" }}>
                <div style={{ flex: 3 }}><span style={{ fontWeight: 700, color: "#000" }}>Paciente: </span><span style={{ textTransform: "uppercase", color: "#000" }}>{data.paciente}</span></div>
                <div><span style={{ fontWeight: 700, color: "#000" }}>Sexo: </span><span style={{ color: "#000" }}>{sexoLabel}</span></div>
                <div><span style={{ fontWeight: 700, color: "#000" }}>Nasc.: </span><span style={{ color: "#000" }}>{data.nascimento}</span></div>
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", color: "#000" }}>
                <div style={{ flex: 1 }}><span style={{ fontWeight: 700, color: "#000" }}>{data.tipoDoc === "CNS" ? "Cartão Nacional:" : "CPF:"} </span><span style={{ textTransform: "uppercase", color: "#000" }}>{data.cpf || data.cns || "___________"}</span></div>
                <div style={{ flex: 2 }}><span style={{ fontWeight: 700, color: "#000" }}>Nome da Mãe: </span><span style={{ textTransform: "uppercase", color: "#000" }}>{data.nomeMae}</span></div>
              </div>
              <div style={{ display: "flex", justifyContent: "center", color: "#000" }}>
                <div style={{ width: "100%" }}><span style={{ fontWeight: 700, color: "#000" }}>Endereço: </span><span style={{ textTransform: "uppercase", color: "#000" }}>{data.endereco}</span></div>
              </div>
            </div>

            {enderecoEmitente && (
              <div style={{ fontSize: 10.5, lineHeight: 1.2, textAlign: "left", zIndex: 2, flexShrink: 0, marginBottom: 22, color: "#000", textTransform: "uppercase" }}>
                <span style={{ fontWeight: 700 }}>ENDEREÇO EMITENTE:</span> <span style={{ fontWeight: 400 }}>{enderecoEmitente}</span>
              </div>
            )}

            <div id="preview-body" style={{ flex: "1 1 auto", fontSize: 15.18, lineHeight: 1.9, textAlign: "justify", zIndex: 2, paddingTop: 48, paddingBottom: 8, color: "#000" }}>
              <p style={{ margin: 0, textIndent: "4em", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{"  "}{textoAtestado || "Atesto para os devidos fins..."}</p>
              {cidDisplay && <div style={{ fontWeight: 700, fontSize: 13.42, marginTop: 28, color: "#000", textTransform: "uppercase" }}>CID: {cidDisplay}{cidNome ? ` — ${cidNome}` : ""}</div>}
            </div>

            {!hQRCode && (
              <div id="preview-footer" style={{ marginTop: modoCarimbo ? 20 : "auto", position: "relative", zIndex: 2, flexShrink: 0, width: "100%" }}>
                <div style={{ borderTop: "2px solid #000", marginBottom: 6 }} />
                <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", width: "100%" }}>
                  <div style={{ color: "#000", lineHeight: 1.2, height: 111, paddingBottom: 4, display: "flex", flexDirection: "column", justifyContent: "flex-end", marginRight: "auto" }}>
                    <div style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 10.21 }}>{dataFormatada}</div>
                    <div style={{ fontSize: 9.65 }}>Valide este documento acessando o endereço:</div>
                    <strong style={{ fontSize: 10.21, display: "block" }}>https://validaratestado.digital</strong>
                    <div style={{ display: "flex", alignItems: "center" }}><span style={{ fontSize: 9.65 }}>Código: </span><strong style={{ fontSize: 10.21, marginLeft: 2 }}>{isEmitted ? data.codigoQR : "****.****"}</strong></div>
                  </div>
                  <div style={{ border: "1px solid #000", width: 385, height: 111, display: "flex", alignItems: "center", background: "white", paddingRight: 10 }}>
                    <div style={{ width: 108, display: "flex", alignItems: "center", justifyContent: "center" }}><QRCode value={qrValue} size={96} level="H" style={{ filter: isEmitted ? "none" : "blur(4px)", opacity: isEmitted ? 1 : 0.5 }} /></div>
                    {!hSignatureLine && (
                      <div style={{ flex: 1, textAlign: "right", color: "#000" }}>
                        <div style={{ fontSize: 9.5 }}>Documento assinado digitalmente conforme MP nº 2.200-2</div>
                        <strong style={{ fontSize: 11.2, textTransform: "uppercase" }}>{data.medico}</strong>
                        <span style={{ display: "block", fontSize: 10.1 }}>{data.crm}</span>
                        <span style={{ display: "block", fontSize: 10.1, textTransform: "uppercase" }}>{data.especialidade}</span>
                        <span style={{ display: "block", fontSize: 10.1 }}>Assinado em {data.dataAssinatura} {data.horaAssinatura}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* ===== CARIMBO ELITE (UNIFICADO) ===== */}
        {modoCarimbo && (
          <div style={{
            position: "absolute", bottom: hQRCode ? 100 : 150, left: "50%", marginLeft: -150, zIndex: 99,
            transform: `scale(${sScale}) translate(${sX}px, ${sY}px) rotate(${sRotate}deg)`, transformOrigin: "center center"
          }}>
            <div style={{ position: "relative", textAlign: "center" }}>
               {fotoAssinatura && <img src={fotoAssinatura} style={{ maxWidth: 273, maxHeight: 89, background: "transparent" }} alt="Carimbo" />}
               {sStampInfo && (
                 <div style={{ color: corAssinatura, marginTop: -5, opacity: 0.9, textAlign: "center", lineHeight: 1.1 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.2, margin: 0 }}>{data.medico?.toUpperCase()}</div>
                    {data.especialidade && <div style={{ fontSize: 11, margin: 0 }}>{data.especialidade.toUpperCase()}</div>}
                    <div style={{ fontSize: 11, margin: 0 }}>{data.crm}</div>
                 </div>
               )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

AttestationDocument.displayName = "AttestationDocument";
export default AttestationDocument;
export type { AttestationData };
