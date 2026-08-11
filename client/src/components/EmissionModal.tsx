import { useEffect } from "react";
import { useLocation } from "wouter";

interface EmissionModalProps {
  docLabel: string;
  docEmoji?: string;
  documentPrice?: number;
  userBalance?: number;
  isFree?: boolean;
  showConfirm: boolean;
  showSuccess: boolean;
  isEmitting: boolean;
  isDownloading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDownload: () => void;
  onClose: () => void;
  historyPath: string;
}

export default function EmissionModal({
  docLabel,
  docEmoji = "📄",
  documentPrice = 0,
  userBalance = 0,
  isFree = false,
  showConfirm,
  showSuccess,
  isEmitting,
  isDownloading,
  onConfirm,
  onCancel,
  onDownload,
  onClose,
  historyPath,
}: EmissionModalProps) {
  const [, setLocation] = useLocation();

  const saldoInsuficiente = !isFree && documentPrice > 0 && userBalance < documentPrice;
  const saldoApos = isFree ? userBalance : userBalance - documentPrice;

  // Auto-download e redirecionamento para /dashboard no modal de sucesso (splash)
  useEffect(() => {
    if (showSuccess) {
      let isMounted = true;
      const runAutoFlow = async () => {
        try {
          await onDownload();
        } catch (e) {
          console.error("[EmissionModal] Auto download:", e);
        }
        setTimeout(() => {
          if (isMounted) {
            onClose();
            setLocation("/dashboard");
          }
        }, 1500);
      };
      runAutoFlow();
      return () => { isMounted = false; };
    }
  }, [showSuccess]);

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backdropFilter: "blur(8px)",
  };

  const card: React.CSSProperties = {
    background: "#000000",
    borderRadius: 20,
    padding: "36px 32px 28px",
    textAlign: "center",
    maxWidth: 420,
    width: "90%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(37, 99, 235, 0.15)",
    border: "1px solid #1e293b",
    color: "#f8fafc",
  };

  const btnBase: React.CSSProperties = {
    width: "100%",
    border: "none",
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 14,
    padding: "12px 0",
    transition: "all 0.2s",
  };

  const btnGreen: React.CSSProperties = { ...btnBase, background: "#16a34a", color: "#fff" };
  const btnBlue: React.CSSProperties = { ...btnBase, background: "#2563eb", color: "#fff", fontSize: 13, padding: "11px 0" };
  const btnGray: React.CSSProperties = { ...btnBase, background: "#0f172a", color: "#94a3b8", border: "1px solid #1e293b", fontSize: 12, padding: "10px 0" };

  // ── Modal de Confirmação ──
  if (showConfirm) {
    return (
      <div style={overlay}>
        <div style={card}>
          {/* Ícone do documento */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "#1e1b4b", border: "2px solid #6366f1",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 18px", fontSize: 32,
            boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)"
          }}>
            {docEmoji}
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#ffffff", margin: "0 0 8px" }}>
            Confirmar Emissão
          </h2>
          <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 20px", lineHeight: 1.5 }}>
            Você está prestes a emitir um <strong style={{ color: "#38bdf8" }}>{docLabel}</strong>.
          </p>

          {/* Tabela de custo */}
          <div style={{
            background: "#050b14", borderRadius: 12, padding: "14px 18px",
            marginBottom: 20, border: "1px solid #1e293b", textAlign: "left",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>Custo do documento:</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: (isFree || documentPrice === 0) ? "#4ade80" : "#ef4444" }}>
                {isFree ? "Grátis (Plano Admin)" : documentPrice > 0 ? `R$ ${(documentPrice / 100).toFixed(2).replace(".", ",")}` : "Grátis"}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#94a3b8" }}>Seu saldo atual:</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: (isFree || userBalance >= documentPrice) ? "#4ade80" : "#ef4444" }}>
                R$ {(userBalance / 100).toFixed(2).replace(".", ",")}
              </span>
            </div>
            {!isFree && documentPrice > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #1e293b" }}>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>Saldo após emissão:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: saldoApos >= 0 ? "#cbd5e1" : "#ef4444" }}>
                  R$ {(saldoApos / 100).toFixed(2).replace(".", ",")}
                </span>
              </div>
            )}
          </div>

          {/* Aviso de saldo insuficiente */}
          {saldoInsuficiente && (
            <div style={{
              background: "#450a0a", border: "1px solid #991b1b", borderRadius: 8,
              padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#fca5a5", fontWeight: 600,
            }}>
              ⚠️ Saldo insuficiente! Recarregue seu saldo para continuar.
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{ ...btnGray, flex: 1, width: "auto" }}
              onClick={onCancel}
              disabled={isEmitting}
            >
              Cancelar
            </button>
            <button
              style={{
                ...btnGreen, flex: 2, width: "auto",
                opacity: saldoInsuficiente || isEmitting ? 0.6 : 1,
                cursor: saldoInsuficiente || isEmitting ? "not-allowed" : "pointer",
                background: saldoInsuficiente || isEmitting ? "#475569" : "#16a34a",
              }}
              disabled={saldoInsuficiente || isEmitting}
              onClick={onConfirm}
            >
              {isEmitting ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{
                    width: 14, height: 14, border: "2px solid white",
                    borderTopColor: "transparent", borderRadius: "50%",
                    animation: "emspin 1s linear infinite", display: "inline-block",
                  }} />
                  Emitindo...
                </span>
              ) : (
                "✅ Confirmar e Emitir"
              )}
            </button>
          </div>
        </div>
        <style>{`@keyframes emspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Modal de Sucesso (Splash Verificado + Download + Redirecionamento) ──
  if (showSuccess) {
    return (
      <div style={overlay}>
        <div style={{
          ...card,
          border: "1px solid rgba(34, 197, 94, 0.4)",
          boxShadow: "0 25px 80px rgba(0,0,0,0.95), 0 0 50px rgba(34, 197, 94, 0.2)"
        }}>
          {/* Splash com Ícone de Verificado Animado */}
          <div style={{
            width: 84, height: 84, borderRadius: "50%",
            background: "#052e16", border: "3px solid #22c55e",
            display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 20px",
            boxShadow: "0 0 30px rgba(34, 197, 94, 0.4)"
          }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#22c55e", margin: "0 0 6px", letterSpacing: "0.5px" }}>
            DOCUMENTO EMITIDO COM SUCESSO!
          </h2>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 22px" }}>
            {isDownloading ? "Gerando PDF e realizando download automático..." : "Download em andamento! Redirecionando para a Dashboard..."}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              style={{ ...btnGreen, opacity: isDownloading ? 0.7 : 1 }}
              disabled={isDownloading}
              onClick={onDownload}
            >
              {isDownloading ? "Gerando PDF..." : `⬇️ BAIXAR ${docLabel.toUpperCase()}`}
            </button>

            <button
              style={btnGray}
              onClick={() => {
                onClose();
                setLocation("/dashboard");
              }}
            >
              🚀 IR PARA DASHBOARD
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
