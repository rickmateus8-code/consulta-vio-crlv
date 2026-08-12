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

  const getRankColor = (rank: string) => {
    switch (rank) {
      case "BRONZE": return "text-amber-500";
      case "PRATA": return "text-blue-400";
      case "OURO": return "text-amber-400";
      default: return "text-slate-400";
    }
  };

  const nextNeeded = Math.max(0, loyalty.nextGoal - loyalty.thisWeekVolume);

  return (
    <div className="bg-[#0f172a] text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl mb-8 animate-in fade-in duration-500 overflow-hidden relative">
      {/* Glow Effect */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header Info - Estilo EliteDoc */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
            <Crown size={28} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight text-white uppercase italic m-0">{loyalty.currentRank}</h2>
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-500/20 border border-amber-500/40 text-amber-300 uppercase tracking-wider">
                {loyalty.currentBonus}% BÔNUS
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 m-0">
                <Hourglass size={12} className="text-amber-400" />
                ESTE STATUS EXPIRA EM: <span className="text-blue-400 font-mono font-black">{timeLeft}</span>
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SUA PATENTE ATUAL ●</span>
                <button 
                  onClick={() => setShowRules(true)} 
                  className="text-[10px] font-black text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider bg-transparent border-none cursor-pointer p-0 underline"
                >
                  SAIBA MAIS
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Roadmap - Estilo EliteDoc */}
      <div className="relative pt-2 pb-2">
        {/* Progress Markers Top */}
        <div className="flex justify-between px-2 mb-2 text-[10px] font-black tracking-wider">
          <span className="text-amber-500">BRONZE (25%)</span>
          <span className="text-blue-400">PRATA (30%)</span>
          <span className="text-amber-400">OURO (40% - OBJETIVO R$ 250,00)</span>
        </div>

        {/* Progress Bar Container */}
        <div className="h-4 w-full bg-slate-900 rounded-full relative overflow-hidden shadow-inner border border-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 via-blue-500 to-amber-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Sub-labels abaixo da barra */}
        <div className="flex items-center justify-between mt-2 px-1 text-[10px] font-black text-slate-400 uppercase tracking-wider">
          <span>INVESTIDO: <strong className="text-blue-400">R$ {(loyalty.thisWeekVolume / 100).toFixed(2).replace('.', ',')}</strong></span>
          <span>25%</span>
          <span>30%</span>
          <span>40%</span>
        </div>
      </div>

      {/* Next Level Box - Estilo EliteDoc */}
      <div className="mt-6 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
            <Rocket size={20} />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider m-0">
              PRÓXIMO NÍVEL: <span className={getRankColor(loyalty.nextRank)}>{loyalty.nextRank}</span>
            </h3>
            <p className="text-xs font-medium text-slate-300 mt-0.5">
              {nextNeeded > 0 ? (
                <>Faltam <strong className="text-blue-400">R$ {(nextNeeded / 100).toFixed(2).replace('.', ',')}</strong> na semana atual para subir a patente da próxima semana.</>
              ) : (
                <>Você atingiu a patente máxima <strong className="text-amber-400">OURO (40%)</strong>!</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono font-black text-[10px] uppercase">
            SEMANA QUE VEM: {loyalty.currentRank} ({loyalty.currentBonus}%)
          </span>
          <span className="px-3 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 font-mono font-black text-[10px] uppercase flex items-center gap-1">
            <RefreshCw size={12} className="animate-spin" /> RESETA EM: {timeLeft}
          </span>
        </div>
      </div>

      <PatentRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
