import { useState, useEffect } from "react";
import { X, Gift, Network, Banknote, Copy, Check, Users, ArrowUp, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReferredUser {
  id: string;
  username: string;
  created_at: string;
  is_active: number;
}

interface Earning {
  earned_amount: number;
  created_at: string;
  referred_username: string;
}

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReferralModal({ isOpen, onClose }: ReferralModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/referral", { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Erro ao carregar dados de indicação:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen]);

  const handleCopy = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    toast.success("Link copiado com sucesso!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#0f172a] text-white border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight m-0 uppercase italic">
                Indique e Ganhe
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Programa de Afiliados Elite</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border-none bg-slate-800 cursor-pointer flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 opacity-60" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sincronizando rede de indicações...</p>
            </div>
          ) : (
            <>
              {/* Explicativo */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4">
                <p className="text-xs font-black text-emerald-300 uppercase leading-snug mb-1">
                  Ganhe 10% de TODAS as recargas dos seus amigos, para sempre!
                </p>
                <p className="text-[11px] text-emerald-400/80 font-medium leading-relaxed">
                  Você recebe 10% de comissão em saldo sobre cada transação realizada pelos seus indicados para gerar documentos.
                </p>
              </div>

              {/* Link Section */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">
                  Seu Link Exclusivo de Indicação
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-200 truncate font-mono">
                    {data?.referralLink}
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`px-5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 border ${
                      copied
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : "bg-blue-600 border-blue-500 text-white hover:bg-blue-500"
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "COPIADO" : "COPIAR"}
                  </button>
                </div>
              </div>

              {/* Minha Rede */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Network size={14} className="text-blue-400" /> Minha Rede
                  </h3>
                  <span className="text-[10px] font-black bg-blue-950/60 border border-blue-500/40 text-blue-300 px-2.5 py-0.5 rounded-md font-mono">
                    {data?.network?.length || 0} INDICADOS
                  </span>
                </div>
                <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="max-h-[140px] overflow-y-auto custom-scrollbar">
                    {data?.network?.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        Ninguém na sua rede ainda
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <tbody className="divide-y divide-slate-800">
                          {data?.network?.map((user: ReferredUser) => (
                            <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                              <td className="px-4 py-3 font-black text-slate-200 uppercase">{user.username}</td>
                              <td className="px-4 py-3 text-slate-400 font-bold font-mono">{new Date(user.created_at).toLocaleDateString("pt-BR")}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  user.is_active ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40" : "bg-slate-800 text-slate-400"
                                }`}>
                                  {user.is_active ? "ATIVO" : "INATIVO"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* Últimos Ganhos */}
              <div className="pt-2 border-t border-slate-800">
                <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Banknote size={14} className="text-emerald-400" /> Últimos Ganhos
                </h3>
                <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="max-h-[160px] overflow-y-auto custom-scrollbar">
                    {data?.earnings?.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        Nenhum ganho registrado ainda
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800">
                        {data?.earnings?.map((earning: Earning, idx: number) => (
                          <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                <ArrowUp size={14} />
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-200 m-0 uppercase leading-none">
                                  {earning.referred_username}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 m-0 mt-1 uppercase font-mono">
                                  {new Date(earning.created_at).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-emerald-400 font-mono tracking-tight m-0">
                                + R$ {Number(earning.earned_amount).toFixed(2).replace(".", ",")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 text-center">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            DocMaster Affiliate © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
