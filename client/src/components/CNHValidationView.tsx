import React, { useMemo } from "react";

interface CNHValidationViewProps {
  data: any;
}

export default function CNHValidationView({ data }: CNHValidationViewProps) {
  // ── Formatação de Datas (DD/MM/YYYY) ──────────────────────────────────────
  const formatDate = (val: any) => {
    if (!val) return "-----";
    const s = String(val).trim();
    if (s.includes("/")) return s;
    if (s.includes("-")) {
      const parts = s.split("T")[0].split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return s;
  };

  // ── Formatação de CPF (000.000.000-00) ──────────────────────────────────
  const formatCPF = (val: any) => {
    if (!val) return "-----";
    const v = String(val).replace(/\D/g, "");
    if (v.length === 11) {
      return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return String(val);
  };

  // ── Renach Fictício Baseado na UF ───────────────────────────────────────
  const renach = useMemo(() => {
    if (data?.renach) return String(data.renach).toUpperCase();
    const uf = (data?.ufEmissao || data?.uf_emissao || data?.ufRG || data?.uf_rg || "SP").toUpperCase().trim();
    // Gerar seed numérico consistente a partir do ID/Registro para manter fixo no mesmo documento
    const seedSrc = String(data?.id || data?.registro || data?.n_registro || "123456789");
    let hash = 0;
    for (let i = 0; i < seedSrc.length; i++) {
      hash = (hash * 31 + seedSrc.charCodeAt(i)) % 899999999;
    }
    const num = 100000000 + Math.abs(hash);
    return `${uf}${num}`;
  }, [data]);

  // ── Timestamp de Consulta Formatado ─────────────────────────────────────
  const nowFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }, []);

  // ── Extração de Valores Flexível (camelCase + snake_case) ────────────────
  const nome = (data?.nome || data?.nome_completo || data?.paciente || "").toUpperCase() || "-----";
  const cpf = formatCPF(data?.cpf);
  
  let rg = (data?.rg || "").toUpperCase();
  const orgao = (data?.orgaoEmissor || data?.org_emissor_rg || data?.orgao_emissor || "").toUpperCase();
  const ufRG = (data?.ufRG || data?.uf_rg || "").toUpperCase();
  if (orgao) rg += ` / ${orgao}`;
  if (ufRG) rg += ` ${ufRG}`;
  if (!rg) rg = "-----";

  const dataNascimento = formatDate(data?.dataNascimento || data?.data_nascimento);
  const pai = (data?.nomePai || data?.filiacao_pai || data?.pai || "-----").toUpperCase();
  const mae = (data?.nomeMae || data?.filiacao_mae || data?.mae || "-----").toUpperCase();
  const registro = data?.registro || data?.n_registro || "-----";
  const categoria = (data?.categoria || data?.categoria_cnh || "-----").toUpperCase();
  const espelho = data?.espelho || data?.n_cnh || "-----";
  const localEmissao = (data?.localEmissao || data?.local_emissao || "SAO PAULO").toUpperCase();
  const ufEmissao = (data?.ufEmissao || data?.uf_emissao || "SP").toUpperCase();
  const cidadeUf = `${localEmissao} / ${ufEmissao}`;
  const dataEmissao = formatDate(data?.dataEmissao || data?.data_emissao);

  const fotoUrl = data?.fotoUrl || data?.foto || data?.url_cnh_pronta || "";

  const hashKey = useMemo(() => {
    const rawId = String(data?.id || data?.codigo_validacao || "31c64778-606e-436e-9f9d-287574f23abe").toUpperCase();
    return `{UR5G6SY-G1OERYZX3JX6-MVOPI6KKI5ZM-${rawId.slice(0, 8)}}`;
  }, [data]);

  return (
    <div style={{
      fontFamily: "'Roboto', sans-serif",
      backgroundColor: "#f0f0f0",
      margin: 0,
      padding: 0,
      color: "#333",
      minHeight: "100vh",
      width: "100%"
    }}>
      <div style={{
        maxWidth: "480px",
        margin: "0 auto",
        background: "white",
        minHeight: "100vh",
        paddingBottom: "40px",
        boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)"
      }}>
        {/* HEADER */}
        <div style={{ padding: "15px", borderBottom: "1px solid #eee" }}>
          <div style={{ fontSize: "11px", color: "#889", marginBottom: "15px" }}>
            Início / Habilitação / Consulta Autenticidade CNH
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "5px" }}>
            <div>
              <h1 style={{ fontSize: "18px", color: "#8cba38", margin: 0, fontWeight: 700, lineHeight: 1.2 }}>
                CONSULTA AUTENTICIDADE CNH
              </h1>
              <div style={{ fontSize: "18px", color: "#8cba38", fontWeight: 400 }}>
                EXIBIR DADOS AUTENTICIDADE
              </div>
            </div>
          </div>
        </div>

        {/* FOTO DO CONDUTOR */}
        <div style={{ textAlign: "center", margin: "20px 0" }}>
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt="Foto CNH"
              style={{
                width: "120px",
                height: "160px",
                objectFit: "cover",
                borderRadius: "4px",
                background: "#eee"
              }}
            />
          ) : (
            <div style={{
              width: "120px",
              height: "160px",
              margin: "0 auto",
              borderRadius: "4px",
              background: "#eee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              fontSize: "12px"
            }}>
              SEM FOTO
            </div>
          )}
          <div style={{ fontSize: "12px", fontWeight: "bold", marginTop: "5px" }}>
            Foto Original - Detran
          </div>
        </div>

        {/* LINHAS DE DADOS DO CONDUTOR */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", width: "40%" }}>Nome:</div>
          <div style={{ fontSize: "14px", width: "60%", textAlign: "left", color: "#444" }}>{nome}</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", width: "40%" }}>CPF:</div>
          <div style={{ fontSize: "14px", width: "60%", textAlign: "left", color: "#444" }}>{cpf}</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", width: "40%" }}>RG:</div>
          <div style={{ fontSize: "14px", width: "60%", textAlign: "left", color: "#444" }}>{rg}</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", width: "40%" }}>Data de Nascimento:</div>
          <div style={{ fontSize: "14px", width: "60%", textAlign: "left", color: "#444" }}>{dataNascimento}</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", width: "40%" }}>Filiação (Pai):</div>
          <div style={{ fontSize: "14px", width: "60%", textAlign: "left", color: "#444" }}>{pai}</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", width: "40%" }}>Filiação (Mãe):</div>
          <div style={{ fontSize: "14px", width: "60%", textAlign: "left", color: "#444" }}>{mae}</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", width: "40%" }}>Nº de registro da CNH:</div>
          <div style={{ fontSize: "14px", width: "60%", textAlign: "left", color: "#444" }}>{registro}</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", width: "40%" }}>Categoria:</div>
          <div style={{ fontSize: "14px", width: "60%", textAlign: "left", color: "#444" }}>{categoria}</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", width: "40%" }}>Renach:</div>
          <div style={{ fontSize: "14px", width: "60%", textAlign: "left", color: "#444" }}>{renach}</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", width: "40%" }}>Nº do espelho da CNH:</div>
          <div style={{ fontSize: "14px", width: "60%", textAlign: "left", color: "#444" }}>{espelho}</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", width: "40%" }}>Cidade / UF:</div>
          <div style={{ fontSize: "14px", width: "60%", textAlign: "left", color: "#444" }}>{cidadeUf}</div>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", width: "40%" }}>Data da Emissão:</div>
          <div style={{ fontSize: "14px", width: "60%", textAlign: "left", color: "#444" }}>{dataEmissao}</div>
        </div>

        {/* CAIXA DE SUCESSO DETRAN */}
        <div style={{
          backgroundColor: "#dff0d8",
          border: "1px solid #d0e9c6",
          color: "#3c763d",
          padding: "15px",
          margin: "20px",
          borderRadius: "4px",
          textAlign: "center",
          fontSize: "14px",
          lineHeight: 1.4
        }}>
          Os dados informados são os mesmos que constam na base do{" "}
          <span style={{ color: "#2980b9", fontWeight: "bold" }}>Detran</span>{" "}
          <span style={{ color: "#8cba38", fontWeight: "bold", fontSize: "16px" }}>✔</span>
        </div>

        {/* OBSERVAÇÃO */}
        <div style={{
          fontSize: "12px",
          color: "#333",
          padding: "0 20px",
          lineHeight: 1.4,
          marginBottom: "30px"
        }}>
          <strong>Observação:</strong><br />
          A foto apresentada é a mesma impressa na habilitação ou é uma foto mais recente, caso o cidadão já tenha coletado uma nova foto no <strong>Detran</strong>, para um novo serviço. Exemplo: ele pode ter iniciado um processo de adição ou mudança de categoria, após a emissão da CNH acima.
        </div>

        {/* CHAVE DE REGISTRO HASH */}
        <div style={{
          fontFamily: "monospace",
          textAlign: "center",
          fontSize: "11px",
          color: "#555",
          marginBottom: "10px",
          wordBreak: "break-all",
          padding: "0 20px"
        }}>
          Chave de registro de consulta {hashKey}
        </div>

        {/* QR CODE DO APLICATIVO */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=AppCarteiraDigital"
            alt="QR App"
            style={{ width: "150px" }}
          />
        </div>

        {/* FOOTER INFORMATIVO */}
        <div style={{
          backgroundColor: "#e8e8e8",
          padding: "15px",
          textAlign: "center",
          fontSize: "12px",
          color: "#555",
          margin: "20px",
          borderRadius: "4px"
        }}>
          Utilize seu celular e scaneie o <strong>QRCODE</strong> para realizar o download do aplicativo{" "}
          <span style={{ color: "#a98538", fontWeight: "bold" }}>Carteira Digital</span> para consultar sua CNH Digital.
        </div>

        <div style={{ textAlign: "center", fontSize: "12px", color: "#555", paddingBottom: "20px" }}>
          Data e Hora da Consulta: <span>{nowFormatted}</span>
        </div>
      </div>
    </div>
  );
}
