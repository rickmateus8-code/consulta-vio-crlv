/**
 * NovoDocumentoModal — Pop-up "Novo Documento"
 *
 * Exibe lista de documentos disponíveis com preços (do Admin).
 * Filtrado por permissões do usuário.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { openRecarregaModal } from "@/components/RecarregaModal";
import { isToolLiberated } from "@/lib/permissions";
import {
  X, FileText, Car, Anchor, FlaskConical, GraduationCap,
  Pill, AlertTriangle, Wallet, CreditCard, MessageCircle, Search, Award
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
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [insufficientDoc, setInsufficientDoc] = useState<DocOption | null>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState("");

  const categories = [
    { id: "todos", label: "Todos" },
    { id: "veiculos", label: "Veículos" },
    { id: "certidoes", label: "Certidões" },
    { id: "pessoais", label: "Pessoais" },
    { id: "saude", label: "Saúde" },
    { id: "estudante", label: "Estudante" },
    { id: "faturas", label: "Faturas" },
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
    if (!open) return;
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
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setInsufficientDoc(null)}>
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full border-4 border-orange-500 flex items-center justify-center mx-auto mb-6"><AlertTriangle className="w-8 h-8 text-orange-500" /></div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 uppercase italic">Saldo Insuficiente</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">O valor deste documento é <strong className="text-red-600">{insufficientDoc.priceFormatted}</strong>. Seu saldo atual é insuficiente.</p>
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl p-3 mb-6 flex items-center justify-center gap-2"><Wallet className="w-4 h-4 text-red-600 dark:text-red-400" /><span className="text-sm font-bold text-red-600 dark:text-red-400">Saldo atual: R$ {(userBalance / 100).toFixed(2).replace(".", ",")}</span></div>
          <div className="space-y-2">
            <div className="flex gap-2"><button onClick={handleRecarregar} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all">Recarregar</button><button onClick={() => setInsufficientDoc(null)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-xl transition-all">Cancelar</button></div>
            {whatsappLink && (<a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 font-bold rounded-xl border border-green-100 dark:border-green-900/20 text-xs"><MessageCircle size={16} />Solicitar via WhatsApp</a>)}
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
    <div className="fixed inset-0 z-[9998] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#0f172a] text-white rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl border border-blue-500/30 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header EliteDoc */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/60">
          <div>
            <h2 className="text-lg font-black text-blue-400 uppercase tracking-wide">Novo Documento</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">O que você deseja emitir hoje?</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Categorias Bar - Estilo EliteDoc */}
        <div className="px-6 pt-5 pb-3 bg-slate-900/40 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${selectedCategory === cat.id ? "bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/30" : "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white"}`}
              >
                {cat.id === "pessoais" && <FileText className="w-3.5 h-3.5" />}
                {cat.id === "veiculos" && <Car className="w-3.5 h-3.5" />}
                {cat.id === "saude" && <Pill className="w-3.5 h-3.5" />}
                {cat.id === "certidoes" && <FileText className="w-3.5 h-3.5" />}
                {cat.id === "estudante" && <GraduationCap className="w-3.5 h-3.5" />}
                {cat.id === "faturas" && <CreditCard className="w-3.5 h-3.5" />}
                {cat.label}
              </button>
            ))}
          </div>

          {selectedCategory !== "todos" && (
            <button onClick={() => setSelectedCategory("todos")} className="text-[11px] font-bold text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1">
              ← Ver Todos
            </button>
          )}
        </div>

        {/* Corpo de Seleção de Documentos - Estilo EliteDoc */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar max-h-[60vh]">
          {selectedCategory === "faturas" ? (
            <div className="py-10 text-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 p-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                    className={`flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-200 group hover:scale-[1.02] active:scale-95 ${canAfford ? 'bg-slate-900/80 border-blue-900/50 hover:border-blue-400/80 hover:bg-slate-800' : 'bg-slate-900/40 border-slate-800 opacity-60'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 transition-colors ${canAfford ? 'bg-blue-950/60 text-blue-400 group-hover:bg-blue-600 group-hover:text-white' : 'bg-slate-800 text-slate-500'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[12px] font-black text-slate-100 uppercase tracking-tight leading-tight mb-2 min-h-[28px] flex items-center justify-center">{doc.label}</span>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg border ${isFree ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : canAfford ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-rose-950/60 border-rose-500/50 text-rose-300'}`}>
                      {isFree ? 'R$ 0,00' : doc.priceFormatted}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300">Saldo: <strong className="text-emerald-400">R$ {(userBalance / 100).toFixed(2).replace(".", ",")}</strong></span>
          </div>
          <button onClick={() => { onClose(); handleRecarregar(); }} className="text-xs font-black text-blue-400 hover:text-blue-300 uppercase tracking-wider flex items-center gap-1.5"><CreditCard size={14} /> Recarregar</button>
        </div>
      </div>
    </div>
  );
}

