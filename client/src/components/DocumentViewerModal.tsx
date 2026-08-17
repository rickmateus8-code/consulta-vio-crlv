import { useState, useRef, useEffect } from "react";
import { 
  Download, Pencil, Loader2, X, 
  ZoomIn, ZoomOut, Maximize, Move, RotateCcw, Camera
} from "lucide-react";
import AttestationDocument from "@/components/AttestationDocument";
import CNHDocument, { type CNHDocumentHandle, type CNHDocumentLegacyProps } from "@/components/CNHDocument";
import CRLVDocument, { type CRLVDocumentHandle, buildCRLVPropsFromRecord, downloadCRLVPdfDirect } from "@/components/CRLVDocument";

import { emittedRuntime } from "@/lib/cnh";

import { buildAttestationData } from "@/lib/attestationActions";
import CertificadoFGVDocument from "@/components/CertificadoFGVDocument";
import { usePDFExport, generatePDFFilename } from "@/lib/pdfExport";

interface DocumentViewerModalProps {
  doc: any;
  onClose: () => void;
  onEdit: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
}

export default function DocumentViewerModal({
  doc,
  onClose,
  onEdit,
  onDownload,
  isDownloading = false,
}: DocumentViewerModalProps) {
  const [scale, setScale] = useState(0.65);
  const [position, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const docRef = useRef<CNHDocumentHandle>(null);
  const crlvRef = useRef<CRLVDocumentHandle>(null);
  const certRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isCNH = doc.type === 'cnh';
  const isCHA = doc.type === 'cha';
  const isCRLV = doc.type === 'crlv' || doc.type === 'crlvcria';
  const isFGV = doc.type === 'fgv';
  // Extrai dados do documento. renderInput é uma abstração TypeScript pura e
  // nunca deve existir em documents.data — o destructuring aqui é uma fronteira
  // defensiva de runtime que garante que mesmo um payload inesperado não consiga
  // ativar acidentalmente o caminho canonical de CNHDocument.
  const { renderInput: _discardedCanonicalKey, ...legacyDocData } =
    typeof doc.data === 'string' ? JSON.parse(doc.data) : (doc.data || {});


  const { exportPDF, exporting: isExportingGenericPDF } = usePDFExport();

  // Auto-fit inicial
  useEffect(() => {
    const vh = window.innerHeight;
    if (vh < 800) setScale(0.55);
    else if (vh < 1000) setScale(0.65);
    else setScale(0.75);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 0.75) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    const vh = window.innerHeight;
    if (vh < 800) setScale(0.55);
    else if (vh < 1000) setScale(0.65);
    else setScale(0.75);
    setPos({ x: 0, y: 0 });
  };

  const handleExportPdf = async () => {
    if (isCNH && docRef.current) {
       await docRef.current.exportAsPdf();
    } else if (isCRLV) {
       if (crlvRef.current) {
         await crlvRef.current.exportAsPdf();
       } else {
         const crlvProps = buildCRLVPropsFromRecord(doc);
         await downloadCRLVPdfDirect(crlvProps);
       }
    } else if (isFGV) {
       if (!certRef.current) return;
       try {
         await exportPDF(certRef.current, {
           filename: generatePDFFilename(legacyDocData.nome_aluno || "certificado", "fgv"),
           docType: "fgv",
           orientation: "l",
           scale: 2,
         });
       } catch (err) {
         console.error("FGV PDF error:", err);
       }
    } else {
       onDownload();
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-6" onClick={onClose}>
      <div className="bg-[#f8fafc] dark:bg-slate-900 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-[900px] h-full max-h-[98vh] flex flex-col overflow-hidden border border-white/10 dark:border-white/5 animate-in fade-in zoom-in duration-300 relative" onClick={(e) => e.stopPropagation()}>
        
        {/* Header Elite */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Maximize className="w-5 h-5 text-[#005CA9] dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100 leading-tight">Visualização Premium</h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider">ID: {doc.codigo_qr || doc.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all active:scale-95 shadow-sm shadow-amber-200 dark:shadow-none">
              <Pencil className="w-3.5 h-3.5" /> EDITAR
            </button>
            <button onClick={handleExportPdf} disabled={isDownloading || isExportingGenericPDF} className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-[#005CA9] hover:bg-[#004a8a] text-white rounded-xl transition-all active:scale-95 shadow-sm shadow-blue-200 dark:shadow-none disabled:opacity-60">
              {(isDownloading || isExportingGenericPDF) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {(isDownloading || isExportingGenericPDF) ? "GERANDO..." : "EXPORTAR PDF"}
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1" />
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-slate-100 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 z-[110]">
          <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-all active:scale-90"><ZoomOut size={20} /></button>
          <div className="px-3 min-w-[60px] text-center font-bold text-sm text-[#005CA9] dark:text-blue-400 font-mono">{Math.round(scale * 100)}%</div>
          <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-all active:scale-90"><ZoomIn size={20} /></button>
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1" />
          <button onClick={resetView} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-all active:scale-90"><RotateCcw size={20} /></button>
        </div>

        {/* Viewport */}
        <div 
          ref={containerRef}
          className={`flex-1 overflow-hidden relative flex items-start justify-center p-4 sm:p-12 bg-slate-200 dark:bg-[#020617] ${isDragging ? 'cursor-grabbing' : (scale > 0.75 ? 'cursor-grab' : 'cursor-default')}`}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        >
          <div 
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: "top center",
              transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
              filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.3))"
            }}
          >
            {isCNH ? (
               <CNHDocument
                 ref={docRef}
                 {...(legacyDocData as CNHDocumentLegacyProps)}
                 codigoQR={doc.codigo_qr || doc.id}
                 printRuntime={emittedRuntime(
                   doc.id,
                   doc.codigo_qr || doc.id,
                   doc.codigo_qr || doc.id,
                 )}
               />
            ) : isCRLV ? (
               <CRLVDocument ref={crlvRef} {...buildCRLVPropsFromRecord(doc)} previewWidth={660} blurred={false} />
            ) : isFGV ? (
               <CertificadoFGVDocument ref={certRef} data={legacyDocData} />
            ) : (
               <AttestationDocument data={buildAttestationData(doc)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
