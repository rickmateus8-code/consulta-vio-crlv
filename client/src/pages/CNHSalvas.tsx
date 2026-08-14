import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import CNHDocument, { CNHDocumentHandle, CNHDocumentProps, type CNHDocumentLegacyProps } from "@/components/CNHDocument";

import { emittedRuntime } from "@/lib/cnh";

import {
  Eye, Smartphone, FileText, Trash2, AlertTriangle,
  Copy, X, Send, Download, RefreshCw, Search, Save
} from "lucide-react";

interface CNHRecord {
  id: string;
  seq_id: number;
  nome: string;
  cpf: string;
  senha: string;
  categoria: string;
  created_at: string;
  status: string;
  data: any;
}

const APP_LINKS = {
  gov: "https://www.mediafire.com/file/uf6pnzm1br84o4v/cnh_gov.apk/file",
  detran: "https://www.mediafire.com/file/igjyktevpyb1sh1/cnh_digital_detran.apk/file",
  webapp: "https://carteira-digital-transito-vio.digital",
};

export default function CNHSalvas() {
  const { user } = useAuth();
  const [cnhs, setCnhs] = useState<CNHRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appModal, setAppModal] = useState<CNHRecord | null>(null);
  const [previewModal, setPreviewModal] = useState<CNHRecord | null>(null);
  const [fichaModal, setFichaModal] = useState<CNHRecord | null>(null);
  const [fichaData, setFichaData] = useState<Record<string, string>>({});
  const [fichaSaving, setFichaSaving] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const cnhDocRef = useRef<CNHDocumentHandle>(null);

  const loadCNHs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents/cnh?limit=100", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        const records = (data.data || []).map((d: any, index: number) => {
          let parsed: any = {};
          try { parsed = typeof d.data === "string" ? JSON.parse(d.data) : (d.data || {}); } catch {}
          return {
            id: d.id,
            seq_id: d.seq_id || (14000 + index + 1),
            nome: d.nome || parsed.nome || parsed.nomeCompleto || "\u2014",
            cpf: d.cpf || parsed.cpf || "\u2014",
            senha: d.senha || parsed.senhaApp || parsed.senha || String(Math.floor(1000 + Math.random() * 9000)),
            categoria: d.categoria || parsed.categoria || "AB",
            created_at: d.created_at,
            status: d.status || "emitido",
            data: parsed,
          };
        });
        setCnhs(records);
      }
    } catch {
      toast.error("Erro ao carregar CNHs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCNHs(); }, [loadCNHs]);

  const deleteCNH = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (data.success) {
        toast.success("CNH excluída com sucesso!");
        setCnhs(prev => prev.filter(c => c.id !== id));
      } else {
        toast.error(data.error || "Erro ao excluir");
      }
    } catch {
      toast.error("Erro de conexão");
    }
    setDeleteConfirmId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const generateMessage = (cnh: CNHRecord) => {
    return `Olá! 👋 Aqui estão seus dados de acesso para o App CNH:
CPF: ${cnh.cpf} 📋
Senha: ${cnh.senha} 🔑

Links para download: 📱
Android (GOV): ${APP_LINKS.gov} 📲
Android (DETRAN): ${APP_LINKS.detran} 📲
WebApp (DETRAN): ${APP_LINKS.webapp} 🌐

Um abraço da equipe DocMaster! 😊🚗💨`;
  };

  const shareWhatsApp = (cnh: CNHRecord) => {
    if (!whatsappPhone) { toast.error("Digite o número do telefone"); return; }
    const phone = whatsappPhone.replace(/\D/g, "");
    const msg = encodeURIComponent(generateMessage(cnh));
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
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

  // Build CNHDocumentLegacyProps from a record
  const buildCNHProps = (cnh: CNHRecord): CNHDocumentLegacyProps => {

    const d = cnh.data || {};
    return {
      nome: d.nome || cnh.nome || "",
      cpf: d.cpf || cnh.cpf || "",
      rg: d.rg || "",
      orgaoEmissor: d.orgaoEmissor || "",
      ufRG: d.ufRG || "",
      sexo: d.sexo || "",
      nacionalidade: d.nacionalidade || "BRASILEIRA",
      dataNascimento: d.dataNascimento || "",
      localNascimento: d.localNascimento || "",
      ufNascimento: d.ufNascimento || "",
      nomePai: d.nomePai || "",
      nomeMae: d.nomeMae || "",
      categoria: d.categoria || cnh.categoria || "",
      tipo: d.tipo || "Definitiva",
      registro: d.registro || "",
      espelho: d.espelho || "",
      validade: d.validade || "",
      dataEmissao: d.dataEmissao || "",
      primeiraHabilitacao: d.primeiraHabilitacao || "",
      localEmissao: d.localEmissao || "",
      ufEmissao: d.ufEmissao || "",
      assDigital1: d.assDigital1 || "",
      assDigital2: d.assDigital2 || "",
      senhaApp: d.senhaApp || cnh.senha || "",
      observacoes: d.observacoes || "",
      fotoUrl: d.fotoUrl || "",
      assinaturaUrl: d.assinaturaUrl || "",
      codigoQR: cnh.id,
      blurred: false,
    };
  };

  // Download CNH as PDF
  const handleDownloadCNH = async () => {
    if (!cnhDocRef.current) return;
    try {
      await cnhDocRef.current.exportAsPdf();
      toast.success("PDF da CNH baixado com sucesso!");
    } catch {
      toast.error("Erro ao baixar PDF da CNH");
    }
  };

  // Direct download PDF from table (opens preview then downloads)
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const directDownloadRef = useRef<CNHDocumentHandle>(null);
  const [directDownloadCnh, setDirectDownloadCnh] = useState<CNHRecord | null>(null);

  useEffect(() => {
    if (directDownloadCnh && directDownloadRef.current) {
      const timer = setTimeout(async () => {
        try {
          await directDownloadRef.current?.exportAsPdf();
          toast.success("PDF baixado!");
        } catch {
          toast.error("Erro ao gerar PDF");
        } finally {
          setDirectDownloadCnh(null);
          setDownloadingId(null);
        }
      }, 1500); // Wait for canvas to render
      return () => clearTimeout(timer);
    }
  }, [directDownloadCnh]);

  // Open Ficha Técnica with editable data (CPF locked)
  const openFicha = (cnh: CNHRecord) => {
    const d = cnh.data || {};
    setFichaData({
      nome: d.nome || cnh.nome || "",
      cpf: d.cpf || cnh.cpf || "",
      rg: d.rg || "",
      orgaoEmissor: d.orgaoEmissor || "",
      ufRG: d.ufRG || "",
      sexo: d.sexo || "",
      nacionalidade: d.nacionalidade || "BRASILEIRA",
      dataNascimento: d.dataNascimento || "",
      localNascimento: d.localNascimento || "",
      ufNascimento: d.ufNascimento || "",
      nomePai: d.nomePai || "",
      nomeMae: d.nomeMae || "",
      categoria: d.categoria || cnh.categoria || "",
      tipo: d.tipo || "Definitiva",
      registro: d.registro || "",
      espelho: d.espelho || "",
      validade: d.validade || "",
      dataEmissao: d.dataEmissao || "",
      primeiraHabilitacao: d.primeiraHabilitacao || "",
      localEmissao: d.localEmissao || "",
      ufEmissao: d.ufEmissao || "",
      assDigital1: d.assDigital1 || "",
      assDigital2: d.assDigital2 || "",
      senhaApp: d.senhaApp || cnh.senha || "",
      observacoes: d.observacoes || "",
    });
    setFichaModal(cnh);
  };

  // Save Ficha Técnica
  const saveFicha = async () => {
    if (!fichaModal) return;
    setFichaSaving(true);
    try {
      const res = await fetch(`/api/documents/${fichaModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ data: fichaData }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Ficha Técnica salva com sucesso!");
        setFichaModal(null);
        loadCNHs();
      } else {
        toast.error(result.error || "Erro ao salvar");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setFichaSaving(false);
    }
  };

  const filtered = cnhs.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf.includes(search) ||
    c.id.includes(search)
  );

  const FICHA_FIELDS = [
    { key: "nome", label: "Nome Completo" },
    { key: "cpf", label: "CPF", locked: true },
    { key: "rg", label: "RG" },
    { key: "orgaoEmissor", label: "Órgão Emissor" },
    { key: "ufRG", label: "UF RG" },
    { key: "sexo", label: "Sexo" },
    { key: "nacionalidade", label: "Nacionalidade" },
    { key: "dataNascimento", label: "Data Nascimento" },
    { key: "localNascimento", label: "Local Nascimento" },
    { key: "ufNascimento", label: "UF Nascimento" },
    { key: "nomePai", label: "Nome do Pai" },
    { key: "nomeMae", label: "Nome da Mãe" },
    { key: "categoria", label: "Categoria" },
    { key: "tipo", label: "Tipo" },
    { key: "registro", label: "Nº Registro" },
    { key: "espelho", label: "Nº CNH (Espelho)" },
    { key: "validade", label: "Validade" },
    { key: "dataEmissao", label: "Data Emissão" },
    { key: "primeiraHabilitacao", label: "1ª Habilitação" },
    { key: "localEmissao", label: "Local Emissão" },
    { key: "ufEmissao", label: "UF Emissão" },
    { key: "assDigital1", label: "Ass. Digital 1" },
    { key: "assDigital2", label: "Ass. Digital 2" },
    { key: "senhaApp", label: "Senha App" },
    { key: "observacoes", label: "Observações" },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">CNHs Salvas</h1>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>Atenção:</strong> As CNHs tem uma validade de <strong>30 dias</strong>, após esse período elas são{" "}
            <strong>excluídas do sistema</strong> e não podem ser mais utilizadas.
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
          <button onClick={loadCNHs} className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500">Nenhuma CNH salva encontrada</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">Código Emissão</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell text-xs">CPF</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">Data Emissão</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">Criação (Painel)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map(cnh => {
                  const date = new Date(cnh.created_at);
                  const dataEmissao = cnh.data?.dataEmissao || "—";
                  return (
                    <tr key={cnh.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">
                        <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded-md font-bold border border-blue-100 dark:border-blue-800 text-xs">
                          {cnh.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200 uppercase">{cnh.nome}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{cnh.cpf}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">{dataEmissao}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {date.toLocaleDateString("pt-BR")}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => window.location.href = `/cnh/editar/${cnh.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => setPreviewModal(cnh)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white transition-colors"
                        >
                          Preview CNH
                        </button>
                        <button
                          onClick={() => { setAppModal(cnh); setWhatsappPhone(""); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                        >
                          App CNH
                        </button>
                        <button
                          onClick={() => openFicha(cnh)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-400 hover:bg-orange-500 text-white transition-colors"
                        >
                          Ficha Técnica
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(cnh.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> DELETAR
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── DELETE CONFIRM MODAL ── */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirmId(null)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Excluir CNH</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Tem certeza que deseja excluir esta CNH permanentemente? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={() => deleteCNH(deleteConfirmId)} className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors">
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── APP CNH MODAL ── */}
        {appModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAppModal(null)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Download App CNH</h3>
                <button onClick={() => setAppModal(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Dados de acesso:</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">CPF: <strong>{appModal.cpf}</strong></p>
                <p className="text-sm text-gray-700 dark:text-gray-300">Senha: <strong>{appModal.senha}</strong></p>
              </div>

              <div className="mb-4">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                  <Download className="w-4 h-4" /> Baixe o App (Android):
                </p>
                <div className="space-y-2">
                  {[{ label: "Opção GOV:", link: APP_LINKS.gov }, { label: "Opção DETRAN:", link: APP_LINKS.detran }].map(item => (
                    <div key={item.label}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</p>
                      <div className="flex items-center gap-2">
                        <input type="text" readOnly value={item.link} className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400" />
                        <button onClick={() => copyToClipboard(item.link)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">Copiar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">WebApp:</p>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Opção DETRAN:</p>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={APP_LINKS.webapp} className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400" />
                    <button onClick={() => copyToClipboard(APP_LINKS.webapp)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">Copiar</button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {generateMessage(appModal)}
                </pre>
              </div>

              <button
                onClick={() => copyToClipboard(generateMessage(appModal))}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors mb-4"
              >
                <Copy className="w-4 h-4" /> Copiar mensagem para a área de transferência
              </button>

              <div className="text-center text-sm text-gray-400 dark:text-gray-500 mb-4">OU</div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Compartilhar com o cliente direto no WhatsApp:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Digite o número de telefone do cliente"
                    value={whatsappPhone}
                    onChange={e => setWhatsappPhone(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <button
                    onClick={() => shareWhatsApp(appModal)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" /> Compartilhar
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={() => setAppModal(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW CNH MODAL ── */}
        {previewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPreviewModal(null)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-3xl w-full shadow-xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Preview CNH - {previewModal.nome}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadCNH}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <Download className="w-4 h-4" /> Baixar PDF
                  </button>
                  <button onClick={() => setPreviewModal(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="flex justify-center bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
                <CNHDocument ref={cnhDocRef} {...buildCNHProps(previewModal)} printRuntime={emittedRuntime(previewModal.id, previewModal.id)} />

              </div>
            </div>
          </div>
        )}

        {/* ── FICHA TÉCNICA MODAL ── */}
        {/* Hidden CNH renderer for direct PDF download */}
        {directDownloadCnh && (
          <div className="fixed -left-[9999px] top-0" aria-hidden>
            <CNHDocument ref={directDownloadRef} {...buildCNHProps(directDownloadCnh)} printRuntime={emittedRuntime(directDownloadCnh.id, directDownloadCnh.id)} />

          </div>
        )}

        {fichaModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setFichaModal(null)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ficha Técnica - {fichaModal.nome}</h3>
                <button onClick={() => setFichaModal(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FICHA_FIELDS.map(field => (
                  <div key={field.key} className={field.key === "observacoes" ? "col-span-full" : ""}>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
                      {field.label}
                      {field.locked && <span className="ml-1 text-red-500">(bloqueado)</span>}
                    </label>
                    {field.key === "observacoes" ? (
                      <textarea
                        value={fichaData[field.key] || ""}
                        onChange={e => setFichaData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    ) : (
                      <input
                        type="text"
                        value={fichaData[field.key] || ""}
                        onChange={e => setFichaData(prev => ({ ...prev, [field.key]: e.target.value }))}
                        disabled={field.locked}
                        className={`w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 ${field.locked ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 cursor-not-allowed" : "bg-white dark:bg-gray-900 text-gray-900 dark:text-white"} focus:outline-none focus:ring-2 focus:ring-yellow-400`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setFichaModal(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={saveFicha}
                  disabled={fichaSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {fichaSaving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
