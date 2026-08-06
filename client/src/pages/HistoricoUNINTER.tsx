/**
 * Histórico UNINTER — DocMaster
 * Layout: DocumentPages (réplica visual do histórico UNINTER — 6 páginas)
 * Fluxo: DocMaster (useAuth, fetch, EmissionModal, jsPDF + html2canvas)
 */
import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  ArrowLeft, Download, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Eye, EyeOff,
  PanelLeftClose, PanelLeft
} from "lucide-react";
import EmissionModal from "@/components/EmissionModal";
import { useSubstitutionUninter } from "@/hooks/useSubstitutionUninter";
import SubstitutionPanelUninter from "@/components/SubstitutionPanelUninter";
import { Page1, Page2, Page3, Page4, Page5, Page6 } from "@/components/DocumentPages";
import { LOGO_URL, ASSINATURA_URL, SELO_URL, PROFILES } from "@/lib/documentData_uninter";

const TOTAL_PAGES = 6;
const PAGE_LABELS = [
  "Informativo Colação",
  "Certificado Conclusão",
  "Histórico Escolar",
  "Selo UNINTER",
  "Componentes Curriculares (1)",
  "Componentes Curriculares (2)",
];

const PAGE_WIDTH_MM = 207.53;
const PAGE_HEIGHT_MM = 293.47;

async function imageUrlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject("No canvas context"); return; }
      ctx.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch {
        fetch(url).then(r => r.blob()).then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject("FileReader error");
          reader.readAsDataURL(blob);
        }).catch(reject);
      }
    };
    img.onerror = () => {
      fetch(url).then(r => r.blob()).then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject("FileReader error");
        reader.readAsDataURL(blob);
      }).catch(reject);
    };
    img.src = url;
  });
}

async function preloadImagesAsBase64(): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  const urls = [LOGO_URL, ASSINATURA_URL, SELO_URL];
  for (const url of urls) {
    try {
      const b64 = await imageUrlToBase64(url);
      urlMap.set(url, b64);
    } catch { /* mantém src original */ }
  }
  return urlMap;
}

function replaceImageUrls(html: string, urlMap: Map<string, string>): string {
  let result = html;
  urlMap.forEach((b64, url) => { result = result.split(url).join(b64); });
  return result;
}

function buildIframeCSS(widthMm: number, heightMm: number): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; background: white; color: #000; }
    .doc-page {
      width: ${widthMm}mm; height: ${heightMm}mm;
      min-height: ${heightMm}mm; max-height: ${heightMm}mm;
      background: white; padding: 18mm 22mm 15mm 22mm;
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt; line-height: 1.35; color: #000;
      position: relative; box-sizing: border-box; overflow: visible;
    }
    .doc-page .fieldset-box { border: 1px solid #000; padding: 8px 10px; margin: 8px 0; position: relative; }
    .doc-page .fieldset-box .legend { position: absolute; top: -10px; left: 10px; background: #fff; padding: 0 5px; font-weight: bold; font-size: 10pt; }
    .doc-page .grade-table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 4px; }
    .doc-page .grade-table th { text-align: left; font-weight: bold; border-bottom: 1px solid #000; padding: 2px 4px; font-size: 8pt; }
    .doc-page .grade-table td { padding: 2px 4px; border-bottom: 0.5px solid #ccc; vertical-align: top; font-size: 8pt; }
    .editable-field { position: relative; }
    .editable-field.modified { background-color: rgba(232, 163, 23, 0.12); border-radius: 2px; }
    img { display: block; max-width: 100%; height: auto; }
    b, strong { font-weight: bold; } i, em { font-style: italic; } a { color: #000; text-decoration: underline; }
  `;
}

function normalizeFileSegment(value: string): string {
  return (value || "DOCUMENTO")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

export default function HistoricoUNINTER() {
  const { user, updateBalance } = useAuth();
  const [, setLocation] = useLocation();

  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(0.75);
  const [showHighlights, setShowHighlights] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const {
    fields,
    fieldMap,
    activeHistorico,
    activeProfile,
    modifiedCount,
    importText,
    applyHistorico,
    updateField,
    resetToOriginal,
    setImportText,
    applyImportText,
    generateMatricula,
  } = useSubstitutionUninter();

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= TOTAL_PAGES) setCurrentPage(page);
  }, []);

  const handleRequestEmit = useCallback(() => {
    const nome = fieldMap.nome || fieldMap.nome_aluno || fieldMap.nome_completo || "";
    if (!nome) { toast.error("Preencha o Nome do Aluno"); return; }
    if ((user?.balance || 0) <= 0) {
      toast.error("Saldo insuficiente. Recarregue para emitir documentos.");
      return;
    }
    setShowConfirmModal(true);
  }, [fieldMap, user?.balance]);

  const handleSave = useCallback(async () => {
    setIsExporting(true);
    try {
      const nome = fieldMap.nome || fieldMap.nome_aluno || fieldMap.nome_completo || "";
      const payload = {
        nome,
        cpf: fieldMap.cpf || "",
        rg: fieldMap.rg || "",
        ra: fieldMap.matricula || "",
        curso: fieldMap.curso || "",
        polo: fieldMap.polo || "",
        dataEmissao: fieldMap.data_expedicao_historico || "",
        dataConclusao: fieldMap.conclusao_curso || "",
        historicoKey: activeHistorico,
        profileKey: activeProfile,
        ...fieldMap,
      };
      const res = await fetch("/api/documents/historico-uninter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        if (result.newBalance !== undefined) updateBalance(result.newBalance);
        setSaved(true);
        setShowConfirmModal(false);
        setShowSuccessModal(true);
      } else {
        toast.error(result.error || "Erro ao gerar histórico");
        setShowConfirmModal(false);
      }
    } catch { toast.error("Erro de conexão"); setShowConfirmModal(false); }
    finally { setIsExporting(false); }
  }, [fieldMap, activeHistorico, activeProfile, updateBalance]);

  const handleExportPDF = useCallback(async () => {
    setIsDownloading(true);
    toast.info("Gerando PDF — carregando imagens...");
    try {
      const imageMap = await preloadImagesAsBase64();
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      const container = printRef.current;
      if (!container) { toast.error("Container de impressão não encontrado"); return; }

      const docPages = container.querySelectorAll(".doc-page");
      if (docPages.length === 0) { toast.error("Nenhuma página encontrada"); return; }

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [PAGE_WIDTH_MM, PAGE_HEIGHT_MM] });
      const iframeCSS = buildIframeCSS(PAGE_WIDTH_MM, PAGE_HEIGHT_MM);

      for (let i = 0; i < docPages.length; i++) {
        toast.info(`Processando página ${i + 1}/${docPages.length}...`);
        const pageEl = docPages[i] as HTMLElement;

        const iframe = document.createElement("iframe");
        iframe.style.cssText = `position:fixed;left:0;top:0;width:${PAGE_WIDTH_MM}mm;height:${PAGE_HEIGHT_MM}mm;border:none;z-index:99999;opacity:1;background:white;`;
        document.body.appendChild(iframe);

        await new Promise<void>((resolve) => { iframe.onload = () => resolve(); setTimeout(resolve, 200); });

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) { document.body.removeChild(iframe); continue; }

        let clonedHTML = pageEl.outerHTML;
        clonedHTML = replaceImageUrls(clonedHTML, imageMap);

        iframeDoc.open();
        iframeDoc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${iframeCSS}</style></head><body>${clonedHTML}</body></html>`);
        iframeDoc.close();

        const iframeImages = iframeDoc.querySelectorAll("img");
        await Promise.all(Array.from(iframeImages).map((img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) { resolve(); return; }
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
        ));

        await new Promise((r) => setTimeout(r, 300));

        const iframePage = iframeDoc.querySelector(".doc-page") as HTMLElement;
        if (!iframePage) { document.body.removeChild(iframe); continue; }

        const canvas = await html2canvas(iframePage, {
          scale: 2, useCORS: true, allowTaint: true,
          backgroundColor: "#ffffff", logging: false,
          windowWidth: iframePage.scrollWidth, windowHeight: iframePage.scrollHeight,
        });

        if (i > 0) pdf.addPage([PAGE_WIDTH_MM, PAGE_HEIGHT_MM], "portrait");
        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        pdf.addImage(imgData, "JPEG", 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);
        document.body.removeChild(iframe);
      }

      const nome = fieldMap.nome || fieldMap.nome_aluno || fieldMap.nome_completo || "DOCUMENTO";
      const filename = `HISTORICO_UNINTER_${normalizeFileSegment(nome)}.pdf`;
      pdf.save(filename);
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao exportar PDF: " + message);
    } finally {
      setIsDownloading(false);
    }
  }, [fieldMap]);

  const renderCurrentPage = () => {
    const props = { f: fieldMap, highlightModified: showHighlights, profileKey: activeProfile };
    switch (currentPage) {
      case 1: return <Page1 {...props} />;
      case 2: return <Page2 {...props} />;
      case 3: return <Page3 {...props} />;
      case 4: return <Page4 />;
      case 5: return <Page5 {...props} />;
      case 6: return <Page6 {...props} />;
      default: return <Page1 {...props} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-[#0a0a0f]">
        {/* Top Bar */}
        <header className="h-12 border-b border-[#1a1a2a] bg-[#0d0d14] flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-1 text-[#666688] hover:text-white text-sm px-2 py-1 rounded transition-colors"
          >
            <ArrowLeft size={15} className="mr-1" /> Voltar
          </button>
          <div className="h-6 w-px bg-[#2a2a3a]" />
          <h1 className="text-sm font-semibold tracking-wide text-white">
            Histórico UNINTER — Visualizador Interativo
          </h1>
          <div className="ml-auto flex items-center gap-2">
            {modifiedCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-400 font-medium">
                {modifiedCount} alterações
              </span>
            )}
            <button
              className="flex items-center gap-1 text-xs h-7 px-3 rounded border border-[#2a2a3a] text-[#aaaacc] hover:bg-[#1a1a2a] transition-colors"
              onClick={() => setShowHighlights(!showHighlights)}
            >
              {showHighlights ? <Eye size={13} className="mr-1" /> : <EyeOff size={13} className="mr-1" />}
              {showHighlights ? "Destaques ON" : "Destaques OFF"}
            </button>
            <button
              className="flex items-center gap-1 text-xs h-7 px-3 rounded bg-gradient-to-r from-[#c8aa32] to-[#a08828] hover:from-[#d4b83a] hover:to-[#b09830] text-[#0a0a0f] font-semibold transition-all disabled:opacity-60"
              onClick={handleRequestEmit}
              disabled={isExporting || saved}
            >
              <Download size={13} className="mr-1" />
              {saved ? "✅ Emitido" : isExporting ? "Processando..." : "Emitir e Exportar PDF"}
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {sidebarOpen && (
            <aside className="w-80 border-r border-[#1a1a2a] bg-[#0d0d14] shrink-0 flex flex-col overflow-hidden">
              <SubstitutionPanelUninter
                fields={fields}
                activeHistorico={activeHistorico}
                modifiedCount={modifiedCount}
                importText={importText}
                onUpdateImportText={setImportText}
                onApplyImportText={applyImportText}
                onApplyHistorico={applyHistorico}
                onUpdateField={updateField}
                onGenerateMatricula={generateMatricula}
                onReset={resetToOriginal}
              />
            </aside>
          )}

          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="h-10 border-b border-[#1a1a2a] bg-[#0a0a0f]/50 flex items-center px-3 gap-2 shrink-0">
              <button
                className="h-7 w-7 p-0 flex items-center justify-center text-[#666688] hover:text-white rounded transition-colors"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
              </button>
              <div className="h-4 w-px bg-[#2a2a3a] mx-1" />
              <button
                className="h-7 w-7 p-0 flex items-center justify-center text-[#666688] hover:text-white rounded transition-colors disabled:opacity-40"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={15} />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`h-7 min-w-[28px] px-2 rounded text-xs font-medium transition-colors ${
                      p === currentPage ? "bg-[#c8aa32] text-[#0a0a0f]" : "hover:bg-[#1a1a2a] text-[#666688]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                className="h-7 w-7 p-0 flex items-center justify-center text-[#666688] hover:text-white rounded transition-colors disabled:opacity-40"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === TOTAL_PAGES}
              >
                <ChevronRight size={15} />
              </button>
              <span className="text-xs text-[#555566] ml-2">{PAGE_LABELS[currentPage - 1]}</span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  className="h-7 w-7 p-0 flex items-center justify-center text-[#666688] hover:text-white rounded transition-colors"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                >
                  <ZoomOut size={14} />
                </button>
                <span className="text-xs text-[#aaaacc] w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button
                  className="h-7 w-7 p-0 flex items-center justify-center text-[#666688] hover:text-white rounded transition-colors"
                  onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex justify-center py-6" style={{ background: "#e8e8e8" }}>
              <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
                <div style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1)", borderRadius: 2 }}>
                  {renderCurrentPage()}
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Container oculto com TODAS as páginas para exportação PDF */}
        <div
          ref={printRef}
          style={{ position: "fixed", left: "-9999px", top: 0, width: `${PAGE_WIDTH_MM}mm`, background: "white", color: "#000" }}
        >
          <Page1 f={fieldMap} profileKey={activeProfile} />
          <Page2 f={fieldMap} profileKey={activeProfile} />
          <Page3 f={fieldMap} profileKey={activeProfile} />
          <Page4 />
          <Page5 f={fieldMap} profileKey={activeProfile} />
          <Page6 f={fieldMap} profileKey={activeProfile} />
        </div>
      </div>

      {/* Modal de Confirmação + Sucesso */}
      <EmissionModal
        docLabel="Histórico UNINTER"
        docEmoji="🎓"
        documentPrice={500}
        userBalance={user?.balance ?? 0}
        showConfirm={showConfirmModal}
        showSuccess={showSuccessModal}
        isEmitting={isExporting}
        isDownloading={isDownloading}
        onConfirm={handleSave}
        onCancel={() => setShowConfirmModal(false)}
        onDownload={handleExportPDF}
        onClose={() => setShowSuccessModal(false)}
        historyPath="/historico-uninter-salvos"
      />
    </DashboardLayout>
  );
}
