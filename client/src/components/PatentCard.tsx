import { useState, useEffect } from "react";
import { Crown, Rocket, Hourglass, HelpCircle, CheckCircle2, ChevronRight, X, AlertTriangle, RefreshCw } from "lucide-react";

interface PatentCardProps {
  loyalty: {
    thisWeekVolume: number;
    lastWeekVolume: number;
    currentRank: string;
    currentBonus: number;
    nextRank: string;
    nextGoal: number;
    resetDate: number;
  };
}

function PatentRulesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-blue-600/10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
                <Rocket size={24} />
             </div>
             <h2 className="text-xl font-black text-white tracking-tight m-0 uppercase italic">Clube de recarga semanal</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full border-none bg-white/5 cursor-pointer flex items-center justify-center text-gray-400 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <p className="text-gray-400 text-sm leading-relaxed text-center">
            Aqui sua parceria gera <strong className="text-blue-500">lucro imediato</strong>. Acumule suas recargas durante a semana e <strong className="text-white">garanta a maior bonificação</strong>!
          </p>
          
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest text-center py-3">
              <span>Patente</span>
              <span>Meta Acumulada</span>
              <span>Bônus</span>
            </div>
            {[
              { rank: "RECRUTA", meta: "Início", bonus: "20%", bg: "bg-white/[0.02]" },
              { rank: "BRONZE", meta: "R$ 100,00", bonus: "25%", bg: "bg-white/[0.04]", color: "text-orange-500" },
              { rank: "PRATA", meta: "R$ 180,00", bonus: "30%", bg: "bg-white/[0.02]", color: "text-blue-400" },
              { rank: "OURO", meta: "R$ 250,00+", bonus: "40%", bg: "bg-white/[0.04]", color: "text-amber-500" },
            ].map((r, i) => (
              <div key={i} className={`grid grid-cols-3 py-4 text-center border-t border-white/5 items-center ${r.bg}`}>
                <span className={`font-black text-xs ${r.color || "text-gray-500"}`}>{r.rank}</span>
                <span className="text-xs text-gray-300 font-bold">{r.meta}</span>
                <span className="text-sm font-black text-white">{r.bonus}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
               <div className="mb-3"><strong className="text-blue-500 block text-[10px] uppercase tracking-widest mb-1">1. ACÚMULO INTELIGENTE</strong><p className="text-xs text-gray-400 leading-snug">Toda recarga de segunda a domingo vai somando. Não precisa carregar tudo de uma vez!</p></div>
               <div className="mb-3"><strong className="text-emerald-500 block text-[10px] uppercase tracking-widest mb-1">2. ATIVAÇÃO NA HORA</strong><p className="text-xs text-gray-400 leading-snug">Bateu a meta? O bônus maior já vale para aquela mesma recarga e as próximas.</p></div>
               <div><strong className="text-purple-500 block text-[10px] uppercase tracking-widest mb-1">3. A TRAVA DE SEGUNDA-FEIRA</strong><p className="text-xs text-gray-400 leading-snug">Ao bater a meta, você garante essa patente para a semana seguinte inteira!</p></div>
            </div>
            <div className="p-4 bg-amber-500/10 border-l-4 border-amber-500 rounded-lg">
               <p className="text-xs text-amber-200 leading-relaxed"><strong>DICA DE MESTRE:</strong> Atingindo OURO na terça, você lucra 40% o resto da semana E garante 40% fixo na próxima semana!</p>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white/[0.02] text-center border-t border-white/5">
           <button onClick={onClose} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 border-none cursor-pointer uppercase">Entendido, bora subir!</button>
        </div>
      </div>
    </div>
  );
}

export default function PatentCard({ loyalty }: PatentCardProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = loyalty.resetDate - now;

      if (distance < 0) {
        setTimeLeft("00d 00h 00m");
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft(`${days.toString().padStart(2, '0')}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`);
    }, 1000);

    return () => clearInterval(timer);
  }, [loyalty.resetDate]);

  const progress = Math.min(100, (loyalty.thisWeekVolume / 25000) * 100);
  
  // Status para semana que vem: baseia-se apenas no volume DESTA SEMANA
  const isGuaranteed = loyalty.thisWeekVolume >= 10000;
  const earnedBonusThisWeek = (() => {
    if (loyalty.thisWeekVolume >= 25000) return "40%";
    if (loyalty.thisWeekVolume >= 18000) return "30%";
    if (loyalty.thisWeekVolume >= 10000) return "25%";
    return "20%";
  })();

  const getRankColor = (rank: string) => {
    switch (rank) {
      case "BRONZE": return "text-orange-500";
      case "PRATA": return "text-blue-400";
      case "OURO": return "text-amber-500";
      default: return "text-slate-400";
    }
  };

  const getRankBadge = (rank: string) => {
    switch (rank) {
      case "BRONZE": return "bg-orange-500 shadow-orange-500/20";
      case "PRATA": return "bg-blue-500 shadow-blue-500/20";
      case "OURO": return "bg-amber-500 shadow-amber-500/20";
      default: return "bg-slate-500 shadow-slate-500/20";
    }
  };

  return (
    <div className="bg-[#0f172a] text-white rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl mb-8 animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden relative group">
      {/* Glow Effect */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10 relative z-10">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 shadow-inner transition-transform group-hover:scale-110 duration-500 ${getRankColor(loyalty.currentRank)}`}>
            <Crown size={36} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black tracking-tighter dark:text-white uppercase m-0 italic">{loyalty.currentRank}</h2>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-wider shadow-lg ${getRankBadge(loyalty.currentRank)}`}>
                {loyalty.currentBonus}% BÔNUS
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Hourglass size={12} className="text-gray-400" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest m-0">
                ESTE STATUS EXPIRA EM: <span className="text-blue-600 dark:text-blue-400">{timeLeft}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 mt-3">
               <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Sua Patente Atual</span>
               <button 
                 onClick={() => setShowRules(true)} 
                 className="flex items-center gap-1.5 text-[10px] font-black text-blue-500 hover:text-blue-600 transition-colors uppercase tracking-widest bg-transparent border-none cursor-pointer p-0 group/btn"
               >
                 Saiba Mais <ChevronRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
               </button>
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col items-center md:items-end text-right bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status para semana que vem</p>
            {isGuaranteed ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={14} />
                <span className="text-[11px] font-black uppercase tracking-wider">GARANTIDO ({earnedBonusThisWeek})</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-400">
                <AlertTriangle size={14} />
                <span className="text-[11px] font-black uppercase tracking-wider">PENDENTE</span>
              </div>
            )}
        </div>
      </div>

      {/* Progress Roadmap */}
      <div className="relative pt-8 pb-4">
        {/* Markers Labels */}
        <div className="flex justify-between px-2 mb-4">
           <div className="flex flex-col items-center">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">BRONZE</span>
             <span className="text-[11px] font-black text-orange-500 italic">25%</span>
           </div>
           <div className="flex flex-col items-center">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">PRATA</span>
             <span className="text-[11px] font-black text-blue-400 italic">30%</span>
           </div>
           <div className="flex flex-col items-center">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">OURO</span>
             <span className="text-[11px] font-black text-amber-500 italic">40%</span>
           </div>
        </div>

        {/* Progress Bar Container */}
        <div className="h-5 w-full bg-gray-100 dark:bg-white/5 rounded-2xl relative overflow-hidden shadow-inner border border-gray-200/50 dark:border-white/5">
          {/* Active Progress */}
          <div 
            className="h-full bg-gradient-to-r from-orange-500 via-blue-500 to-amber-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.3)] relative"
            style={{ width: `${progress}%` }}
          >
             <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-stripe_1s_linear_infinite]" />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 px-1">
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Investido</span>
             <span className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tight tabular-nums">R$ {(loyalty.thisWeekVolume / 100).toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="w-12 h-px bg-slate-100 dark:bg-white/5 mx-4" />
          <div className="flex flex-col text-right">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Objetivo</span>
             <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">R$ 250,00</span>
          </div>
        </div>
      </div>

      {/* Next Step Box */}
      {loyalty.nextGoal > 0 && (
        <div className="mt-8 p-6 rounded-3xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex flex-col md:flex-row items-center gap-6 group/next">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20 group-hover/next:rotate-12 transition-transform">
            <Rocket size={24} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em] mb-1">
              Próximo Nível: <span className={getRankColor(loyalty.nextRank)}>{loyalty.nextRank}</span>
            </h3>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Faltam <span className="text-blue-600 dark:text-blue-400">R$ {((loyalty.nextGoal - loyalty.thisWeekVolume) / 100).toFixed(2).replace('.', ',')}</span> para você subir sua lucratividade.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1.5 shrink-0 border-l border-blue-200 dark:border-blue-800/50 pl-6">
             <div className="flex items-center gap-2 text-rose-500">
                <RefreshCw size={14} className="animate-spin-slow" />
                <span className="text-[10px] font-black uppercase tracking-widest">RESETA EM: {timeLeft}</span>
             </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes progress-stripe {
          0% { background-position: 0 0; }
          100% { background-position: 20px 0; }
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `}</style>
      <PatentRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
