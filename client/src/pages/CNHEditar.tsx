/**
 * CNHEditar — Edição de CNH Digital salva
 *
 * Carrega os dados do documento pelo ID e permite editar todos os campos,
 * mantendo o layout de emissão (CNHDocument). Salva via PUT /api/documents/:id
 * CPF é bloqueado após emissão (regra universal).
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import CNHDocument, { type CNHDocumentHandle, type CNHDocumentProps, type CNHDocumentLegacyProps } from "../components/CNHDocument";

import { previewRuntimeWithId, emittedRuntime } from "@/lib/cnh";

import { toast } from "sonner";
import { getQRCodeCNH } from "@/config.qrcode";
import { validarCPF, formatarCPF as formatarCPFUtil, formatarRG, displayDateToHtml } from "@/lib/utils";
import {
  ArrowLeft, Save, Download, MessageCircle, Lock, Car
} from "lucide-react";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const ESTILOS_ASS = [
  { label: "Estilo 1 (Cursiva Elegante)", font: "'Dancing Script', cursive" },
  { label: "Estilo 2 (Bradley Hand)", font: "'Caveat', cursive" },
];

function formatarCPFInput(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

export default function CNHEditar() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const docId = params.id;
  const docRef = useRef<CNHDocumentHandle>(null);

  const [loading, setLoading] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [assTexto, setAssTexto] = useState("");
  const [assEstilo, setAssEstilo] = useState(0);

  const [data, setData] = useState<CNHDocumentLegacyProps>({
    nome: "", cpf: "", rg: "", orgaoEmissor: "", ufRG: "",
    sexo: "", nacionalidade: "BRASILEIRA", dataNascimento: "",
    localNascimento: "", ufNascimento: "", nomePai: "", nomeMae: "",
    categoria: "", tipo: "Definitiva", registro: "", espelho: "",
    validade: "", validadeCNH2: "", dataEmissao: "", primeiraHabilitacao: "",
    localEmissao: "", ufEmissao: "", assDigital1: "", assDigital2: "",
    senhaApp: "", observacoes: "", fotoUrl: "", assinaturaUrl: "",
    codigoQR: "PREVIEW", blurred: false,
  });


  // Carregar documento pelo ID
  useEffect(() => {
    if (!docId) return;
    setLoadingDoc(true);
    fetch(`/api/documents/${docId}`, { credentials: "include" })
      .then(r => r.json())
      .then(result => {
        if (result.success && result.data) {
          const doc = result.data;
          let docData: any = {};
          try { docData = typeof doc.data === "string" ? JSON.parse(doc.data) : doc.data; } catch { docData = {}; }
          setData(prev => ({
            ...prev,
            ...docData,
            codigoQR: doc.codigo_qr || doc.id || "PREVIEW",
            blurred: false,
          }));
        } else {
          toast.error("Documento não encontrado");
          setLocation("/cnhsalvas");
        }
      })
      .catch(() => {
        toast.error("Erro ao carregar documento");
        setLocation("/cnhsalvas");
      })
      .finally(() => setLoadingDoc(false));
  }, [docId]);

  const set = (k: keyof CNHDocumentLegacyProps) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setData(d => ({ ...d, [k]: v }));
  };


  const gerarAssinaturaTexto = useCallback(() => {
    if (!assTexto.trim()) return;
    const cvs = document.createElement("canvas");
    cvs.width = 600; cvs.height = 150;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 600, 150);
    const fonteSelecionada = ESTILOS_ASS[assEstilo]?.font || "'Dancing Script', cursive";
    let fontSize = 48;
    ctx.font = `${fontSize}px ${fonteSelecionada}`;
    while (ctx.measureText(assTexto).width > 560 && fontSize > 16) {
      fontSize -= 2;
      ctx.font = `${fontSize}px ${fonteSelecionada}`;
    }
    ctx.fillStyle = "black";
    ctx.textBaseline = "middle";
    ctx.fillText(assTexto, 20, 75);
    setData(d => ({ ...d, assinaturaUrl: cvs.toDataURL("image/png") }));
    toast.success("Assinatura gerada!");
  }, [assTexto, assEstilo]);

  // Salvar alterações
  const handleSave = async () => {
    if (!data.nome || !data.cpf) {
      toast.error("Preencha Nome e CPF obrigatoriamente!");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("CNH atualizada com sucesso!");
        // Sincronizar com site de validação
        try {
          await fetch("https://cnh-digital.manus.space/api/cnh-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cpf: data.cpf, senha: data.senhaApp, nome: data.nome,
              rg: data.rg, orgaoEmissor: data.orgaoEmissor, ufRg: data.ufRG,
              dataNascimento: data.dataNascimento, registro: data.registro,
              espelho: data.espelho, categoria: data.categoria,
              localEmissao: data.localEmissao, ufEmissao: data.ufEmissao,
              emissao: data.dataEmissao, validade: data.validade,
              primeiraHabilitacao: data.primeiraHabilitacao,
              nacionalidade: data.nacionalidade, filiacaoMae: data.nomeMae,
              filiacaoPai: data.nomePai, sexo: data.sexo,
              acc: data.tipo === "Permissão" ? "SIM" : "NÃO",
              foto: data.fotoUrl, validationId: data.codigoQR,
            }),
          }).catch(() => {});
        } catch { /* não crítico */ }
      } else {
        toast.error(result.error || "Erro ao salvar alterações");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setSaving(false);
    }
  };

  const handleExportJPEG = async () => {
    if (!docRef.current) return;
    setIsDownloading(true);
    try {
      const blob = await docRef.current.exportAsBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `CNH_${data.nome.replace(/\s+/g, "_")}.jpeg`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Imagem exportada!");
      }
    } catch {
      toast.error("Erro ao exportar imagem");
    } finally {
      setIsDownloading(false);
    }
  };

  // Estilos inline
  const inp: React.CSSProperties = {
    width: "100%", padding: "6px 10px", border: "1px solid #d1d5db",
    borderRadius: 6, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit",
  };
  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 3, display: "block", textTransform: "uppercase" };
  const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
    padding: "14px 16px", marginBottom: 12,
  };
  const secTitle: React.CSSProperties = {
    fontSize: 13, fontWeight: 800, color: "#1e3a5f", textTransform: "uppercase",
    borderBottom: "2px solid #e5e7eb", paddingBottom: 8, marginBottom: 12,
  };
  const row2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 };
  const row3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 };
  const btnBlue: React.CSSProperties = {
    background: "#1e3a5f", color: "#fff", border: "none", borderRadius: 8,
    padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
  };
  const btnGray: React.CSSProperties = {
    background: "#6b7280", color: "#fff", border: "none", borderRadius: 8,
    padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
  };
  const btnGreen: React.CSSProperties = {
    background: "#16a34a", color: "#fff", border: "none", borderRadius: 8,
    padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
  };

  if (loadingDoc) {
    return (
      <DashboardLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <div style={{ textAlign: "center", color: "#6b7280" }}>
            <Car style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
            <p>Carregando documento...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
        {/* Header */}
        <div style={{ background: "#1e3a5f", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={{ ...btnGray, padding: "5px 12px", fontSize: 11 }} onClick={() => setLocation("/cnhsalvas")}>
              ← VOLTAR
            </button>
            <h1 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>
              DocMaster — EDITAR CNH DIGITAL
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btnGreen, padding: "6px 14px", fontSize: 12 }} onClick={handleSave} disabled={saving}>
              <Save style={{ width: 14, height: 14, display: "inline", marginRight: 4 }} />
              {saving ? "Salvando..." : "SALVAR ALTERAÇÕES"}
            </button>
            <button style={{ ...btnBlue, padding: "6px 14px", fontSize: 12 }} onClick={handleExportJPEG} disabled={isDownloading}>
              <Download style={{ width: 14, height: 14, display: "inline", marginRight: 4 }} />
              {isDownloading ? "Exportando..." : "BAIXAR JPEG"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, padding: 14, maxWidth: 2000, margin: "0 auto" }}>
          {/* Coluna Esquerda — Formulário */}
          <div style={{ width: 580, flexShrink: 0, overflowY: "auto", maxHeight: "calc(100vh - 70px)" }}>

            {/* Aviso CPF bloqueado */}
            <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Lock style={{ width: 14, height: 14, color: "#d97706" }} />
              <span style={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                CPF bloqueado após emissão — todos os outros campos podem ser editados.
              </span>
            </div>

            {/* Dados Pessoais */}
            <div style={card}>
              <p style={secTitle}>👤 Dados Pessoais</p>
              <div style={{ marginBottom: 10 }}>
                <span style={label}>Nome Completo *</span>
                <input style={inp} value={data.nome} onChange={set("nome")} placeholder="Nome completo" />
              </div>
              <div style={row2}>
                <div>
                  <span style={label}>CPF * <Lock style={{ width: 10, height: 10, display: "inline", color: "#d97706" }} /></span>
                  <input style={{ ...inp, background: "#f3f4f6", color: "#6b7280" }} value={data.cpf} readOnly />
                </div>
                <div>
                  <span style={label}>Sexo</span>
                  <select style={inp} value={data.sexo} onChange={set("sexo")}>
                    <option value="">Selecione</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
              </div>
              <div style={row3}>
                <div>
                  <span style={label}>RG</span>
                  <input style={inp} value={data.rg} onChange={set("rg")} />
                </div>
                <div>
                  <span style={label}>Órgão Emissor</span>
                  <input style={inp} value={data.orgaoEmissor} onChange={set("orgaoEmissor")} />
                </div>
                <div>
                  <span style={label}>UF RG</span>
                  <select style={inp} value={data.ufRG} onChange={set("ufRG")}>
                    <option value="">UF</option>
                    {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={row2}>
                <div>
                  <span style={label}>Nacionalidade</span>
                  <input style={inp} value={data.nacionalidade} onChange={set("nacionalidade")} />
                </div>
                <div>
                  <span style={label}>Data Nascimento</span>
                  <input style={inp} value={data.dataNascimento} onChange={set("dataNascimento")} placeholder="DD/MM/AAAA" />
                </div>
              </div>
              <div style={row3}>
                <div>
                  <span style={label}>Local Nascimento</span>
                  <input style={inp} value={data.localNascimento} onChange={set("localNascimento")} />
                </div>
                <div>
                  <span style={label}>UF Nasc.</span>
                  <select style={inp} value={data.ufNascimento} onChange={set("ufNascimento")}>
                    <option value="">UF</option>
                    {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <span style={label}>Senha App</span>
                  <input style={inp} value={data.senhaApp} onChange={set("senhaApp")} />
                </div>
              </div>
              <div style={row2}>
                <div>
                  <span style={label}>Nome do Pai</span>
                  <input style={inp} value={data.nomePai} onChange={set("nomePai")} />
                </div>
                <div>
                  <span style={label}>Nome da Mãe</span>
                  <input style={inp} value={data.nomeMae} onChange={set("nomeMae")} />
                </div>
              </div>
            </div>

            {/* Dados da CNH */}
            <div style={card}>
              <p style={secTitle}>🚗 Dados da CNH</p>
              <div style={row3}>
                <div>
                  <span style={label}>Categoria</span>
                  <select style={inp} value={data.categoria} onChange={set("categoria")}>
                    <option value="">Selecione</option>
                    {["A","B","C","D","E","AB","AC","AD","AE"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <span style={label}>Tipo</span>
                  <select style={inp} value={data.tipo} onChange={set("tipo")}>
                    <option value="Definitiva">Definitiva</option>
                    <option value="Permissão">Permissão</option>
                  </select>
                </div>
                <div>
                  <span style={label}>Registro</span>
                  <input style={inp} value={data.registro} onChange={set("registro")} />
                </div>
              </div>
              <div style={row3}>
                <div>
                  <span style={label}>Espelho</span>
                  <input style={inp} value={data.espelho} onChange={set("espelho")} />
                </div>
                <div>
                  <span style={label}>Validade</span>
                  <input style={inp} value={data.validade} onChange={set("validade")} placeholder="DD/MM/AAAA" />
                </div>
                <div>
                  <span style={label}>Validade CNH 2</span>
                  <input style={inp} value={data.validadeCNH2 || ""} onChange={set("validadeCNH2")} placeholder="DD/MM/AAAA" />
                </div>
              </div>
              <div style={row3}>
                <div>
                  <span style={label}>Data Emissão</span>
                  <input style={inp} value={data.dataEmissao} onChange={set("dataEmissao")} placeholder="DD/MM/AAAA" />
                </div>
                <div>
                  <span style={label}>1ª Habilitação</span>
                  <input style={inp} value={data.primeiraHabilitacao} onChange={set("primeiraHabilitacao")} placeholder="DD/MM/AAAA" />
                </div>
                <div>
                  <span style={label}>Local Emissão</span>
                  <input style={inp} value={data.localEmissao} onChange={set("localEmissao")} />
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={label}>UF Emissão</span>
                <select style={{ ...inp, width: 120 }} value={data.ufEmissao} onChange={set("ufEmissao")}>
                  <option value="">UF</option>
                  {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={label}>Observações</span>
                <textarea style={{ ...inp, resize: "vertical", minHeight: 60 }} value={data.observacoes} onChange={set("observacoes")} />
              </div>
            </div>

            {/* Foto */}
            <div style={card}>
              <p style={secTitle}>📷 Foto Biométrica</p>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {data.fotoUrl && (
                  <img src={data.fotoUrl} alt="Foto" style={{ width: 80, height: 100, objectFit: "contain", borderRadius: 6, border: "1px solid #e5e7eb" }} />
                )}
                <div style={{ flex: 1 }}>
                  <label style={{ ...btnBlue, display: "inline-block", cursor: "pointer", padding: "8px 14px", fontSize: 12 }}>
                    📤 ALTERAR FOTO
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => setData(d => ({ ...d, fotoUrl: ev.target?.result as string }));
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>JPG, PNG ou WEBP. Proporção 3:4 recomendada.</p>
                </div>
              </div>
            </div>

            {/* Assinatura */}
            <div style={card}>
              <p style={secTitle}>✍️ Assinatura Digital</p>
              <div style={{ marginBottom: 10 }}>
                <span style={label}>Gerar Assinatura por Texto</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...inp, flex: 1 }} value={assTexto} onChange={e => setAssTexto(e.target.value)} placeholder="Digite o nome para gerar assinatura" />
                  <select style={{ ...inp, width: 160 }} value={assEstilo} onChange={e => setAssEstilo(Number(e.target.value))}>
                    {ESTILOS_ASS.map((e, i) => <option key={i} value={i}>{e.label}</option>)}
                  </select>
                  <button style={btnBlue} onClick={gerarAssinaturaTexto}>Gerar</button>
                </div>
              </div>
              {data.assinaturaUrl && (
                <div style={{ marginBottom: 10 }}>
                  <span style={label}>Assinatura Atual</span>
                  <img src={data.assinaturaUrl} alt="Assinatura" style={{ maxWidth: 200, height: 50, objectFit: "contain", border: "1px solid #e5e7eb", borderRadius: 4 }} />
                </div>
              )}
              <label style={{ ...btnGray, display: "inline-block", cursor: "pointer", padding: "6px 12px", fontSize: 11 }}>
                📤 UPLOAD ASSINATURA
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setData(d => ({ ...d, assinaturaUrl: ev.target?.result as string }));
                  reader.readAsDataURL(file);
                }} />
              </label>
            </div>

            {/* Botão Salvar */}
            <div style={{ padding: "12px 0 24px" }}>
              <button
                style={{ ...btnGreen, width: "100%", padding: "12px 0", fontSize: 15 }}
                onClick={handleSave}
                disabled={saving}
              >
                <Save style={{ width: 16, height: 16, display: "inline", marginRight: 6 }} />
                {saving ? "Salvando alterações..." : "💾 SALVAR ALTERAÇÕES"}
              </button>
            </div>
          </div>

          {/* Coluna Direita — Preview */}
          <div style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 70px)" }}>
            <div style={{ ...card, marginBottom: 8 }}>
              <p style={{ ...secTitle, marginBottom: 8 }}>👁️ Visualizador — CNH Digital</p>
              <p style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>
                O visualizador reflete todas as edições em tempo real.
              </p>
            </div>
            <CNHDocument
              ref={docRef}
              {...data}
              blurred={false}
              printRuntime={
                loadingDoc
                  ? previewRuntimeWithId(docId)
                  : emittedRuntime(
                      docId,
                      data.codigoQR && !data.codigoQR.includes(".") && data.codigoQR !== "PREVIEW"
                        ? data.codigoQR
                        : docId,
                      data.codigoQR,
                    )
              }
            />

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
