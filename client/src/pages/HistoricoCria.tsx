/**
 * Histórico UNINTER — DocMaster 3.0 (Universal)
 * Layout: UninterDocument (réplica visual do histórico UNINTER — Paginação Inteligente)
 * Fluxo: DocMaster (useAuth, fetch, EmissionModal, jsPDF + html2canvas)
 */
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ArrowLeft, Download, ZoomIn, ZoomOut,
  PanelLeftClose, PanelLeft, CheckCircle2,
  ChevronLeft, ChevronRight
} from "lucide-react";
import EmissionModal from "@/components/EmissionModal";
import { useSubstitutionUninter } from "@/hooks/useSubstitutionUninter";
import SubstitutionPanelUninter from "@/components/SubstitutionPanelUninter";
import UninterDocument, { Page1, Page2, Page3, Page4, GradePage } from "@/components/DocumentPages";
import { usePDFExport, generatePDFFilename } from "@/lib/pdfExport";
import HistoricoUNINTERDocument from "@/components/HistoricoUNINTERDocument";

export default function HistoricoCria() {
  const { user, updateBalance } = useAuth();
  const [, setLocation] = useLocation();
  const printRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting: isDownloading } = usePDFExport();

  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(0.68);
  const [showHighlights, setShowHighlights] = useState(false); // Padrão OFF
  const [isExporting, setIsExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    fields,
    fieldMap,
    activeHistorico,
    activeProfile,
    modifiedCount,
    importText,
    gradeRows,
    applyHistorico,
    updateField,
    resetToOriginal,
    setImportText,
    applyImportText,
    generateMatricula,
    handleGenerateGrade, 
  } = useSubstitutionUninter();

  const formatDateExtenso = (dateStr: string) => {
    if (!dateStr || !dateStr.includes("/")) return undefined;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return undefined;
    const [day, month, year] = parts;
    const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const mIdx = parseInt(month) - 1;
    if (isNaN(mIdx) || mIdx < 0 || mIdx > 11) return undefined;
    
    // Automação de Localidade: Prioriza campos dedicados extraídos via CEP
    let location = "Curitiba/PR";
    if (fieldMap.unidade_cidade && fieldMap.unidade_uf) {
      location = `${fieldMap.unidade_cidade}/${fieldMap.unidade_uf}`;
    } else {
      // Fallback via Regex se os campos dedicados estiverem vazios (ex: importação legada)
      const addr = fieldMap.endereco || "";
      const locMatch = addr.match(/,\s*([^,]+)\/([A-Z]{2})\s+/i);
      if (locMatch) {
        location = `${locMatch[1].trim()}/${locMatch[2].toUpperCase()}`;
      } else if (fieldMap.unidade_uf) {
        location = `Cidade/${fieldMap.unidade_uf}`;
      }
    }

    return `${location}, ${parseInt(day)} de ${months[mIdx]} de ${year}.`;
  };

  const effectiveDateText = useMemo(() => formatDateExtenso(fieldMap.expedicao_diploma || ""), [fieldMap.expedicao_diploma, fieldMap.endereco, fieldMap.unidade_uf, fieldMap.unidade_cidade]);

  // Cálculo Automático da Carga Horária Total
  const totalCH = useMemo(() => {
    return gradeRows.reduce((sum, row) => {
      const val = parseInt(String(row.ch || "0").replace(/\D/g, ""));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [gradeRows]);

  // Injetar totalCH no fieldMap para o componente visual
  const enrichedFieldMap = useMemo(() => {
    // Se o usuário preencheu manualmente o campo carga_horaria, usamos ele.
    // Caso contrário, usamos o cálculo automático da grade.
    const formCH = parseInt(String(fieldMap.carga_horaria || "0").replace(/\D/g, ""));
    const displayCH = formCH > 0 ? String(formCH) : String(totalCH || "0");

    return {
      ...fieldMap,
      carga_horaria: displayCH,
      dateText: effectiveDateText || ""
    };
  }, [fieldMap, totalCH, effectiveDateText]);

  // Paginação dinâmica balanceada (Sincronizada com DocumentPages.tsx)
  const showPage4 = activeHistorico !== "pedagogia";

  const gradeChunks = useMemo(() => {
    const remaining = [...gradeRows];
    const chunks: any[][] = [];
    const MAX_ROWS_LAST = 32;
    const MAX_ROWS_INT = 60;

    if (remaining.length === 0) {
       chunks.push([{ anoMes: "", disciplina: "Nenhuma disciplina informada", ch: "", media: "", resultado: "", docente: "", titulacao: "" }]);
    } else {
      while (remaining.length > 0) {
        if (remaining.length <= MAX_ROWS_LAST) {
          chunks.push(remaining.splice(0, remaining.length));
        } else if (remaining.length <= MAX_ROWS_INT) {
           // Se couber em uma página cheia mas não sobrar quase nada para a próxima, não divide no meio
           chunks.push(remaining.splice(0, remaining.length));
        } else {
          chunks.push(remaining.splice(0, MAX_ROWS_INT));
        }
      }
    }
    return chunks;
  }, [gradeRows]);

  // Construir array de páginas reais para navegação
  const pageList = useMemo(() => {
    const list: { id: string; label: string; type: string; chunkIdx?: number }[] = [
      { id: "p1", label: "Pág 1: Informativo", type: "fixed" },
      { id: "p2", label: "Pág 2: Certificado", type: "fixed" },
      { id: "p3", label: "Pág 3: Histórico", type: "fixed" },
    ];
    if (showPage4) {
      list.push({ id: "p4", label: "Pág 4: Selo", type: "fixed" });
    }
    gradeChunks.forEach((_, i) => {
      list.push({ id: `g${i}`, label: `Grade Pág ${i + 1}`, type: "grade", chunkIdx: i });
    });
    return list;
  }, [showPage4, gradeChunks]);

  const totalPages = pageList.length;

  // Ajustar página atual se o total diminuir (ex: mudou pra pedagogia)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  }, [totalPages]);

  const handleRequestEmit = useCallback(() => {
    if (!activeHistorico) {
      toast.error("Selecione o TIPO DE CURSO antes de emitir.");
      return;
    }
    const nome = fieldMap.nome || fieldMap.nome_aluno || fieldMap.nome_completo || "";
    if (!nome) { toast.error("Preencha o Nome do Aluno"); return; }
    if ((user?.balance || 0) <= 0) {
      toast.error("Saldo insuficiente. Recarregue para emitir documentos.");
      return;
    }
    setShowConfirmModal(true);
  }, [activeHistorico, fieldMap, user?.balance]);

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
        polo: fieldMap.instituicao_polo || fieldMap.polo || "",
        dataEmissao: fieldMap.data_expedicao_historico || "",
        dataConclusao: fieldMap.conclusao_curso || "",
        historicoKey: activeHistorico,
        profileKey: activeProfile,
        gradeRows,
        data: { ...enrichedFieldMap, gradeRows },
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
  }, [fieldMap, activeHistorico, activeProfile, gradeRows, updateBalance]);

  const handleExportPDF = useCallback(async () => {
    if (!printRef.current) return;
    try {
      const nome = fieldMap.nome || fieldMap.nome_aluno || fieldMap.nome_completo || "DOCUMENTO";
      await exportPDF(printRef.current, {
        filename: generatePDFFilename(nome, "historico-uninter"),
        docType: "historico-uninter",
        multiPage: true,
      });
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao exportar PDF.");
    }
  }, [exportPDF, fieldMap]);

  const handleResetAll = useCallback(() => {
    resetToOriginal();
    toast.success("Formulário resetado (Hard Reset)");
  }, [resetToOriginal]);

  const renderCurrentPage = () => {
    const pageData = pageList[currentPage - 1];
    if (!pageData) return null;

    const props = { 
      f: enrichedFieldMap, 
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
    <>
      <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans">
          {/* Header */}
          <header className="h-14 bg-[#005CA9] flex items-center px-6 gap-4 shrink-0 shadow-md z-20">
            <button
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all border border-white/10"
            >
              <ArrowLeft size={14} /> VOLTAR
            </button>
            <div className="h-8 w-px bg-white/20" />
            <h1 className="text-sm font-black tracking-tight text-white uppercase italic">
              DocMaster <span className="font-light mx-1">|</span> Emissor UNINTER
            </h1>

            <div className="ml-auto flex items-center gap-3">
              {/* Badge Removida conforme solicitação */}
            </div>
            </header>
          <div className="flex flex-1 overflow-hidden">
            {/* Editor Lateral */}
            <aside className={`transition-all duration-300 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl z-10 flex flex-col ${sidebarOpen ? "w-[420px]" : "w-0 overflow-hidden"}`}>
                <SubstitutionPanelUninter
                  fields={fields}
                  activeHistorico={activeHistorico || "historia"} // Fallback apenas para props, handleRequestEmit bloqueia se null
                  modifiedCount={modifiedCount}
                  importText={importText}
                  onUpdateImportText={setImportText}
                  onApplyImportText={applyImportText}
                  onApplyHistorico={applyHistorico}
                  onUpdateField={updateField}
                  onGenerateMatricula={generateMatricula}
                  onReset={handleResetAll}
                  onGenerateGrade={handleGenerateGrade}
                  onEmit={handleRequestEmit}
                  isExporting={isExporting}
                  saved={saved}
                  // Adicionado para identificar estado de não selecionado
                  activeHistoricoReal={activeHistorico} 
                />
            </aside>

            {/* Área de Preview */}
            <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-100 dark:bg-slate-900/50">
              {/* Toolbar do Preview */}
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

                <div className="h-6 w-px bg-gray-200 dark:bg-slate-800 ml-2" />
                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest truncate max-w-[150px]">{pageList[currentPage - 1]?.label}</span>

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
                  <div className="h-6 w-px bg-gray-200 dark:bg-slate-800" />
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
              data={enrichedFieldMap}
              gradeRows={gradeRows}
              profileKey={activeProfile || "historia"}
              highlightModified={showHighlights}
            />
          </div>
      </div>

      <EmissionModal
        docLabel="Histórico UNINTER"
        docEmoji="🎓"
        documentPrice={1800}
        userBalance={user?.balance ?? 0}
        isFree={user?.role === 'admin' || (Array.isArray(user?.free_documents) && (user.free_documents.includes('historico-uninter') || user.free_documents.includes('historicocria')))}
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
    </>
  );
}
