import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  FileText, Trash2, AlertTriangle,
  X, RefreshCw, Search, Save
} from "lucide-react";
import AttestationActionButtons from "@/components/AttestationActionButtons";
import AttestationViewerModal from "@/components/AttestationViewerModal";
import DocumentViewerModal from "@/components/DocumentViewerModal";
import { downloadAttestationPdf, fetchLatestAttestationRecord } from "@/lib/attestationActions";
import { downloadCRLVPdfDirect, buildCRLVPropsFromRecord } from "@/components/CRLVDocument";

interface DocRecord {
  id: string;
  nome: string;
  cpf: string;
  created_at: string;
  status: string;
  data: any;
  codigo_qr?: string;
}

interface FieldDef {
  key: string;
  label: string;
  locked?: boolean;
  type?: "text" | "date" | "textarea" | "select";
  options?: string[];
}

interface DocumentosSalvosProps {
  title: string;
  apiEndpoint: string;
  docType: string;
  validityDays?: number;
  fields: FieldDef[];
  nameField?: string;
  nameLabel?: string;
  cpfField?: string;
  cpfLabel?: string;
  idLabel?: string;
  dateLabel?: string;
  idField?: keyof DocRecord | string;
  dateField?: string;
  extraColumns?: { key: string; label: string; render?: (doc: DocRecord) => React.ReactNode }[];
  /** Rota para editar o documento (ex: "/atestado/editar"). Se fornecida, o botão Editar navega para lá com /{id}. */
  editRoute?: string;
  /** Rota para baixar/visualizar o documento (ex: "/atestado/editar"). Se fornecida, renderiza botão Baixar PDF. */
  downloadRoute?: string;
}

export default function DocumentosSalvos({
  title,
  apiEndpoint,
  docType,
  validityDays = 30,
  fields,
  nameField = "nome",
  nameLabel = "Paciente",
  cpfField = "cpf",
  cpfLabel = "CPF",
  idLabel = "ID",
  dateLabel = "Data",
  idField = "id",
  dateField = "created_at",
  extraColumns = [],
  editRoute,
  downloadRoute,
}: DocumentosSalvosProps) {
  const [, setLocation] = useLocation();
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editModal, setEditModal] = useState<DocRecord | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Visualizador inline ──────────────────────────────────────────────────────
  const [viewDoc, setViewDoc] = useState<DocRecord | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiEndpoint}?limit=100`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        const records = (data.data || data.attestations || data.receitas || []).map((d: any) => {
          let parsed: any = {};
          try { parsed = typeof d.data === "string" ? JSON.parse(d.data) : (d.data || {}); } catch {}
          return {
            id: d.id || d.codigo_validacao || "",
            nome: d.nome || d.nome_paciente || d.paciente || parsed[nameField] || parsed.nome || parsed.nomeCompleto || parsed.paciente || "—",
            cpf: d.cpf || d.cpf_paciente || parsed[cpfField] || parsed.cpf || "—",
            created_at: d.created_at,
            status: d.status || "emitido",
            data: { ...d, ...parsed },
            codigo_qr: d.codigo_qr || d.codigo_validacao || d.id || "",
          };
        });
        setDocs(records);
      }
    } catch {
      toast.error("Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, nameField, cpfField]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const openView = async (doc: DocRecord) => {
    if (docType !== "attestation") {
      setLocation(`/v/${doc.codigo_qr || doc.id}`);
      return;
    }

    const latestDoc = await fetchLatestAttestationRecord(doc);
    setDocs((prev) => prev.map((item) => (item.id === latestDoc.id ? latestDoc : item)));
    setViewDoc(latestDoc);
  };

  // ── Download direto do PDF sem navegar ────────────────────────────────────────
  const handleDirectDownload = async (doc: DocRecord) => {
    if (docType === "crlv") {
      setDownloadingId(doc.id);
      try {
        const crlvProps = buildCRLVPropsFromRecord(doc);
        await downloadCRLVPdfDirect(crlvProps);
        toast.success("PDF baixado com sucesso!");
      } catch (err) {
        console.error("Erro no download direto CRLV:", err);
        toast.error("Erro ao gerar PDF.");
      } finally {
        setDownloadingId(null);
      }
      return;
    }

    if (docType !== "attestation") {
      if (downloadRoute) setLocation(`${downloadRoute}/${doc.id}?download=1`);
      return;
    }

    setDownloadingId(doc.id);
    try {
      const latestDoc = await downloadAttestationPdf(doc);
      setDocs((prev) => prev.map((item) => (item.id === latestDoc.id ? latestDoc : item)));
      toast.success("PDF baixado com sucesso!");
    } catch (err) {
      console.error("Erro no download direto:", err);
      if (downloadRoute) setLocation(`${downloadRoute}/${doc.id}?download=1`);
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteDoc = async (id: string) => {
    try {
      const endpoint = docType === "attestation" ? `/api/attestations/${id}` :
                       docType === "receita" ? `/api/receitas/${id}` :
                       `/api/documents/${id}`;
      const res = await fetch(endpoint, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (data.success) {
        toast.success("Documento excluído com sucesso!");
        setDocs(prev => prev.filter(d => d.id !== id));
      } else {
        toast.error(data.error || "Erro ao excluir");
      }
    } catch {
      toast.error("Erro de conexão");
    }
    setDeleteConfirmId(null);
  };

  const openEdit = (doc: DocRecord) => {
    const d = doc.data || {};
    const initial: Record<string, string> = {};
    fields.forEach(f => {
      initial[f.key] = String(d[f.key] || "");
    });
    setEditData(initial);
    setEditModal(doc);
  };

  const saveEdit = async () => {
    if (!editModal) return;
    setEditSaving(true);
    try {
      const endpoint = docType === "attestation" ? `/api/attestations/${editModal.id}` :
                       docType === "receita" ? `/api/receitas/${editModal.id}` :
                       `/api/documents/${editModal.id}`;
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ data: editData }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Documento atualizado com sucesso!");
        setEditModal(null);
        loadDocs();
      } else {
        toast.error(result.error || "Erro ao salvar");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setEditSaving(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    // Se já estiver formatado como DD/MM/YYYY, retorna direto
    if (typeof d === "string" && d.includes("/")) return d;
    try { 
      const date = new Date(d);
      if (isNaN(date.getTime())) return d;
      return date.toLocaleDateString("pt-BR"); 
    } catch { return d; }
  };

  const filtered = docs.filter(d => {
    if (d.expires_at) {
      const exp = new Date(d.expires_at).getTime();
      if (!isNaN(exp) && exp < Date.now()) return false;
    }
    return (
      d.nome.toLowerCase().includes(search.toLowerCase()) ||
      d.cpf.includes(search) ||
      d.id.toString().includes(search)
    );
  });

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">{title}</h1>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>Atenção:</strong> Os documentos têm uma validade de <strong>{validityDays} dias</strong>, após esse período são{" "}
            <strong>excluídos do sistema</strong> e não podem ser mais utilizados.
          </p>
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <button onClick={loadDocs} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500">Nenhum documento salvo encontrado</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">{idLabel}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">{nameLabel}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider hidden sm:table-cell">{cpfLabel}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider hidden sm:table-cell">{dateLabel}</th>
                  {extraColumns.map(col => (
                    <th key={col.key} className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider hidden md:table-cell">{col.label}</th>
                  ))}
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map(doc => {
                  const idValue = idField === "id" ? doc.id : (doc.data?.[idField as string] || doc[idField as keyof DocRecord] || doc.id);
                  const dateValue = doc.data?.[dateField] || doc[dateField as keyof DocRecord] || doc.created_at;

                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400 text-xs">
                        {idField === "codigo_qr" ? (
                          <span 
                            onClick={() => {
                              navigator.clipboard.writeText(String(idValue));
                              toast.success("Código copiado!");
                            }}
                            className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-md font-bold border border-blue-100 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-95 block w-fit"
                            title="Clique para copiar"
                          >
                            {String(idValue)}
                          </span>
                        ) : (
                          String(idValue).slice(0, 12)
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 uppercase">{doc.nome}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{doc.cpf}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{formatDate(dateValue)}</td>
                      {extraColumns.map(col => (
                        <td key={col.key} className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                          {col.render ? col.render(doc) : (doc.data?.[col.key] || "—")}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <AttestationActionButtons
                          onView={() => openView(doc)}
                          onEdit={editRoute ? () => setLocation(`${editRoute}/${doc.id}`) : () => openEdit(doc)}
                          onDownload={docType === "attestation" || docType === "crlv" || downloadRoute ? () => handleDirectDownload(doc) : undefined}
                          isDownloading={downloadingId === doc.id}
                          onDelete={() => setDeleteConfirmId(doc.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── MODAL VISUALIZADOR ── */}
        {viewDoc && (docType === "attestation" ? (
          <AttestationViewerModal
            doc={viewDoc}
            isDownloading={downloadingId === viewDoc.id}
            onClose={() => setViewDoc(null)}
            onDownload={() => handleDirectDownload(viewDoc)}
            onEdit={() => {
              if (editRoute) setLocation(`${editRoute}/${viewDoc.id}`);
              setViewDoc(null);
            }}
          />
        ) : (
          <DocumentViewerModal
            doc={{ ...viewDoc, type: docType }}
            isDownloading={downloadingId === viewDoc.id}
            onClose={() => setViewDoc(null)}
            onDownload={() => handleDirectDownload(viewDoc)}
            onEdit={() => {
              if (editRoute) setLocation(`${editRoute}/${viewDoc.id}`);
              setViewDoc(null);
            }}
          />
        ))}

        {/* ── DELETE CONFIRM MODAL ── */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirmId(null)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Excluir Documento</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Tem certeza que deseja excluir este documento permanentemente? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={() => deleteDoc(deleteConfirmId)} className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors">
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT MODAL (apenas quando não há editRoute) ── */}
        {editModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditModal(null)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Editar - {editModal.nome}</h3>
                <button onClick={() => setEditModal(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields.map(field => (
                  <div key={field.key} className={field.type === "textarea" ? "col-span-full" : ""}>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                      {field.label}
                      {field.locked && <span className="ml-1 text-red-500">(bloqueado)</span>}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        value={editData[field.key] || ""}
                        onChange={e => setEditData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    ) : field.type === "select" && field.options ? (
                      <select
                        value={editData[field.key] || ""}
                        onChange={e => setEditData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        disabled={field.locked}
                        className={`w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 ${field.locked ? "bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"} focus:outline-none focus:ring-2 focus:ring-yellow-400`}
                      >
                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type === "date" ? "date" : "text"}
                        value={editData[field.key] || ""}
                        onChange={e => setEditData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        disabled={field.locked}
                        className={`w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 ${field.locked ? "bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed" : "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"} focus:outline-none focus:ring-2 focus:ring-yellow-400`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setEditModal(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  disabled={editSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {editSaving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
