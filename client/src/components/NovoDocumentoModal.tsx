import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { openRecarregaModal } from "@/components/RecarregaModal";
import { isToolLiberated } from "@/lib/permissions";
import {
  X, FileText, Car, Anchor, FlaskConical, GraduationCap,
  Pill, AlertTriangle, Wallet, CreditCard, MessageCircle, Search, Award,
  Folder, Plus, ArrowLeft
} from "lucide-react";

interface DocOption {
  key: string;
  label: string;
  icon: React.ElementType;
  path: string;
  price: number;
  priceFormatted: string;
}

interface NovoDocumentoModalProps {
  open: boolean;
  onClose: () => void;
  userBalance: number;
  username?: string;
}

const DOC_ICONS: Record<string, React.ElementType> = {
  atestado: FileText,
  cnh: Car,
  crlv: Car,
  cha: Anchor,
  toxicologico: FlaskConical,
  toxicria: FlaskConical,
  "historico-sp": GraduationCap,
  "historico-uninter": GraduationCap,
  receita: Pill,
  peticaocria: FileText,
  "diploma-uninter": GraduationCap,
  "bot-adv": Search,
  fgv: Award,
};

const DOC_PATHS: Record<string, string> = {
  atestado: "/atestadocria",
  cnh: "/cnhcria",
  crlv: "/crlvcria",
  cha: "/chacria",
  toxicologico: "/toxicologicocria",
  toxicria: "/toxicria",
  "historico-sp": "/historico-sp",
  "historicocria": "/historicocria",
  receita: "/receitacria",
  peticaocria: "/peticaocria",
  "diploma-uninter": "/diplomaunintercria",
  "bot-adv": "/bot-adv",
  fgv: "/certificado-fgv",
};

export default function NovoDocumentoModal({ open, onClose, userBalance, username }: NovoDocumentoModalProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [docs, setDocs] = useState<DocOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"categories" | "docs">("categories");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [insufficientDoc, setInsufficientDoc] = useState<DocOption | null>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState("");

  const categories = [
    { id: "todos", label: "TODOS" },
    { id: "veiculos", label: "VEÍCULOS" },
    { id: "certidoes", label: "CERTIDÕES" },
    { id: "pessoais", label: "PESSOAIS" },
    { id: "saude", label: "SAÚDE" },
    { id: "estudante", label: "ESTUDANTE" },
    { id: "faturas", label: "FATURAS" },
  ];

  const getDocCategory = (key: string): string => {
    if (key === "crlv") return "veiculos";
    if (key === "peticaocria" || key === "bot-adv") return "certidoes";
    if (key === "cnh" || key === "cha") return "pessoais";
    if (key === "atestado" || key === "toxicologico" || key === "toxicria" || key === "receita") return "saude";
    if (key === "historico-sp" || key === "historicocria" || key === "diploma-uninter" || key === "fgv") return "estudante";
    return "pessoais";
  };

  const isToolAllowed = (key: string) => isToolLiberated(user, key);

  useEffect(() => {
    if (!open) {
      setViewMode("categories");
      setSelectedCategory("todos");
      return;
    }
    setLoading(true);
    fetch("/api/pricing", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        let list: DocOption[] = [];
        if (data.success && data.pricing) {
          list = Object.entries(data.pricing).map(([key, val]: [string, any]) => ({
            key,
            label: val.display_name,
            icon: DOC_ICONS[key] || FileText,
            path: val.is_universal ? `/emissor/${key}` : (DOC_PATHS[key] || "/dashboard"),
            price: val.price,
            priceFormatted: val.price_formatted,
          }));
        }
        
        if (list.length === 0) list = getFallbackDocs();

        const filtered = list.filter(d => isToolAllowed(d.key));
        filtered.sort((a, b) => a.label.localeCompare(b.label));
        setDocs(filtered);
      })
      .catch(() => {
        const filtered = getFallbackDocs().filter(d => isToolAllowed(d.key));
        setDocs(filtered);
      })
      .finally(() => setLoading(false));
  }, [open, user]);

  const getFallbackDocs = (): DocOption[] => [
    { key: "atestado", label: "Atestado Médico", icon: DOC_ICONS["atestado"], path: DOC_PATHS["atestado"], price: 1000, priceFormatted: "R$ 10,00" },
    { key: "cnh", label: "CNH Digital", icon: DOC_ICONS["cnh"], path: DOC_PATHS["cnh"], price: 1500, priceFormatted: "R$ 15,00" },
    { key: "crlv", label: "CRLV Digital", icon: DOC_ICONS["crlv"] || Car, path: DOC_PATHS["crlv"] || "/crlvcria", price: 1500, priceFormatted: "R$ 15,00" },
    { key: "cha", label: "CHA Náutica", icon: DOC_ICONS["cha"], path: DOC_PATHS["cha"], price: 1500, priceFormatted: "R$ 15,00" },
    { key: "toxicologico", label: "Exame Toxicológico", icon: DOC_ICONS["toxicologico"], path: DOC_PATHS["toxicologico"], price: 1500, priceFormatted: "R$ 15,00" },
    { key: "toxicria", label: "Laudo Toxicológico Innovatox", icon: DOC_ICONS["toxicria"], path: DOC_PATHS["toxicria"], price: 1500, priceFormatted: "R$ 15,00" },
    { key: "historico-sp", label: "Histórico Escolar SP", icon: DOC_ICONS["historico-sp"], path: DOC_PATHS["historico-sp"], price: 1800, priceFormatted: "R$ 18,00" },
    { key: "historicocria", label: "Histórico UNINTER", icon: DOC_ICONS["historicocria"] || GraduationCap, path: DOC_PATHS["historicocria"], price: 1800, priceFormatted: "R$ 18,00" },
    { key: "diploma-uninter", label: "Diploma UNINTER", icon: DOC_ICONS["diploma-uninter"], path: DOC_PATHS["diploma-uninter"], price: 2500, priceFormatted: "R$ 25,00" },
    { key: "fgv", label: "Certificado FGV", icon: DOC_ICONS["fgv"] || Award, path: DOC_PATHS["fgv"], price: 1800, priceFormatted: "R$ 18,00" },
    { key: "receita", label: "Dr. Consulta", icon: DOC_ICONS["receita"], path: DOC_PATHS["receita"], price: 1000, priceFormatted: "R$ 10,00" },
    { key: "peticaocria", label: "Petição Judicial", icon: DOC_ICONS["peticaocria"], path: DOC_PATHS["peticaocria"], price: 2000, priceFormatted: "R$ 20,00" },
    { key: "bot-adv", label: "Bot Adv", icon: DOC_ICONS["bot-adv"], path: DOC_PATHS["bot-adv"], price: 500, priceFormatted: "R$ 5,00" },
  ];

  useEffect(() => {
    if (!open) return;
    fetch("/api/settings/public")
      .then(r => r.json())
      .then(data => {
        if (data.support_whatsapp) setSupportWhatsapp(data.support_whatsapp);
      })
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const handleSelectDoc = (doc: DocOption) => {
    const freeDocsArr = Array.isArray(user?.free_documents) ? user.free_documents : [];
    
    const isFree = user?.role === 'admin' || 
      freeDocsArr.includes(doc.key) ||
      (doc.key === "peticaocria" && (freeDocsArr.includes("peticao-stj") || freeDocsArr.includes("peticao"))) ||
      (doc.key === "historicocria" && freeDocsArr.includes("historico-uninter")) ||
      (doc.key === "toxicologico" && freeDocsArr.includes("toxicologia"));

    const currentBalance = Number(userBalance) || 0;
    const docPrice = isFree ? 0 : (Number(doc.price) || 0);

    if (currentBalance < docPrice) {
      setInsufficientDoc(doc);
      return;
    }
    onClose();
    setLocation(doc.path);
  };

  const handleSelectCategoryCard = (catId: string) => {
    setSelectedCategory(catId);
    setViewMode("docs");
  };

  const handleRecarregar = () => {
    onClose();
    openRecarregaModal();
  };

  const whatsappLink = supportWhatsapp
    ? `https://wa.me/${supportWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá! Preciso adicionar saldo no DocMaster.\nUsuário: ${username || ""}\nDocumento desejado: ${insufficientDoc?.label || ""}`
      )}`
    : null;

  if (insufficientDoc) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setInsufficientDoc(null)}>
        <div className="bg-[#0f172a] text-white border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full border-4 border-amber-500 bg-amber-500/10 flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-8 h-8 text-amber-400" /></div>
          <h2 className="text-xl font-black text-white mb-2 uppercase italic">Saldo Insuficiente</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">O valor deste documento é <strong className="text-rose-400">{insufficientDoc.priceFormatted}</strong>. Seu saldo atual é insuficiente.</p>
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 mb-6 flex items-center justify-center gap-2"><Wallet className="w-4 h-4 text-rose-400" /><span className="text-sm font-bold text-rose-300 font-mono">Saldo atual: R$ {(userBalance / 100).toFixed(2).replace(".", ",")}</span></div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <button onClick={handleRecarregar} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md">Recarregar</button>
              <button onClick={() => setInsufficientDoc(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all">Cancelar</button>
            </div>
            {whatsappLink && (<a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-950/40 text-emerald-300 font-bold rounded-xl border border-emerald-500/30 text-xs"><MessageCircle size={16} />Solicitar via WhatsApp</a>)}
          </div>
        </div>
      </div>
    );
  }

  const filteredDocs = selectedCategory === "todos" 
    ? docs 
    : selectedCategory === "faturas"
    ? []
    : docs.filter(d => getDocCategory(d.key) === selectedCategory);

  return (
    <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#080d1a] text-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl border border-blue-500/30 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header EliteDoc - Estilo Imagem 02 */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-[#0c1324]">
          <div>
            <h2 className="text-lg md:text-xl font-black text-blue-500 tracking-tight m-0">Novo Documento</h2>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">O que você deseja emitir hoje?</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Corpo do Modal - Nível 1: Grid de Categorias (Pareado 1:1 com Imagem 02) */}
        {viewMode === "categories" ? (
          <div className="p-5 md:p-6 space-y-4">
            <div className="grid grid-cols-3 gap-3 items-stretch">
              {/* Coluna 1 (Esquerda): Veículos & Certidões */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleSelectCategoryCard("veiculos")}
                  className="flex-1 bg-[#0d1527] hover:bg-[#162035] border border-blue-900/30 hover:border-blue-500/80 rounded-xl p-3.5 flex items-center gap-3 transition-all duration-200 group text-left shadow-md cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Car size={18} />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-wider">VEÍCULOS</span>
                </button>

                <button
                  onClick={() => handleSelectCategoryCard("certidoes")}
                  className="flex-1 bg-[#0d1527] hover:bg-[#162035] border border-blue-900/30 hover:border-blue-500/80 rounded-xl p-3.5 flex items-center gap-3 transition-all duration-200 group text-left shadow-md cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Folder size={18} />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-wider">CERTIDÕES</span>
                </button>
              </div>

              {/* Coluna 2 (Centro - Destaque Principal): PESSOAIS */}
              <button
                onClick={() => handleSelectCategoryCard("pessoais")}
                className="bg-[#0d1527] hover:bg-[#162035] border-2 border-blue-500/60 hover:border-blue-400 rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-300 group shadow-xl shadow-blue-600/10 hover:scale-[1.01] text-center cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-400 text-blue-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <FileText size={26} />
                </div>
                <span className="text-xs font-black text-white uppercase tracking-widest">PESSOAIS</span>
              </button>

              {/* Coluna 3 (Direita): Saúde, Estudante & Faturas */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleSelectCategoryCard("saude")}
                  className="bg-[#0d1527] hover:bg-[#162035] border border-blue-900/30 hover:border-blue-500/80 rounded-xl p-3 flex items-center gap-3 transition-all duration-200 group text-left shadow-md cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Plus size={16} />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-wider">SAÚDE</span>
                </button>

                <div className="grid grid-cols-2 gap-2 flex-1">
                  <button
                    onClick={() => handleSelectCategoryCard("estudante")}
                    className="bg-[#0d1527] hover:bg-[#162035] border border-blue-900/30 hover:border-blue-500/80 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 group text-center shadow-md cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <GraduationCap size={14} />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">ESTUDANTE</span>
                  </button>

                  <button
                    onClick={() => handleSelectCategoryCard("faturas")}
                    className="bg-[#0d1527] hover:bg-[#162035] border border-blue-900/30 hover:border-blue-500/80 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all duration-200 group text-center shadow-md cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <CreditCard size={14} />
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">FATURAS</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Linha inferior de progresso azul brilhante - Estilo Imagem 02 */}
            <div className="pt-1">
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex gap-2 p-0.5">
                <div className="h-full w-2/3 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)] animate-pulse" />
                <div className="h-full w-1/6 bg-blue-600/60 rounded-full" />
                <div className="h-full w-1/12 bg-blue-600/40 rounded-full" />
              </div>
            </div>
          </div>
        ) : (
          /* Nível 2: Catálogo de Documentos de uma Categoria (Pareado 1:1 com Imagem 01) */
          <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
            {/* Banner da Categoria com Botão Voltar (Imagem 01) */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                  {selectedCategory === "veiculos" && <Car size={22} />}
                  {selectedCategory === "certidoes" && <Folder size={22} />}
                  {selectedCategory === "pessoais" && <FileText size={22} />}
                  {selectedCategory === "saude" && <Plus size={22} />}
                  {selectedCategory === "estudante" && <GraduationCap size={22} />}
                  {selectedCategory === "faturas" && <CreditCard size={22} />}
                </div>
                <span className="text-base font-black text-white uppercase tracking-wider">
                  {selectedCategory === "veiculos" && "VEÍCULOS"}
                  {selectedCategory === "certidoes" && "CERTIDÕES"}
                  {selectedCategory === "pessoais" && "PESSOAIS"}
                  {selectedCategory === "saude" && "SAÚDE"}
                  {selectedCategory === "estudante" && "ESTUDANTE"}
                  {selectedCategory === "faturas" && "FATURAS"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setViewMode("categories")}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <ArrowLeft size={14} />
                <span>Voltar</span>
              </button>
            </div>

            {/* Grid de Cards de Documentos (Imagem 01) */}
            <div>
              {selectedCategory === "faturas" ? (
                <div className="py-10 text-center bg-[#0f172a] rounded-2xl border border-dashed border-slate-700 p-6">
                  <CreditCard className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <h3 className="text-sm font-black text-white uppercase mb-1">Adicionar Saldo / Faturas</h3>
                  <p className="text-xs text-slate-400 mb-4">Adicione créditos para liberar instantaneamente suas emissões.</p>
                  <button onClick={() => { onClose(); handleRecarregar(); }} className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition-all">Recarregar Saldo Agora</button>
                </div>
              ) : loading ? (
                <div className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Carregando modelos de emissão...</div>
              ) : filteredDocs.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs font-black uppercase italic tracking-widest">Nenhum documento nesta categoria.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {filteredDocs.map(doc => {
                    const Icon = doc.icon;
                    const freeDocsArr = Array.isArray(user?.free_documents) ? user.free_documents : [];
                    
                    const isFree = user?.role === 'admin' || 
                      freeDocsArr.includes(doc.key) ||
                      (doc.key === "peticaocria" && (freeDocsArr.includes("peticao-stj") || freeDocsArr.includes("peticao"))) ||
                      (doc.key === "historicocria" && freeDocsArr.includes("historico-uninter")) ||
                      (doc.key === "toxicologico" && freeDocsArr.includes("toxicologia"));

                    const canAfford = isFree || userBalance >= doc.price;

                    return (
                      <button 
                        key={doc.key} 
                        onClick={() => handleSelectDoc(doc)} 
                        className={`bg-[#0f172a] hover:bg-[#1e293b] border border-slate-800 hover:border-blue-500/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-all duration-200 group shadow-lg cursor-pointer ${!canAfford && 'opacity-60'}`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon size={26} />
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-wider min-h-[32px] flex items-center justify-center">{doc.label}</span>
                        <span className="text-[10px] font-black px-3.5 py-1 rounded-full border bg-emerald-950/60 border-emerald-500/40 text-emerald-300 font-mono">
                          {isFree ? 'R$ 0,00' : doc.priceFormatted}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-800 bg-[#0f172a] shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300">Saldo: <strong className="text-emerald-400 font-mono">R$ {(userBalance / 100).toFixed(2).replace(".", ",")}</strong></span>
          </div>
          <button onClick={() => { onClose(); handleRecarregar(); }} className="text-xs font-black text-blue-400 hover:text-blue-300 uppercase tracking-wider flex items-center gap-1.5"><CreditCard size={14} /> Recarregar</button>
        </div>
      </div>
    </div>
  );
}

