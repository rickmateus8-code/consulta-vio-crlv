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
  const [insufficientDoc, setInsufficientDoc] = useState<DocOption | null>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState("");

  const perms = (() => {
    if (!user?.permissions) return { editaveis: [], ferramentas: [] };
    if (typeof user.permissions === "object") return user.permissions;
    try {
      return JSON.parse(user.permissions);
    } catch {
      return { editaveis: [], ferramentas: [] };
    }
  })();
  const allowedEditables = Array.isArray(perms.editaveis) ? perms.editaveis : [];
  const allowedTools = Array.isArray(perms.ferramentas) ? perms.ferramentas : [];

  const freeDocs = (() => {
    if (!user?.free_documents) return [];
    if (Array.isArray(user.free_documents)) return user.free_documents;
    try {
      return JSON.parse(user.free_documents);
    } catch {
      return [];
    }
  })();

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

        // FILTRAR POR PERMISSÕES
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
    
    // Lógica de verificação de gratuidade unificada (Sincronizada com Sidebar e Backend)
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

  return (
    <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div><h2 className="text-xl font-black text-emerald-600 uppercase italic">Novo Documento</h2><p className="text-xs text-gray-500 font-medium">O que você deseja emitir hoje?</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-xl p-3 mb-5 flex items-center gap-3"><Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /><span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Seu saldo: <strong>R$ {(userBalance / 100).toFixed(2).replace(".", ",")}</strong></span></div>
          {loading ? (
            <div className="py-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Carregando...</div>
          ) : docs.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-xs font-black uppercase italic tracking-widest">Nenhuma ferramenta liberada ainda.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {docs.map(doc => {
                const Icon = doc.icon;
                const freeDocsArr = Array.isArray(user?.free_documents) ? user.free_documents : [];
                
                // Lógica de verificação de gratuidade unificada para exibição
                const isFree = user?.role === 'admin' || 
                  freeDocsArr.includes(doc.key) ||
                  (doc.key === "peticaocria" && (freeDocsArr.includes("peticao-stj") || freeDocsArr.includes("peticao"))) ||
                  (doc.key === "historicocria" && freeDocsArr.includes("historico-uninter")) ||
                  (doc.key === "toxicologico" && freeDocsArr.includes("toxicologia"));

                const canAfford = isFree || userBalance >= doc.price;

                return (
                  <button key={doc.key} onClick={() => handleSelectDoc(doc)} className={`flex flex-col items-center text-center p-4 rounded-2xl border-2 transition-all active:scale-95 ${canAfford ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800 hover:border-emerald-500' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-60'}`}>
                    <Icon className={`w-7 h-7 mb-2 ${canAfford ? 'text-emerald-500' : 'text-gray-400'}`} />
                    <span className="text-[11px] font-black text-gray-900 dark:text-white uppercase leading-tight mb-2">{doc.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isFree ? 'bg-emerald-500 text-white' : canAfford ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                      {isFree ? 'GRÁTIS' : doc.priceFormatted}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 shrink-0 flex items-center justify-between gap-4">
          <button onClick={() => { onClose(); handleRecarregar(); }} className="flex items-center gap-2 text-xs font-black text-gray-500 hover:text-emerald-600"><CreditCard size={14} />RECARREGAR</button>
          <button onClick={onClose} className="text-xs font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest">Fechar</button>
        </div>
      </div>
    </div>
  );
}
