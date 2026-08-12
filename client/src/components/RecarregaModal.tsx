import { useState, useEffect } from "react";
import { X, MessageCircle, Copy, Check, Wallet, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const RECARREGA_MODAL_EVENT = "docmaster:open-recarrega-modal";
export const RECARREGA_MODAL_PENDING_KEY = "docmaster:pending-recarrega-modal";

export function openRecarregaModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RECARREGA_MODAL_EVENT));
}

export function queueRecarregaModalOpen() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(RECARREGA_MODAL_PENDING_KEY, "1");
  openRecarregaModal();
}

interface RecarregaModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  userCpf?: string;
}

export default function RecarregaModal({
  isOpen,
  onClose,
  userName = "",
}: RecarregaModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(50);
  const [copied, setCopied] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");

  const effectiveUserName = userName || user?.displayName || user?.username || "Cliente";

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((data) => {
        if (data?.support_whatsapp) {
          const clean = data.support_whatsapp.replace(/\D/g, "");
          setWhatsappNumber(clean);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const getMessageText = () => {
    return `Olá! Gostaria de adicionar R$ ${amount},00 de saldo na minha conta DocMaster.\n\n👤 Usuário: ${effectiveUserName}\n💰 Valor da Recarga: R$ ${amount},00\n\nPor favor, envie a chave PIX para adicionar meu saldo.`;
  };

  const handleOpenWhatsapp = () => {
    if (!amount || amount < 10) {
      toast.error("Valor mínimo para recarga é de R$ 10,00");
      return;
    }
    const phone = whatsappNumber || "5511999999999";
    const text = encodeURIComponent(getMessageText());
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
    toast.success("Redirecionando para o WhatsApp do Administrador...");
    onClose();
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(getMessageText());
    setCopied(true);
    toast.success("Mensagem copiada para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto custom-scrollbar"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 rounded-[36px] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight m-0">
                Adicionar Saldo
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Atendimento Direto via WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-none bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Informativo de Contato Direto */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 mb-6 flex gap-3 items-start">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed font-medium">
            <span className="font-bold block text-emerald-700 dark:text-emerald-400 mb-0.5">Recarga Segura e Imediata</span>
            As solicitações de adição de saldo no DocMaster são realizadas diretamente com a equipe de atendimento via WhatsApp.
          </div>
        </div>

        {/* Seleção de Valor */}
        <div className="space-y-5">
          <div>
            <label className="block text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">
              Escolha o valor da recarga
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[20, 50, 100, 200].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`py-2.5 rounded-xl font-black text-xs transition-all border ${
                    amount === val
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30"
                      : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-emerald-500"
                  }`}
                >
                  R$ {val}
                </button>
              ))}
            </div>

            {/* Ajuste com incremento / decremento */}
            <div className="flex items-center justify-between w-full bg-slate-50 dark:bg-white/5 rounded-2xl p-2 border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setAmount((prev) => Math.max(10, prev - 10))}
                disabled={amount <= 10}
                className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all border-none disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
              >
                −
              </button>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Valor Selecionado</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">R$ {amount},00</span>
              </div>
              <button
                type="button"
                onClick={() => setAmount((prev) => prev + 10)}
                className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all border-none shadow-sm"
              >
                +
              </button>
            </div>
          </div>

          {/* Botão Principal WhatsApp */}
          <button
            onClick={handleOpenWhatsapp}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2.5 active:scale-[0.98]"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>SOLICITAR SALDO VIA WHATSAPP</span>
          </button>

          {/* Copiar mensagem */}
          <button
            onClick={handleCopyMessage}
            className="w-full py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "MENSAGEM COPIADA!" : "COPIAR MENSAGEM DE SOLICITAÇÃO"}</span>
          </button>
        </div>

        {/* Rodapé explicativo */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Atendimento Rápido</span>
          </div>
          <span className="font-bold text-slate-500 dark:text-slate-400">DocMaster Suporte</span>
        </div>
      </div>
    </div>
  );
}
