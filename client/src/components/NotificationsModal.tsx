import { useState, useEffect } from "react";
import { X, Bell, Clock, CalendarPlus, ShieldAlert, Sparkles, RefreshCw, CheckCircle, Search, Filter } from "lucide-react";

interface DocRecord {
  id: string;
  type: string;
  paciente?: string;
  nome?: string;
  cpf?: string;
  created_at: string;
  expires_at?: string;
  status: string;
  data?: any;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userDocuments?: DocRecord[];
  onRenewDoc?: (doc: DocRecord) => void;
}

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

export default function NotificationsModal({
  isOpen,
  onClose,
  userDocuments = [],
  onRenewDoc,
}: NotificationsModalProps) {
  const [activeTab, setActiveTab] = useState<"expirations" | "changelog">("expirations");
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    if (!isOpen) return;
    setLoadingLogs(true);
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data?.notifications) {
          setNotifications(data.notifications);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrar documentos que irão expirar nas próximas 72 horas (3 dias)
  const expiringDocs = userDocuments.filter((doc) => {
    if (!doc.created_at && !doc.expires_at) return false;
    try {
      const defaultDays = doc.type === "cnh" ? 90 : doc.type === "peticao-stj" ? 3 : 30;
      const expireDate = doc.expires_at 
        ? new Date(doc.expires_at) 
        : new Date(new Date(doc.created_at).getTime() + defaultDays * 24 * 60 * 60 * 1000);
      
      const now = new Date();
      const diffMs = expireDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Exibir documentos que expiram em até 72 horas e ainda não venceram (ou recentemente vencidos há menos de 24h)
      return diffHours > -24 && diffHours <= 72;
    } catch {
      return false;
    }
  });

  // Filtragem adicional por Categoria e Busca (PESQUISAR)
  const filteredExpiringDocs = expiringDocs.filter((doc) => {
    if (selectedCategory !== "all") {
      if (selectedCategory === "saude" && !["atestado", "receita", "toxicologico"].includes(doc.type)) return false;
      if (selectedCategory === "transito" && !["cnh", "crlv", "cha"].includes(doc.type)) return false;
      if (selectedCategory === "academico" && !["historico-sp", "historico-uninter", "diploma-uninter", "peticao-stj", "fgv"].includes(doc.type)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = (doc.nome || doc.paciente || "").toLowerCase();
      const cpf = (doc.cpf || "").toLowerCase();
      const type = (doc.type || "").toLowerCase();
      return name.includes(q) || cpf.includes(q) || type.includes(q);
    }
    return true;
  });

  const getDocName = (doc: DocRecord) => {
    let parsed: any = {};
    try { parsed = typeof doc.data === "string" ? JSON.parse(doc.data) : (doc.data || {}); } catch {}
    return doc.nome || doc.paciente || parsed.nome || parsed.nome_paciente || parsed.nome_aluno || "Documento Registrado";
  };

  const getDocCpf = (doc: DocRecord) => {
    let parsed: any = {};
    try { parsed = typeof doc.data === "string" ? JSON.parse(doc.data) : (doc.data || {}); } catch {}
    return doc.cpf || parsed.cpf || parsed.cpf_paciente || "—";
  };

  const getTimeLeftLabel = (doc: DocRecord) => {
    const defaultDays = doc.type === "cnh" ? 90 : doc.type === "peticao-stj" ? 3 : 30;
    const expireDate = doc.expires_at 
      ? new Date(doc.expires_at) 
      : new Date(new Date(doc.created_at).getTime() + defaultDays * 24 * 60 * 60 * 1000);
    
    const now = new Date();
    const diffMs = expireDate.getTime() - now.getTime();
    const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    
    if (diffHours <= 0) return "Expirado hoje";
    if (diffHours < 24) return `Expira em ${diffHours} horas`;
    const days = Math.ceil(diffHours / 24);
    return `Expira em ${days} dia(s) (${diffHours}h)`;
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#0b1120] text-white border border-blue-500/40 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header do Modal */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight m-0 uppercase italic">Central de Notificações</h2>
              <p className="text-xs text-slate-400 font-medium">Alertas de expiração de documentos & atualizações do sistema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Abas de Navegação (Expiração em 72h vs Logs de Atualização) */}
        <div className="flex border-b border-slate-800 bg-[#0f172a]/40 p-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("expirations")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === "expirations"
                ? "bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-md shadow-rose-950/40"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Alertas de Expiração (72h)</span>
            {expiringDocs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black animate-pulse">
                {expiringDocs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("changelog")}
            className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === "changelog"
                ? "bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-md shadow-blue-950/40"
                : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Logs de Atualização</span>
          </button>
        </div>

        {/* Barra de Filtros & Busca (PESQUISAR) para Alertas de Expiração */}
        {activeTab === "expirations" && (
          <div className="p-4 border-b border-slate-800 bg-[#0f172a]/80 flex flex-col sm:flex-row items-center gap-3">
            {/* Campo PESQUISAR */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="PESQUISAR (Nome, CPF ou Tipo)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-blue-500 transition-all uppercase"
              />
            </div>

            {/* Filtros por Categorias */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                Todos ({expiringDocs.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory("saude")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === "saude"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                Saúde
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory("transito")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === "transito"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                Trânsito/CNH
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory("academico")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === "academico"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                Acadêmico/Outros
              </button>
            </div>
          </div>
        )}

        {/* Conteúdo do Modal */}
        <div className="p-6 overflow-y-auto custom-scrollbar max-h-[55vh] space-y-4">
          {activeTab === "expirations" ? (
            <div>
              {filteredExpiringDocs.length === 0 ? (
                <div className="py-16 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-6">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {expiringDocs.length === 0 
                      ? "Nenhum documento expira nas próximas 72 horas"
                      : "Nenhum resultado encontrado para a busca/categoria"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    {expiringDocs.length === 0
                      ? "Todos os seus documentos estão com a validade regular no painel. Notificaremos você assim que algum documento se aproximar do prazo de 72 horas para renovação."
                      : "Tente redefinir a palavra de busca ou selecionar outra categoria acima."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-medium text-amber-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Os documentos abaixo irão expirar em breve. Clique em <strong>Renovar</strong> para prolongar a validade no painel.</span>
                  </div>

                  {filteredExpiringDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-[#0f172a] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-600/20 text-blue-400 border border-blue-500/30">
                            {String(doc.type || "").toUpperCase()}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-950/80 text-rose-300 border border-rose-500/40 font-mono animate-pulse">
                            ⚠️ {getTimeLeftLabel(doc)}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white tracking-tight uppercase m-0">
                          {getDocName(doc)}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono">
                          CPF: {getDocCpf(doc)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onRenewDoc?.(doc);
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 transition-all active:scale-95 cursor-pointer shrink-0"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        <span>Renovar Agora</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {loadingLogs ? (
                <div className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Buscando histórico de atualizações...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-16 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-6">
                  <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-3 opacity-60" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Sistema Sincronizado</h3>
                  <p className="text-xs text-slate-400 mt-1">Todas as atualizações do sistema são publicadas em tempo real pelo administrador.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {String(item.type || "ATUALIZAÇÃO").toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider m-0">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed font-medium m-0">
                        {item.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé Limpo sem DocMaster Notification Engine v2.0 */}
        <div className="p-4 border-t border-slate-800 bg-[#0f172a] shrink-0 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
