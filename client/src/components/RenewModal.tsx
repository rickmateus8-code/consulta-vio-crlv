import React, { useState } from "react";
import { Clock, X, CheckCircle2, ArrowRight, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";

interface RenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: any;
  onRenewSuccess: (newBalance: number) => void;
}

const RENEW_OPTIONS = [
  { label: "1 Mês Extra (+30 dias)", months: 1, price: 1000, desc: "Renovação rápida por +1 mês (R$ 10,00)" },
  { label: "3 Meses Extras (+90 dias)", months: 3, price: 2500, desc: "Mais tempo no painel (Economize R$ 5,00)", popular: true },
  { label: "6 Meses Extras (+180 dias)", months: 6, price: 4500, desc: "Melhor custo-benefício (Economize R$ 15,00)" },
];

export default function RenewModal({ isOpen, onClose, doc, onRenewSuccess }: RenewModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState(RENEW_OPTIONS[1]);

  if (!isOpen) return null;

  const handleRenew = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: doc.id,
          months: selectedOption.months,
          price: selectedOption.price,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Documento renovado por +${selectedOption.months} meses!`);
        if (result.newBalance !== undefined) onRenewSuccess(result.newBalance);
        onClose();
      } else {
        toast.error(result.error || "Erro ao renovar documento");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between bg-emerald-500/5">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 rounded-[1.2rem] bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Clock size={28} />
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight m-0">Ficar mais meses no painel</h2>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest mt-1">Expansão de Validade Digital</p>
             </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full border-none bg-slate-100 dark:bg-slate-800 cursor-pointer flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
           <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 mb-8 flex items-center justify-between gap-4">
              <div>
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Documento Selecionado</span>
                 <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{doc.nome || doc.paciente || "—"}</span>
              </div>
              <div className="text-right">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status Atual</span>
                 <div className="flex items-center gap-1.5 justify-end">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-black text-emerald-600 uppercase">Ativo no Painel</span>
                 </div>
              </div>
           </div>

           <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Escolha seu plano de renovação</span>
              {RENEW_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full text-left p-5 rounded-[1.5rem] border-2 transition-all flex items-center justify-between group relative overflow-hidden ${
                    selectedOption.months === opt.months 
                    ? "border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/10" 
                    : "border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900/30"
                  }`}
                >
                  {opt.popular && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[8px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-tighter">
                      RECOMENDADO
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedOption.months === opt.months ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                        <Zap size={20} />
                     </div>
                     <div>
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{opt.label}</span>
                        <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">R$ {(opt.price / 100).toFixed(2).replace('.', ',')}</span>
                  </div>
                </button>
              ))}
           </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-6">
           <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck size={18} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Seguro & Imediato</span>
           </div>
           <button 
             onClick={handleRenew}
             disabled={loading}
             className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
           >
             {loading ? "PROCESSANDO..." : <>CONFIRMAR RENOVAÇÃO <ArrowRight size={16} /></>}
           </button>
        </div>
      </div>
    </div>
  );
}
