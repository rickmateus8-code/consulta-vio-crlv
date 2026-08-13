import React, { useState, useEffect } from "react";
import { useRoute } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import { Download, RefreshCw, FileText, CheckCircle, ShieldCheck } from "lucide-react";
import { exportElementToPDF } from "@/lib/pdfExport";

interface CoordinateBox {
  id: string;
  fieldKey: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign: "left" | "center" | "right";
  isUpperCase: boolean;
}

export default function UniversalStudioPage() {
  const [, params] = useRoute("/emissor/:slug");
  const slug = params?.slug || "";

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch("/api/admin/studio-templates", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.templates)) {
          const match = data.templates.find((t: any) => t.slug === slug);
          if (match) {
            setTemplate(match);
            try {
              const boxes: CoordinateBox[] = typeof match.coordinates_json === "string" 
                ? JSON.parse(match.coordinates_json) 
                : match.coordinates_json;
              const initialData: Record<string, string> = {};
              boxes.forEach((b) => { initialData[b.fieldKey] = ""; });
              setFormData(initialData);
            } catch {}
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <DashboardLayout title="Carregando Gabarito Studio...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-xs font-black uppercase text-slate-400">Carregando Motor Studio para {slug}...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!template) {
    return (
      <DashboardLayout title="Emissor Studio">
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-black uppercase text-white">Gabarito Studio Não Encontrado</h3>
          <p className="text-xs text-slate-400">O modelo com slug "{slug}" ainda não foi publicado pelo administrador.</p>
        </div>
      </DashboardLayout>
    );
  }

  const boxes: CoordinateBox[] = typeof template.coordinates_json === "string" 
    ? JSON.parse(template.coordinates_json) 
    : template.coordinates_json || [];

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const element = document.getElementById("studio-doc-preview");
      if (element) {
        await exportElementToPDF(element, { filename: `${template.name}_${Date.now()}.pdf` });
        toast.success("Documento gerado em PDF com sucesso!");
      }
    } catch {
      toast.error("Erro ao gerar PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DashboardLayout title={`Emissão - ${template.name}`}>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Banner do Documento Studio */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase italic tracking-tight m-0">{template.name}</h1>
              <p className="text-xs text-slate-400">Emissão em Tempo Real • Motor Studio Executado Internamente</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exporting}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
          >
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{exporting ? "Gerando PDF..." : "Exportar PDF Oficial"}</span>
          </button>
        </div>

        {/* Grid: Formulário Dinâmico + Preview Forense 1:1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Formulário Dinâmico */}
          <div className="lg:col-span-5 bg-[#0f172a] border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-3 m-0">
              Dados do Formulário
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {boxes.map((b, idx) => {
                const isFull = b.gridWidth !== "half" || b.inputType === "textarea";
                const showSectionHeader = b.section && (idx === 0 || boxes[idx - 1].section !== b.section);

                return (
                  <React.Fragment key={b.id}>
                    {showSectionHeader && (
                      <div className="col-span-full pt-2 pb-1 border-b border-slate-800">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">
                          {b.section}
                        </span>
                      </div>
                    )}

                    <div className={isFull ? "col-span-full" : "col-span-1"}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        {b.label}
                      </label>

                      {b.inputType === "select" ? (
                        <select
                          value={formData[b.fieldKey] || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [b.fieldKey]: e.target.value,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                        >
                          <option value="">Selecione...</option>
                          {(b.options || "").split(",").map((opt, oIdx) => (
                            <option key={oIdx} value={opt.trim()}>
                              {opt.trim()}
                            </option>
                          ))}
                        </select>
                      ) : b.inputType === "textarea" ? (
                        <textarea
                          rows={3}
                          placeholder={b.placeholder || `Digite ${b.label.toLowerCase()}...`}
                          value={formData[b.fieldKey] || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [b.fieldKey]: b.isUpperCase ? e.target.value.toUpperCase() : e.target.value,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500 transition-all custom-scrollbar"
                        />
                      ) : b.inputType === "date" ? (
                        <input
                          type="date"
                          value={formData[b.fieldKey] || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [b.fieldKey]: e.target.value,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500 transition-all"
                        />
                      ) : (
                        <input
                          type={b.inputType === "number" ? "number" : "text"}
                          placeholder={b.placeholder || `Digite ${b.label.toLowerCase()}...`}
                          value={formData[b.fieldKey] || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [b.fieldKey]: b.isUpperCase ? e.target.value.toUpperCase() : e.target.value,
                            }))
                          }
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-white font-medium focus:outline-none focus:border-blue-500 transition-all"
                        />
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Renderização Forense 1:1 (Overlay sobre PDF Gabarito) */}
          <div className="lg:col-span-7 bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center space-y-4 overflow-hidden">
            <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-3 w-full text-center m-0">
              Pré-Visualização Forense 1:1
            </h3>

            <div
              id="studio-doc-preview"
              className="relative select-none bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700"
              style={{ width: 680, height: 480 }}
            >
              {/* Gabarito PDF Base */}
              {template.pdf_bg_base64 && (
                <img src={template.pdf_bg_base64} alt="Gabarito PDF" className="w-full h-full object-contain pointer-events-none" />
              )}

              {/* Injeção Dinâmica dos Dados Digitados */}
              {boxes.map((b) => (
                <div
                  key={b.id}
                  className="absolute font-mono uppercase font-bold"
                  style={{
                    left: b.x,
                    top: b.y,
                    width: b.width,
                    height: b.height,
                    fontSize: b.fontSize,
                    color: b.color || "#000",
                    textAlign: b.textAlign || "left",
                  }}
                >
                  {formData[b.fieldKey] || b.label}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
