/**
 * Histórico UNINTER — Edição de Documento Emitido
 * Rota: /editar/historicocria/:id
 */
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Download, ZoomIn, ZoomOut,
  PanelLeftClose, PanelLeft, CheckCircle2,
  ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import { useSubstitutionUninter } from "@/hooks/useSubstitutionUninter";
import SubstitutionPanelUninter from "@/components/SubstitutionPanelUninter";
import UninterDocument, { Page1, Page2, Page3, Page4, GradePage } from "@/components/DocumentPages";
import { usePDFExport, generatePDFFilename } from "@/lib/pdfExport";
import HistoricoUNINTERDocument from "@/components/HistoricoUNINTERDocument";

export default function HistoricoEditar() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const docId = params.id;
  
  const printRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting: isDownloading } = usePDFExport();

  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(0.68);
  const [showHighlights, setShowHighlights] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saved, setSaved] = useState(false);

  const {
    fields,
    fieldMap,
    activeHistorico,
    activeProfile,
    modifiedCount,
    gradeRows,
    updateField,
    loadFromFieldMap,
    handleGenerateGrade,
    applyHistorico,
    applyImportText,
    setImportText,
    importText
  } = useSubstitutionUninter();

  // 1. Carregar dados do documento
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await fetch(`/api/documents/historico-uninter/${docId}`, { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          const docData = json.data || json;
          const parsedData = typeof docData.data === "string" ? JSON.parse(docData.data) : (docData.data || docData);
          
          loadFromFieldMap(parsedData, docData.historicoKey || parsedData.historicoKey, parsedData.gradeRows);
        } else {
          toast.error("Documento não encontrado");
          setLocation("/dashboard");
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar documento");
      } finally {
        setIsLoading(false);
      }
    };
    if (docId) fetchDoc();
  }, [docId, loadFromFieldMap, setLocation]);

  const formatDateExtenso = (dateStr: string) => {
    if (!dateStr || !dateStr.includes("/")) return undefined;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return undefined;
    const [day, month, year] = parts;
    const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const mIdx = parseInt(month) - 1;
    if (isNaN(mIdx) || mIdx < 0 || mIdx > 11) return undefined;

    // Tenta extrair Cidade/UF do endereço linear
    let location = "Curitiba/PR";
    const addr = fieldMap.endereco || "";
    const locMatch = addr.match(/,\s*([^,]+)\/([A-Z]{2})\s+\d{5}/i);
    if (locMatch) {
      location = `${locMatch[1].trim()}/${locMatch[2].toUpperCase()}`;
    } else if (fieldMap.unidade_uf) {
      location = `Cidade/${fieldMap.unidade_uf}`;
    }

    return `${location}, ${parseInt(day)} de ${months[mIdx]} de ${year}.`;
  };

  const effectiveDateText = useMemo(() => formatDateExtenso(fieldMap.expedicao_diploma || ""), [fieldMap.expedicao_diploma, fieldMap.endereco, fieldMap.unidade_uf]);

  const showPage4 = activeHistorico !== "pedagogia";

  const gradeChunks = useMemo(() => {
    const remaining = [...gradeRows];
    const chunks: any[][] = [];
    const MAX_ROWS_LAST = 36;
    const MAX_ROWS_INT = 62;

    if (remaining.length === 0) {
       chunks.push([{ anoMes: "", disciplina: "Nenhuma disciplina informada", ch: "", media: "", resultado: "", docente: "", titulacao: "" }]);
    } else {
      while (remaining.length > 0) {
        if (remaining.length <= MAX_ROWS_LAST) {
          chunks.push(remaining.splice(0, remaining.length));
        } else if (remaining.length <= MAX_ROWS_INT) {
           chunks.push(remaining.splice(0, Math.floor(remaining.length / 2)));
        } else {
          chunks.push(remaining.splice(0, MAX_ROWS_INT));
        }
      }
    }
    return chunks;
  }, [gradeRows]);

  const pageList = useMemo(() => {
    const list: { id: string; label: string; type: string; chunkIdx?: number }[] = [
      { id: "p1", label: "Pág 1: Informativo", type: "fixed" },
      { id: "p2", label: "Pág 2: Certificado", type: "fixed" },
      { id: "p3", label: "Pág 3: Histórico", type: "fixed" },
    ];
    if (showPage4) list.push({ id: "p4", label: "Pág 4: Selo", type: "fixed" });
    gradeChunks.forEach((_, i) => list.push({ id: `g${i}`, label: `Grade Pág ${i + 1}`, type: "grade", chunkIdx: i }));
    return list;
  }, [showPage4, gradeChunks]);

  const totalPages = pageList.length;

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  }, [totalPages]);

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const nome = fieldMap.nome || "";
      const payload = {
        nome,
        cpf: fieldMap.cpf || "", // O hook deve bloquear no UI, mas enviamos o valor atual
        historicoKey: activeHistorico,
        gradeRows,
        data: { ...fieldMap, gradeRows },
      };
      const res = await fetch(`/api/documents/historico-uninter/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.success) {
        setSaved(true);
        toast.success("Alterações salvas com sucesso!");
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast.error(result.error || "Erro ao salvar alterações");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = useCallback(async () => {
    if (!printRef.current) return;
    try {
      const nome = fieldMap.nome || "DOCUMENTO";
      await exportPDF(printRef.current, {
        filename: generatePDFFilename(nome, "historico-uninter", "EDITADO"),
        docType: "historico-uninter",
        multiPage: true,
      });
      toast.success("PDF gerado!");
    } catch (err) {
      toast.error("Erro ao exportar PDF.");
    }
  }, [exportPDF, fieldMap]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#005CA9]" />
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Carregando Histórico...</p>
        </div>
      </div>
    );
  }

  const renderCurrentPage = () => {
    const pageData = pageList[currentPage - 1];
    if (!pageData) return null;

    const props = { 
      f: { ...fieldMap, dateText: effectiveDateText || "" }, 
      highlightModified: showHighlights, 
      profileKey: activeProfile || undefined,
    };
    
    if (pageData.type === "fixed") {
      if (pageData.id === "p1") return <Page1 {...props} />;
      if (pageData.id === "p2") return <Page2 {...props} />;
      if (pageData.id === "p3") return <Page3 {...props} />;
      if (pageData.id === "p4") return <Page4 />;
    }
    
    if (pageData.type === "grade" && pageData.chunkIdx !== undefined) {
      return (
        <GradePage
          {...props}
          rows={gradeChunks[pageData.chunkIdx]}
          isLast={pageData.chunkIdx === gradeChunks.length - 1}
        />
      );
    }
    return <Page1 {...props} />;
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans">
      {/* Header Edição */}
      <header className="h-14 bg-[#1e293b] flex items-center px-6 gap-4 shrink-0 shadow-md z-20">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border border-white/10"
        >
          <ArrowLeft size={14} /> VOLTAR
        </button>
        <div className="h-8 w-px bg-white/20" />
        <h1 className="text-sm font-black tracking-tight text-white uppercase italic">
          DocMaster <span className="font-light mx-1">|</span> Modo Edição Segura
        </h1>
        
        <div className="ml-auto flex items-center gap-3">
          <button
            className="flex items-center gap-2 text-xs font-black h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-lg active:scale-95 disabled:opacity-50"
            onClick={handleSaveEdit}
            disabled={isSaving}
          >
            <Save size={14} />
            {isSaving ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
          </button>
          <button
            className="flex items-center gap-2 text-xs font-black h-9 px-5 rounded-xl bg-white text-[#1e293b] hover:bg-slate-100 transition-all shadow-lg active:scale-95"
            onClick={handleExportPDF}
          >
            <Download size={14} /> EXPORTAR PDF
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`transition-all duration-300 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl z-10 flex flex-col ${sidebarOpen ? "w-[420px]" : "w-0 overflow-hidden"}`}>
            <SubstitutionPanelUninter
              fields={fields}
              activeHistorico={activeHistorico}
              modifiedCount={modifiedCount}
              importText={importText}
              onUpdateImportText={setImportText}
              onApplyImportText={applyImportText}
              onApplyHistorico={applyHistorico}
              onUpdateField={updateField}
              onGenerateMatricula={() => {}}
              onReset={() => {}}
              onGenerateGrade={handleGenerateGrade}
              onEmit={handleSaveEdit}
              isExporting={isSaving}
              saved={saved}
              isEditMode={true}
            />
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-100 dark:bg-slate-900/50">
          {/* Toolbar */}
          <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center px-4 gap-4 shrink-0 shadow-sm relative z-0">
            <button
              className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>
            <div className="h-6 w-px bg-gray-200 dark:bg-slate-800" />
            
            <div className="flex items-center gap-1">
              <button
                className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all disabled:opacity-30"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex gap-1 overflow-x-auto max-w-[300px] scrollbar-hide">
                {pageList.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => goToPage(i + 1)}
                    className={`h-7 min-w-[28px] px-2 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                      (i + 1) === currentPage ? "bg-[#005CA9] text-white shadow-md shadow-blue-200" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all disabled:opacity-30"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                  showHighlights ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
                onClick={() => setShowHighlights(!showHighlights)}
              >
                <CheckCircle2 size={14} className={showHighlights ? "text-blue-600" : "text-gray-300"} />
                {showHighlights ? "VER ORIGINAL" : "VER MODIFICAÇÕES"}
              </button>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
                <button className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all" onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}><ZoomOut size={16} /></button>
                <span className="text-[10px] font-black text-gray-600 dark:text-slate-400 min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
                <button className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all" onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}><ZoomIn size={16} /></button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto flex justify-center py-10 custom-scrollbar bg-slate-200 dark:bg-slate-900/80 relative">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)" }}>
              <div className="bg-white shadow-[0_40px_80px_rgba(0,0,0,0.2)] rounded-sm overflow-hidden border border-slate-300 dark:border-slate-800">
                {renderCurrentPage()}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Exportação Multi-página Oculta */}
      <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
        <HistoricoUNINTERDocument
          ref={printRef}
          data={{ ...fieldMap, dateText: effectiveDateText || "" }}
          gradeRows={gradeRows}
          profileKey={activeProfile || undefined}
          highlightModified={showHighlights}
        />
      </div>
    </div>
  );
}
