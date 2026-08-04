import { useState } from "react";
import { X, Zap, Calendar, CalendarDays, Wallet, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { comprarPlano, getPlanoStatus } from "@/lib/snoopApi";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ConsultasPlanModalProps {
  open: boolean;
  onClose: () => void;
  onPlanActivated: () => void;
  userBalance: number;
}

const PLANS = [
  {
    key: "diario" as const,
    label: "Diário",
    price: 5.00,
    duration: "24 horas",
    icon: Zap,
    color: "from-blue-500 to-cyan-500",
    badge: "Experimental",
    badgeColor: "bg-blue-500/20 text-blue-300",
    features: ["Acesso por 24 horas", "Todos os módulos inclusos", "Resultados em tempo real"],
  },
  {
    key: "semanal" as const,
    label: "Semanal",
    price: 50.00,
    duration: "7 dias",
    icon: Calendar,
    color: "from-violet-600 to-purple-500",
    badge: "Popular",
    badgeColor: "bg-violet-500/20 text-violet-300",
    features: ["Acesso por 7 dias", "Todos os 44+ módulos", "Consultas ilimitadas", "Prioridade no suporte"],
    highlight: true,
  },
  {
    key: "mensal" as const,
    label: "Mensal",
    price: 100.00,
    duration: "30 dias",
    icon: CalendarDays,
    color: "from-emerald-500 to-teal-500",
    badge: "Melhor custo",
    badgeColor: "bg-emerald-500/20 text-emerald-300",
    features: ["Acesso por 30 dias", "Todos os 44+ módulos", "Consultas ilimitadas", "Suporte prioritário", "Acesso antecipado a novos módulos"],
  },
];

export default function ConsultasPlanModal({ open, onClose, onPlanActivated, userBalance }: ConsultasPlanModalProps) {
  const { updateBalance } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  if (!open) return null;

  const handleComprar = async (planoKey: "diario" | "semanal" | "mensal") => {
    const plan = PLANS.find(p => p.key === planoKey)!;
    if (userBalance < plan.price) {
      toast.error(`Saldo insuficiente. Você tem R$ ${userBalance.toFixed(2)} e precisa de R$ ${plan.price.toFixed(2)}.`);
      return;
    }
    setLoading(planoKey);
    try {
      const result = await comprarPlano(planoKey);
      if (result.success) {
        updateBalance(result.new_balance);
        toast.success(`✅ Plano ${plan.label} ativado com sucesso! Válido por ${plan.duration}.`);
        onPlanActivated();
        onClose();
      } else {
        toast.error(result.error || "Erro ao ativar plano.");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao processar pagamento.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", border: "1px solid rgba(139,92,246,0.3)" }}
      >
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)" }}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Planos de Consultas</h2>
              <p className="text-slate-400 text-sm">Ative um plano para acessar todos os 44+ módulos de consulta</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 px-4 py-2 rounded-xl" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-slate-300">Seu saldo atual:</span>
            <span className="font-bold text-emerald-400">R$ {userBalance.toFixed(2)}</span>
          </div>
        </div>

        {/* Plans */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const canAfford = userBalance >= plan.price;
            const isLoading = loading === plan.key;
            return (
              <div
                key={plan.key}
                className="relative rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: plan.highlight
                    ? "linear-gradient(135deg, #3730a3 0%, #4c1d95 100%)"
                    : "rgba(255,255,255,0.04)",
                  border: plan.highlight ? "2px solid rgba(139,92,246,0.6)" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {plan.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, #7c3aed, #4f46e5, #7c3aed)" }} />
                )}
                <div className="p-5">
                  {/* Badge */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-3 ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>

                  {/* Icon + Name */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br ${plan.color}`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{plan.label}</p>
                      <p className="text-slate-400 text-xs">{plan.duration}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-3xl font-black text-white">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => handleComprar(plan.key)}
                    disabled={!canAfford || !!loading}
                    className="w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: canAfford
                        ? `linear-gradient(135deg, ${plan.key === 'diario' ? '#2563eb, #0891b2' : plan.key === 'semanal' ? '#7c3aed, #4f46e5' : '#059669, #0d9488'})`
                        : "rgba(255,255,255,0.1)",
                      color: "white",
                    }}
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                    ) : canAfford ? (
                      "Ativar Plano"
                    ) : (
                      "Saldo insuficiente"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="px-8 pb-6 text-center text-xs text-slate-500">
          O valor será debitado do seu saldo DocMaster. Consultas ilimitadas durante o período do plano.
        </div>
      </div>
    </div>
  );
}
