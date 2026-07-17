/**
 * Validation.tsx — Página UNIVERSAL de validação de documentos
 *
 * Suporta TODOS os tipos de documentos:
 * - Atestados (AttestationDocument → PDF)
 * - Receitas  (PrescricaoDocument → PDF)
 * - CNH       (CNHDocument → JPEG via Canvas)
 * - Futuros   (fallback genérico com dados JSON)
 *
 * Fluxo:
 * 1. Usuário digita Código de Autenticação (XXXX.XXXX) + Data de Emissão
 * 2. Clica em VALIDAR DOCUMENTO
 * 3. API /api/validate/:code retorna os dados do documento
 * 4. Modal fullscreen abre com visualização do documento
 *
 * Rotas que usam este componente:
 * - /v/:id                                (genérico docmaster.store)
 * - /verificar/atestado/:id               (validaratestado.digital)
 * - /verificar/receita/:id                (verificamed.digital)
 * - /verificar/:id                        (carteira-digital-transito-vio.digital)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import AttestationDocument from "@/components/AttestationDocument";
import PrescricaoDocument from "@/components/PrescricaoDocument";
import CNHDocument from "@/components/CNHDocument";
import { useParams } from "wouter";
import { exportElementToPDF, exportElementToPDFBlob, generatePDFFilename } from "@/lib/pdfExport";

type DocType = "atestado" | "receita" | "cnh" | "laudo" | "relatorio" | "unknown";

function detectDocType(data: any): DocType {
  const typeStr = (data.documentType || data.document_type || data.tipo || data.type || "").toLowerCase();
  if (typeStr === "receita") return "receita";
  if (typeStr === "cnh") return "cnh";
  if (typeStr === "laudo") return "laudo";
  if (typeStr === "relatorio") return "relatorio";
  if (typeStr === "atestado") return "atestado";
  
  // Fallback por campos
  if (data.prescricao) return "receita";
  if (data.categoria || data.registro) return "cnh";
  if (data.textoAtestado || data.afastamento) return "atestado";
  return "unknown";
}

export default function Validation() {
  const params = useParams();
  
  const isCNHValidationDomain = typeof window !== 'undefined' &&
    (window.location.hostname === 'carteira-digital-transito-vio.digital' ||
     window.location.hostname === 'www.carteira-digital-transito-vio.digital');

  // ── Sincronia de Background Global ───────────────────────────────────────
  useEffect(() => {
    // Forçar fundo cinza no body para evitar bordas brancas em qualquer resolução
    const originalBg = document.body.style.backgroundColor;
    const originalMargin = document.body.style.margin;
    
    document.body.style.backgroundColor = "#f0f2f5";
    document.body.style.margin = "0";
    document.documentElement.style.backgroundColor = "#f0f2f5";

    return () => {
      document.body.style.backgroundColor = originalBg;
      document.body.style.margin = originalMargin;
      document.documentElement.style.backgroundColor = "";
    };
  }, []);

  // ── Estados ──────────────────────────────────────────────────────────────
  const [codigo, setCodigo] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [validDoc, setValidDoc] = useState<any>(null);
  const [docType, setDocType] = useState<DocType>("unknown");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  // ── Smart Preview (Navigation & Zoom) ────────────────────────────────────
  const [zoomScale, setZoomScale] = useState(0.65);
  const [zoomTranslateY, setZoomTranslateY] = useState(0);
  const [currentSection, setCurrentSection] = useState<"top" | "bottom" | "all">("all");
  const [isFocused, setIsFocused] = useState(false);

  // Refs para os documentos (usado para gerar PDF)
  const attestationRef = useRef<HTMLDivElement>(null);
  const prescricaoRef = useRef<HTMLDivElement>(null);
  const cnhRef = useRef<any>(null);

  // ── Smart Preview Logic ──────────────────────────────────────────────────
  const calculateZoom = useCallback(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth < 900;
    const containerHeight = window.innerHeight - 120; // Espaço do modal
    const docWidth = 794;
    const docHeight = 1123;

    if (!isFocused) {
      // Fit to screen
      const availableWidth = window.innerWidth - (isMobile ? 16 : 300);
      const scaleW = availableWidth / docWidth;
      const scaleH = containerHeight / docHeight;
      const finalScale = Math.min(scaleW, scaleH, 1) * 0.95;
      setZoomScale(finalScale);
      setZoomTranslateY(0);
      setCurrentSection("all");
    } else {
      // Focused mode
      const finalScale = (window.innerWidth - 32) / docWidth;
      setZoomScale(Math.min(finalScale, 1.2));
      // No modo foco, o translateY é controlado pelos botões
    }
  }, [isFocused]);

  useEffect(() => {
    if (showViewer) {
      calculateZoom();
      window.addEventListener("resize", calculateZoom);
      return () => window.removeEventListener("resize", calculateZoom);
    }
  }, [showViewer, calculateZoom]);

  const scrollToPreviewSection = (section: "top" | "bottom") => {
    setIsFocused(true);
    setCurrentSection(section);
    const docHeight = 1123;
    const containerHeight = window.innerHeight - 120;
    
    // Calcula o translateY para centralizar a seção
    // Seção TOP: topo no topo
    // Seção BOTTOM: base na base
    if (section === "top") {
      setZoomTranslateY(0);
    } else {
      const scale = Math.min((window.innerWidth - 32) / 794, 1.2);
      const visibleHeight = containerHeight / scale;
      const offset = docHeight - visibleHeight;
      setZoomTranslateY(-Math.max(0, offset));
    }
  };

  const resetPreviewZoom = () => {
    setIsFocused(false);
    calculateZoom();
  };

  // ── Limpar blob URL ao fechar o modal ────────────────────────────────────
  const handleClose = useCallback(() => {
    setShowViewer(false);
    setIsFocused(false);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  }, [pdfBlobUrl]);

  // ── Gerar PDF/JPEG blob após o documento ser renderizado ─────────────────
  useEffect(() => {
    if (!showViewer || !validDoc) return;
    const timer = setTimeout(async () => {
      setIsGeneratingPdf(true);
      try {
        if (docType === "cnh") {
          // CNH usa Canvas → JPEG
          if (cnhRef.current?.exportAsBlob) {
            const blob = await cnhRef.current.exportAsBlob();
            if (blob) {
              const url = URL.createObjectURL(blob);
              setPdfBlobUrl(url);
            }
          }
        } else if (docType === "atestado" && attestationRef.current) {
          const url = await exportElementToPDFBlob(attestationRef.current, { scale: 2 });
          setPdfBlobUrl(url);
        } else if (docType === "receita" && prescricaoRef.current) {
          const url = await exportElementToPDFBlob(prescricaoRef.current, { scale: 2 });
          setPdfBlobUrl(url);
        }
      } catch (err) {
        console.error("Erro ao gerar preview:", err);
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [showViewer, validDoc, docType]);

  // ── Validar documento ────────────────────────────────────────────────────
  const handleValidate = useCallback(async (codeOverride?: string, dateOverride?: string) => {
    const code = (codeOverride || codigo).trim().toUpperCase();
    if (!code) { setErrorMessage("Informe o código de autenticação."); return; }
    setIsValidating(true);
    setErrorMessage(null);
    setValidDoc(null);
    setShowViewer(false);
    setPdfBlobUrl(null);
    try {
      // Usar API do docmaster.store para validação (funciona para todos os domínios)
      const apiBase = window.location.hostname === "localhost"
        ? ""
        : "https://docmaster.store";
      const res = await fetch(`${apiBase}/api/validate/${encodeURIComponent(code)}`);
      const json = await res.json();
      
      if (json.valid && json.data) {
        // PRIORIDADE: Puxar dataEmissao do payload (data preenchida pelo usuário)
        const docDate = (json.data.dataEmissao || json.data.data_emissao || json.data.createdAt || "").trim();

        // [DEBUG] Logar exatamente o que vem do banco e da URL
        const dateInputRaw = (dateOverride || dataEmissao || "").trim();
        console.log("[Validation] DEBUG - RAW DATA:", {
          fromURL: dateInputRaw,
          fromDB: docDate,
          fullPayload: json.data
        });

        // 🛡️ VALIDAÇÃO ESTRITA DE DATA (CRÍTICO)
        // Só libera o preview se a data informada corresponder à data original
        if (dateInputRaw) {
          const toISO = (d: string) => {
            if (!d) return "";
            const nums = d.replace(/\D/g, "");
            if (nums.length === 8) {
              // Se for DD/MM/AAAA ou DDMMYYYY -> YYYY-MM-DD
              if (d.includes("/")) {
                const [dd, mm, yyyy] = d.split("/");
                return `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
              }
              // Se for YYYY-MM-DD vindo do banco (createdAt)
              if (d.includes("-") && d.indexOf("-") === 4) {
                return d.split("T")[0].split(" ")[0];
              }
              // Fallback para string pura de números DDMMYYYY
              return `${nums.slice(4, 8)}-${nums.slice(2, 4)}-${nums.slice(0, 2)}`;
            }
            return d.split("T")[0].split(" ")[0];
          };

          const inputISO = toISO(dateInputRaw);
          const docISO = toISO(docDate);

          if (inputISO !== docISO && inputISO && docISO) {
            setErrorMessage(`Data de emissão incorreta para este documento.`);
            setIsValidating(false);
            return;
          }
        } else {
          setErrorMessage("Data de emissão obrigatória para consulta.");
          setIsValidating(false);
          return;
        }
        
        // Injetar dataEmissao formatada se necessário para o componente
        const type = detectDocType(json.data);
        setDocType(type);
        setValidDoc({
          ...json.data,
          dataEmissao: docDate // Garante que o documento use a data correta
        });
        setShowViewer(true);
      } else {
        setErrorMessage(json.message || "Documento não encontrado na base de dados oficial.");
      }
    } catch (err) {
      console.error("Validation error:", err);
      setErrorMessage("Erro ao conectar com o servidor. Tente novamente.");
    } finally {
      setIsValidating(false);
    }
  }, [codigo, dataEmissao]);
  // ── Auto-validar se vier código na URL ──────────────────────────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromQuery = urlParams.get("codigo") || urlParams.get("code") || "";
    const codeFromPath = params.id ? (params.id as string) : "";
    const code = (codeFromQuery || codeFromPath).trim().toUpperCase();
    const dateParam = urlParams.get("data") || "";
    if (code) {
      setCodigo(code);
      if (dateParam) {
        if (dateParam.includes("-")) {
          const [y, m, d] = dateParam.split("-");
          setDataEmissao(`${d}/${m}/${y}`);
        } else {
          setDataEmissao(dateParam);
        }
      }
      setTimeout(() => handleValidate(code, dateParam), 200);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ── Download ─────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!validDoc) return;
    setIsDownloading(true);
    try {
      const nome = validDoc.paciente || validDoc.nome || "DOCUMENTO";
      if (docType === "cnh") {
        if (cnhRef.current?.exportAsBlob) {
          const blob = await cnhRef.current.exportAsBlob();
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `CNH_${nome.replace(/\s+/g, "_")}_VALIDADO.jpeg`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }
      } else {
        const ref = docType === "receita" ? prescricaoRef.current : attestationRef.current;
        if (ref) {
          // Criar container isolado para exportação 1:1 (Padrão Atestados Salvos)
          const container = document.createElement("div");
          container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:white;";
          document.body.appendChild(container);
          
          const clone = ref.cloneNode(true) as HTMLElement;
          clone.style.transform = "none";
          clone.style.margin = "0";
          clone.style.boxShadow = "none";
          container.appendChild(clone);

          await new Promise(r => setTimeout(r, 600));

          await exportElementToPDF(clone, {
            filename: generatePDFFilename(nome, docType as any, "VALIDADO"),
            scale: 2,
            quality: 0.92
          });

          document.body.removeChild(container);
        }
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Título por tipo de documento ─────────────────────────────────────────
  const getDocTitle = () => {
    switch (docType) {
      case "atestado": return "Atestado Médico";
      case "laudo": return "Laudo Médico";
      case "relatorio": return "Relatório Médico";
      case "receita": return "Receita Médica";
      case "cnh": return "Carteira Nacional de Habilitação";
      default: return "Documento";
    }
  };

  // ── Estilos ──────────────────────────────────────────────────────────────
  const S = {
    page: {
      minHeight: "100vh",
      width: "100%",
      background: "#f0f2f5",
      fontFamily: "Roboto, Arial, sans-serif",
      margin: 0,
      padding: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center", // Centralizar conteúdo horizontalmente
      overflowX: "hidden",
    } as React.CSSProperties,
    header: {
      background: isCNHValidationDomain ? "#0b2f6b" : "#005CA9",
      width: "100%",
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      boxSizing: "border-box" as const,
      flexShrink: 0,
    } as React.CSSProperties,
    headerText: {
      color: "#fff",
      fontSize: 17,
      fontWeight: 700,
      margin: 0,
      letterSpacing: 0.5,
    } as React.CSSProperties,
    card: {
      background: "#fff",
      borderRadius: 12,
      padding: "32px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      maxWidth: 480,
      width: "100%",
      margin: "60px auto",
      boxSizing: "border-box" as const,
    } as React.CSSProperties,
    cardTitle: {
      fontSize: 22,
      fontWeight: 800,
      color: "#111",
      margin: "0 0 24px",
      textAlign: "center" as const,
    } as React.CSSProperties,
    label: {
      fontSize: 13,
      fontWeight: 600,
      color: "#4b5563",
      display: "block",
      marginBottom: 6,
    } as React.CSSProperties,
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 8,
      border: "1.5px solid #d1d5db",
      fontSize: 16,
      outline: "none",
      fontFamily: "monospace",
      letterSpacing: 2,
      textAlign: "center" as const,
      textTransform: "uppercase" as const,
      boxSizing: "border-box" as const,
      marginBottom: 16,
      transition: "border-color 0.2s",
      background: "#fff",
      color: "#000",
    } as React.CSSProperties,
    inputDate: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 8,
      border: "1.5px solid #d1d5db",
      fontSize: 16,
      outline: "none",
      textAlign: "center" as const,
      boxSizing: "border-box" as const,
      marginBottom: 20,
      background: "#fff",
      color: "#000",
    } as React.CSSProperties,
    btnGreen: {
      background: isCNHValidationDomain ? "#1351b4" : "#16a34a",
      color: "#fff",
      border: "none",
      padding: "14px 20px",
      borderRadius: 8,
      fontSize: 15,
      fontWeight: 800,
      cursor: "pointer",
      width: "100%",
      letterSpacing: 0.5,
      marginBottom: 10,
      transition: "background 0.2s",
    } as React.CSSProperties,
    btnGray: {
      background: "#f3f4f6",
      color: "#374151",
      border: "1px solid #e5e7eb",
      padding: "12px 20px",
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      width: "100%",
      letterSpacing: 0.5,
    } as React.CSSProperties,
    btnBlue: {
      background: "#005CA9",
      color: "#fff",
      border: "none",
      padding: "12px 20px",
      borderRadius: 6,
      fontSize: 14,
      fontWeight: 700,
      cursor: "pointer",
      letterSpacing: 0.5,
    } as React.CSSProperties,
    modal: {
      position: "fixed" as const,
      inset: 0,
      background: "#ffffff",
      zIndex: 9999,
      display: "flex",
      flexDirection: "column" as const,
    } as React.CSSProperties,
    modalHeader: {
      background: "#166534",
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0,
      zIndex: 100,
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    } as React.CSSProperties,
    modalBody: {
      flex: 1,
      background: "#ffffff",
      overflow: "hidden", // Smart Preview gerencia o overflow
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      position: "relative" as const,
    } as React.CSSProperties,
    modalFooter: {
      background: "#fff",
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      borderTop: "1px solid #e5e7eb",
      flexShrink: 0,
    } as React.CSSProperties,
  };

  // ── Renderizar documento por tipo ─────────────────────────────────────────
  const renderDocument = (hidden = false) => {
    if (!validDoc) return null;
    const style: React.CSSProperties = hidden
      ? { position: "fixed", left: -9999, top: 0, visibility: "hidden", pointerEvents: "none", width: 794, background: "white" }
      : { background: "#fff", boxShadow: "0 10px 30px rgba(0,0,0,0.08)" };

    // Helper para garantir que as logos carreguem no validador
    const fixUrl = (url: string) => {
      if (!url) return "";
      if (url.startsWith("/") && !url.startsWith("//")) {
        return `https://docmaster.store${url}`;
      }
      return url;
    };

    switch (docType) {
      case "atestado":
      case "laudo":
      case "relatorio":
        return (
          <div style={style}>

            <AttestationDocument
              ref={attestationRef}
              data={validDoc}
              documentType={docType}
              logoLeft={fixUrl(validDoc.logoUrl || validDoc.logo_left)}
              logoRight={fixUrl(validDoc.logoRight || validDoc.logo_right)}
              signatureColor={validDoc.signatureColor || validDoc.signature_color}
              signatureImage={fixUrl(validDoc.signatureImage || validDoc.signature_image)}
              logoLeftScale={validDoc.logoLeftScale ?? validDoc.logo_left_scale}
              logoRightScale={validDoc.logoRightScale ?? validDoc.logo_right_scale}
              logoLeftX={validDoc.logoLeftX ?? validDoc.logo_left_x}
              logoLeftY={validDoc.logoLeftY ?? validDoc.logo_left_y}
              logoRightX={validDoc.logoRightX ?? validDoc.logo_right_x}
              logoRightY={validDoc.logoRightY ?? validDoc.logo_right_y}
              stampScale={validDoc.stampScale ?? validDoc.stamp_scale}
              stampX={validDoc.stampX ?? validDoc.stamp_x}
              stampY={validDoc.stampY ?? validDoc.stamp_y}
              stampRotate={validDoc.stampRotate ?? validDoc.stamp_rotate}
              showStampInfo={validDoc.showStampInfo ?? validDoc.show_stamp_info === 1}
              hideQRCode={validDoc.hideQRCode ?? validDoc.hide_qr_code === 1}
              hideSignatureLine={validDoc.hideSignatureLine ?? validDoc.hide_signature_line === 1}
              hidePatientSignature={validDoc.hidePatientSignature ?? validDoc.hide_patient_signature === 1}
              hideAfastamentoText={validDoc.hideAfastamentoText ?? validDoc.hide_afastamento_text === 1}
              modoCarimbo={validDoc.modoCarimbo ?? (validDoc.modo_carimbo === 1)}
              isExporting={hidden}
            />
          </div>
        );
      case "receita":
        return (
          <div style={style}>
            <PrescricaoDocument
              data={{
                ...validDoc,
                tipo_receituario: validDoc.tipo_receituario || "simples",
              }}
            />
          </div>
        );
      case "cnh":
        return (
          <div style={hidden ? { position: "fixed", left: -9999, top: 0, visibility: "hidden" } : { display: "flex", justifyContent: "center", padding: 0 }}>
            <CNHDocument
              ref={cnhRef}
              fotoUrl={validDoc.fotoUrl || validDoc.foto}
              assinaturaUrl={validDoc.assinaturaUrl || validDoc.assinatura}
              qrCodeUrl={`https://carteira-digital-transito-vio.digital/verificar/${validDoc.codigoQR || ""}`}
              blurQR={false}
              {...validDoc}
            />
          </div>
        );
      default:
        return (
          <div style={{ ...style, padding: 32, maxWidth: 640 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20, color: "#111", textAlign: "center" }}>Documento Validado</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <tbody>
                {Object.entries(validDoc).filter(([k]) => !["id", "tipo", "pdf_data", "created_at"].includes(k)).map(([key, val]) => (
                  <tr key={key} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: "#4b5563", textTransform: "capitalize", width: "40%" }}>{key.replace(/_/g, " ")}</td>
                    <td style={{ padding: "12px 16px", color: "#111" }}>{String(val || "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  return (
    <div style={S.page}>
      {/* 🛡️ FORCE BRUTE CSS PARA ELIMINAR BORDAS BRANCAS */}
      <style>{`
        html, body, #root {
          background-color: #f0f2f5 !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow-x: hidden !important;
        }
      `}</style>
    {/* ── Header azul ── */}
    <div style={S.header}>
      {isCNHValidationDomain ? (
        <span style={S.headerText}>Validador VIO - Carteira Digital de Trânsito</span>
      ) : (
        <>
          {window.location.hostname.includes("validaratestado.digital") && (
            <span style={{ fontSize: 24, lineHeight: "1", display: "flex", alignItems: "center" }}>🛡️</span>
          )}
          <span style={S.headerText}>Validador Oficial</span>
        </>
      )}
    </div>

      {/* ── Card central ── */}
      <div style={{ padding: "0 16px", width: "100%", display: "flex", justifyContent: "center" }}>
        <div style={S.card}>
          <h2 style={S.cardTitle}>
            {isCNHValidationDomain ? "Consultar Carteira de Habilitação" : "Consultar Documento"}
          </h2>

          <label style={S.label}>Código de Autenticação</label>
          <input
            style={S.input}
            value={codigo}
            onChange={(e) => {
              let inputVal = e.target.value.toUpperCase();
              const isDeleting = inputVal.length < codigo.length;
              let rawAlphaNum = inputVal.replace(/[^A-Z0-9]/g, "");

              if (rawAlphaNum.length > 8) rawAlphaNum = rawAlphaNum.slice(0, 8);

              let formattedVal = rawAlphaNum;

              if (rawAlphaNum.length > 4) {
                formattedVal = rawAlphaNum.slice(0, 4) + "." + rawAlphaNum.slice(4);
              } else if (rawAlphaNum.length === 4 && !isDeleting) {
                formattedVal = rawAlphaNum + ".";
              } else if (rawAlphaNum.length === 4 && isDeleting && codigo.endsWith(".")) {
                formattedVal = rawAlphaNum;
              }

              setCodigo(formattedVal);
            }}
            placeholder="XXXX.XXXX"
            maxLength={9}
            onKeyDown={(e) => e.key === "Enter" && handleValidate()}
            required
          />

          <label style={S.label}>Data de Emissão *</label>
          <input
            type="date"
            style={S.inputDate}
            value={(() => {
              if (!dataEmissao) return "";
              if (dataEmissao.includes("-")) return dataEmissao; // Já é YYYY-MM-DD
              const [dd, mm, yyyy] = dataEmissao.split("/");
              if (dd && mm && yyyy) return `${yyyy}-${mm}-${dd}`;
              return "";
            })()}
            onChange={(e) => {
              const val = e.target.value; // YYYY-MM-DD
              if (!val) {
                setDataEmissao("");
                return;
              }
              const [yyyy, mm, dd] = val.split("-");
              setDataEmissao(`${dd}/${mm}/${yyyy}`);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleValidate()}
            required
          />

          <button
            style={{ ...S.btnGreen, opacity: isValidating ? 0.7 : 1 }}
            onClick={() => handleValidate()}
            disabled={isValidating}
          >
            {isValidating ? "Verificando..." : isCNHValidationDomain ? "VALIDAR CNH" : "VALIDAR DOCUMENTO"}
          </button>

          <button
            style={S.btnGray}
            onClick={() => {
              setCodigo("");
              setDataEmissao("");
              setErrorMessage(null);
              setValidDoc(null);
              setShowViewer(false);
              if (pdfBlobUrl) { URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); }
            }}
          >
            LIMPAR
          </button>

          {errorMessage && (
            <div style={{
              marginTop: 16, padding: "12px 16px",
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 8, color: "#dc2626", fontSize: 13, fontWeight: 700,
              textAlign: "center",
            }}>
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* ── Documento oculto para geração de PDF/JPEG ── */}
      {showViewer && validDoc && renderDocument(true)}

      {/* ── Modal Fullscreen ── */}
      {showViewer && validDoc && (
        <div style={S.modal}>
          {/* Header Verde Premium */}
          <div style={{
            ...S.modalHeader,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            padding: "10px 16px",
            gap: 10
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div style={{ width: 18, height: 18, background: "#22c55e", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 900 }}>✓</div>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 12, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                VÁLIDO
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 150, textAlign: "right" }}>
              <span style={{ 
                color: "#fff",
                fontWeight: 800, 
                fontSize: "clamp(12px, 3.5vw, 15px)", 
                textTransform: "uppercase", 
                lineHeight: "1.3",
                wordBreak: "break-word",
                display: "inline-block",
                maxWidth: "100%",
              }}>
                {validDoc.paciente || validDoc.nome || "—"}
              </span>
            </div>
          </div>

          {/* Body com Smart Preview */}
          <div style={S.modalBody}>
            {docType === "cnh" && pdfBlobUrl ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
                <img
                  src={pdfBlobUrl}
                  alt="CNH Digital Validada"
                  style={{ maxWidth: "100%", maxHeight: "calc(100vh - 120px)", borderRadius: 4, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}
                />
              </div>
            ) : (
              <div style={{
                width: 794,
                flexShrink: 0,
                transform: `scale(${zoomScale}) translateY(${zoomTranslateY}px)`,
                transformOrigin: "top center",
                transition: "transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
              }}>
                {renderDocument(false)}
              </div>
            )}
          </div>

          {/* Footer de Ações */}
          <div style={S.modalFooter}>
            <button
              style={{ ...S.btnGray, width: "auto", padding: "12px 24px", marginBottom: 0 }}
              onClick={handleClose}
            >
              FECHAR
            </button>
            <button
              style={{ ...S.btnBlue, flex: 1, opacity: isDownloading ? 0.7 : 1, padding: "12px 24px" }}
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? "Gerando..." : docType === "cnh" ? "⬇️ BAIXAR JPEG" : "⬇️ BAIXAR PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
