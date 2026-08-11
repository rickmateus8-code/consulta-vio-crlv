import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import DashboardLayout from "../components/DashboardLayout";
import CertificadoFGVDocument, { type CertificadoFGVData } from "../components/CertificadoFGVDocument";
import { toast } from "sonner";
import { usePDFExport, generatePDFFilename } from "@/lib/pdfExport";
import EmissionModal from "@/components/EmissionModal";
import {
  ArrowLeft, Save, Download, MessageCircle, Copy, Zap,
  Upload, AlertCircle, FileText, RefreshCw
} from "lucide-react";

// ─── Presets e Constantes ───────────────────────────────────────────────────
const CURSO_DEFAULT = "Liderança e Gestão de Equipes";

const EMENTA_DEFAULT = "Liderança no contexto de mudanças ambientais e organizacionais. Desenvolvimento de competências para a liderança na era da transformação digital. Teorias e abordagens para a liderança. Feedback para o desenvolvimento de equipes. Gestão das emoções, relacionamento interpessoal e desempenho. Formação e estratégias de desenvolvimento de equipes. Características e tipos de equipe. Fases do desenvolvimento de equipes. Diversidade nas equipes. Motivação e engajamento de equipes. Teorias motivacionais e prática da liderança. Delegação, autonomia e empowerment nas equipes.";

const COMPETENCIAS_DEFAULT = "liderar equipes de trabalho em ambientes dinâmicos;\nidentificar as principais competências demandadas em si e nos integrantes da equipe;\npropor, implementar e gerir planos de ação para a criação de um ambiente colaborativo;\nanalisar, interpretar e agir sobre os fatores que influenciam o desempenho da equipe;\nestruturar, implementar e revisar políticas e práticas de desenvolvimento e engajamento dos membros da equipe.";

const REQUISITOS_DEFAULT = "Tem direito ao certificado digital e badge FGV o/a estudante que tiver participado, contribuindo de forma crítica nas atividades propostas e obtido nota mínima 7,0 (sete) no curso.";

const MODELO_TEXTO = `Nome do Aluno: 
Curso: Liderança e Gestão de Equipes
Carga Horária: 30 horas-aula
Data de Emissão: 18/12/2024
Início: 17/10/2024
Término: 18/12/2024
Matrícula: 590927/2024
CPF: 123.456.789-00
Turma: ONL024ZX-LIDGE1710-3`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function gerarCodigoAutenticidade(): string {
  const chars = "0123456789";
  let res = "";
  for (let i = 0; i < 9; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

function gerarTokenValidacao(): string {
  const chars = "0123456789abcdef";
  let res = "";
  for (let i = 0; i < 32; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res.toUpperCase(); // Save in uppercase to match D1 select case exactly
}

function extrairAno(dataStr: string): string {
  if (!dataStr) return new Date().getFullYear().toString().slice(-2);
  const match = dataStr.match(/\b(19|20)\d{2}\b/);
  if (match) return match[0].slice(-2);
  const parts = dataStr.split(/[-/]/);
  if (parts.length === 3) {
    const yearPart = parts[2].trim();
    if (yearPart.length === 4) return yearPart.slice(-2);
    if (yearPart.length === 2) return yearPart;
  }
  return new Date().getFullYear().toString().slice(-2);
}

function gerarTurmaPadrao(curso: string, dataEmissao?: string): string {
  const cursoLimpo = curso
    ? curso.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
    : "CURSO";
    
  let sigla = "";
  if (cursoLimpo.includes("LIDERANCA")) {
    sigla = "LIDGE";
  } else {
    // Extract consonants
    const consoantes = cursoLimpo.replace(/[^A-Z]/g, "").replace(/[AEIOU]/g, "");
    sigla = consoantes.slice(0, 5);
    if (sigla.length < 5) sigla = (cursoLimpo.replace(/[^A-Z]/g, "") + "XXXXX").slice(0, 5);
  }
  
  const ano = extrairAno(dataEmissao || "");
  const diaMes = "1710"; // standard format matching ONL024ZX-LIDGE1710-3
  return `ONL0${ano}ZX-${sigla}${diaMes}-3`;
}

function gerarMatriculaAleatoria(): string {
  const num = Math.floor(100000 + Math.random() * 900000); // 6 dígitos
  const ano = new Date().getFullYear();
  return `${num}/${ano}`;
}

export default function CertificadoFGVCria() {
  const { user, updateBalance } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = !!params.id;

  const docRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting: isExportingPDF } = usePDFExport();

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importText, setImportText] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [documentPrice, setDocumentPrice] = useState(1800); // R$ 18,00

  // State initialization
  const [data, setData] = useState<CertificadoFGVData>(() => {
    const authCode = gerarCodigoAutenticidade();
    const token = gerarTokenValidacao();
    return {
      id: token,
      codigo_validacao: token,
      nome_aluno: "",
      curso: CURSO_DEFAULT,
      data_emissao: new Date().toLocaleDateString("pt-BR"),
      carga_horaria: "30 horas-aula",
      codigo_autenticidade: authCode,
      matricula: "",
      turma: "",
      ementa: EMENTA_DEFAULT,
      competencias: COMPETENCIAS_DEFAULT,
      requisitos: REQUISITOS_DEFAULT,
      diretora_nome: "Mary Kimiko Guimarães Murashima",
      diretora_cargo: "Diretora Executiva - DGA",
      diretora_instituicao: "Instituto de Desenvolvimento Educacional - IDE",
      signature_image: "",
    };
  });

  // Pre-generate Turma if empty on mount or if course changes
  useEffect(() => {
    if (!isEditing && !data.turma) {
      setData((d) => ({ ...d, turma: gerarTurmaPadrao(d.curso, d.data_emissao) }));
    }
  }, [isEditing, data.curso, data.data_emissao]);

  // Carregar dados se for edição
  useEffect(() => {
    if (!isEditing || !params.id) return;
    setLoading(true);
    fetch(`/api/documents/${params.id}`, { credentials: "include" })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Erro ao buscar certificado");
      })
      .then((resData) => {
        if (resData.success && resData.data) {
          setData(resData.data);
          setSaved(true);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("Erro ao carregar dados do certificado");
      })
      .finally(() => setLoading(false));
  }, [isEditing, params.id]);

  const update = useCallback((field: keyof CertificadoFGVData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setData((d) => ({ ...d, [field]: e.target.value }));
  }, []);

  const handleCopiarModelo = () => {
    navigator.clipboard.writeText(MODELO_TEXTO);
    toast.success("Modelo copiado!");
  };

  const handleProcessarImportacao = () => {
    if (!importText.trim()) {
      toast.error("Cole os dados primeiro!");
      return;
    }
    const get = (label: string): string => {
      const regex = new RegExp(`${label}:\\s*(.*)`, "i");
      const m = importText.match(regex);
      return m ? m[1].trim() : "";
    };

    setData((d) => ({
      ...d,
      nome_aluno: get("Nome do Aluno") || d.nome_aluno,
      curso: get("Curso") || d.curso,
      carga_horaria: get("Carga Horária") || d.carga_horaria,
      data_emissao: get("Data de Emissão") || d.data_emissao,
      data_inicio: get("Início") || get("Data de Início") || d.data_inicio,
      data_termino: get("Término") || get("Data de Término") || d.data_termino,
      matricula: get("Matrícula") || d.matricula,
      cpf: get("CPF") || d.cpf,
      turma: get("Turma") || d.turma,
    }));
    toast.success("Dados processados!");
  };

  const handleRequestEmit = () => {
    if (!data.nome_aluno || !data.curso) {
      toast.error("Preencha Nome e Curso obrigatoriamente!");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const method = isEditing ? "PUT" : "POST";
      const endpoint = isEditing ? `/api/documents/${params.id}` : "/api/documents/fgv";
      
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, type: "fgv" }),
      });
      
      const result = await res.json();
      if (result.success) {
        setSaved(true);
        setShowConfirmModal(false);
        if (!isEditing) {
          setShowSuccessModal(true);
          if (result.newBalance !== undefined) updateBalance(result.newBalance);
        } else {
          toast.success("Alterações salvas com sucesso!");
          setLocation("/dashboard");
        }
      } else {
        toast.error(result.error || "Erro ao salvar Certificado");
        setShowConfirmModal(false);
      }
    } catch {
      toast.error("Erro de conexão");
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!docRef.current) return;
    setIsDownloading(true);
    try {
      await exportPDF(docRef.current, {
        filename: generatePDFFilename(data.nome_aluno, "fgv"),
        docType: "fgv",
        orientation: "l",
        scale: 2,
      });
      toast.success("Certificado exportado com sucesso!");
    } catch (err) {
      console.error("PDF Error:", err);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setData((d) => ({ ...d, signature_image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <DashboardLayout>
      <style>{`
        .fgv-form-container {
          font-family: 'Inter', sans-serif;
          background: ${isDark ? "#0f172a" : "#ffffff"};
          color: ${isDark ? "#f1f5f9" : "#1e293b"};
          padding: 24px;
          padding-bottom: 120px;
          width: 100vw;
          height: 100vh;
          box-sizing: border-box;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 9999;
          overflow-y: auto;
        }
        .fgv-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 2px solid #005CA9;
          padding-bottom: 12px;
        }
        .fgv-header h1 { font-size: 20px; font-weight: 800; margin: 0; color: #005CA9; }
        .fgv-divider {
          padding: 10px 0; font-size: 11px; text-transform: uppercase; color: ${isDark ? "#94a3b8" : "#64748b"}; font-weight: 700; border-bottom: 1px solid ${isDark ? "#1e293b" : "#e2e8f0"}; margin: 25px 0 15px 0; display: flex; align-items: center; gap: 8px;
        }
        .fgv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 16px; }
        .fgv-group { display: flex; flex-direction: column; gap: 5px; }
        .fgv-group label { font-size: 12px; font-weight: 600; color: ${isDark ? "#94a3b8" : "#64748b"}; }
        .fgv-group input, .fgv-group select, .fgv-group textarea {
          padding: 10px 12px; border-radius: 8px; border: 1px solid ${isDark ? "#334155" : "#cbd5e1"}; background: ${isDark ? "#1e293b" : "#ffffff"}; color: ${isDark ? "#f1f5f9" : "#0f172a"}; outline: none; font-size: 13px;
        }
        .fgv-group input:focus, .fgv-group textarea:focus { border-color: #005CA9; }
        .fgv-btn-action { padding: 10px; border: none; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; color: white; }
        .fgv-floating-save {
          position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); width: 90%; max-width: 500px; background: #059669; color: white; padding: 15px; border-radius: 12px; font-size: 16px; font-weight: bold; box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.4); border: none; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 10px; z-index: 10000;
        }
        .fgv-import-box { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 16px; border: 1px solid ${isDark ? "#334155" : "#e2e8f0"}; border-radius: 12px; background: ${isDark ? "#1e293b" : "#f8fafc"}; }
        .fgv-import-box textarea { width: 100%; height: 120px; padding: 10px; border-radius: 8px; border: 1px solid ${isDark ? "#334155" : "#e2e8f0"}; background: ${isDark ? "#0f172a" : "#fff"}; color: ${isDark ? "#fff" : "#000"}; resize: none; font-size: 12px; }
        .fgv-split-container { display: flex; gap: 30px; }
        .fgv-left-form { flex: 1.2; }
        .fgv-right-preview { 
          flex: 0.8; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: flex-start;
          min-width: 550px;
        }
        .fgv-preview-box {
          width: 540px;
          height: 382px;
          position: relative;
          border: 1px solid #cbd5e1;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border-radius: 8px;
          overflow: hidden;
          background: #ffffff;
        }
        .fgv-preview-wrapper { 
          transform: scale(0.48085);
          transform-origin: top left;
          position: absolute;
          top: 0;
          left: 0;
          width: 1123px;
          height: 794px;
        }
      `}</style>

      <div className="fgv-form-container">
        <div className="fgv-header">
          <h1>DOCMASTER<span style={{ color: isDark ? "#fff" : "#000" }}>.STORE</span> - Emissor de <span style={{ color: "#005CA9" }}>CERTIFICADO FGV</span></h1>
          <button
            className="fgv-btn-action"
            style={{ background: "transparent", color: isDark ? "#94a3b8" : "#64748b", border: "1px solid #e2e8f0" }}
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft size={14} /> Voltar
          </button>
        </div>

        <div className="fgv-split-container">
          {/* Formulário Lado Esquerdo */}
          <div className="fgv-left-form">
            
            {/* Importador Rápido */}
            <div className="fgv-divider">✨ IMPORTAÇÃO RÁPIDA</div>
            <div className="fgv-import-box">
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 5 }}>1. Modelo de Entrada</label>
                <div style={{ padding: 10, background: isDark ? "#0f172a" : "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, fontFamily: "monospace", whiteSpace: "pre-wrap", height: 100, overflow: "auto", marginBottom: 10 }}>{MODELO_TEXTO}</div>
                <button className="fgv-btn-action" style={{ background: "#3b82f6", width: "100%" }} onClick={handleCopiarModelo}>
                  <Copy size={14} /> Copiar Modelo
                </button>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 5 }}>2. Cole o texto preenchido</label>
                <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Cole aqui..." />
                <button className="fgv-btn-action" style={{ background: "#10b981", width: "100%" }} onClick={handleProcessarImportacao}>
                  <Zap size={14} /> Processar Dados
                </button>
              </div>
            </div>

            {/* Dados do Aluno */}
            <div className="fgv-divider">👤 1. DADOS DO DIPLOMADO / ALUNO</div>
            <div className="fgv-grid">
              <div className="fgv-group" style={{ gridColumn: "span 2" }}>
                <label>Nome Completo do Aluno</label>
                <input type="text" value={data.nome_aluno} onChange={update("nome_aluno")} placeholder="Nome do aluno" />
              </div>
              <div className="fgv-group">
                <label>CPF do Aluno</label>
                <input
                  type="text"
                  disabled={isEditing}
                  readOnly={isEditing}
                  value={data.cpf || ""}
                  onChange={update("cpf")}
                  placeholder="Ex: 000.000.000-00"
                  className={isEditing ? "opacity-75 cursor-not-allowed bg-slate-100 dark:bg-slate-800" : ""}
                />
                {isEditing && (
                  <p className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-1">
                    🔒 CPF FIXO APÓS EMISSÃO
                  </p>
                )}
              </div>
              <div className="fgv-group">
                <label>Matrícula</label>
                <div className="flex gap-2">
                  <input type="text" style={{ flex: 1 }} value={data.matricula} onChange={update("matricula")} placeholder="Ex: 590927/2024" />
                  <button
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, matricula: gerarMatriculaAleatoria() }))}
                    className="p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                    title="Gerar Matrícula"
                  >
                    <RefreshCw size={14} className="text-slate-500" />
                  </button>
                </div>
              </div>
            </div>

            <div className="fgv-grid">
              <div className="fgv-group">
                <label>Turma</label>
                <div className="flex gap-2">
                  <input type="text" style={{ flex: 1 }} value={data.turma} onChange={update("turma")} placeholder="Ex: ONL024ZX-LIDGE1710-3" />
                  <button
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, turma: gerarTurmaPadrao(prev.curso, prev.data_emissao) }))}
                    className="p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                    title="Gerar Turma"
                  >
                    <RefreshCw size={14} className="text-slate-500" />
                  </button>
                </div>
              </div>
              <div className="fgv-group">
                <label>Código de Autenticidade</label>
                <div className="flex gap-2">
                  <input type="text" style={{ flex: 1 }} value={data.codigo_autenticidade} onChange={update("codigo_autenticidade")} />
                  <button
                    type="button"
                    onClick={() => setData(prev => ({ ...prev, codigo_autenticidade: gerarCodigoAutenticidade() }))}
                    className="p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                    title="Gerar Código"
                  >
                    <RefreshCw size={14} className="text-slate-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Detalhes do Curso */}
            <div className="fgv-divider">🎓 2. DETALHES DO CURSO</div>
            <div className="fgv-grid">
              <div className="fgv-group" style={{ gridColumn: "span 2" }}>
                <label>Nome do Curso</label>
                <input type="text" value={data.curso} onChange={update("curso")} />
              </div>
              <div className="fgv-group">
                <label>Carga Horária</label>
                <input type="text" value={data.carga_horaria} onChange={update("carga_horaria")} />
              </div>
            </div>

            <div className="fgv-grid">
              <div className="fgv-group">
                <label>Data de Início</label>
                <input type="text" value={data.data_inicio || ""} onChange={update("data_inicio")} placeholder="Ex: 17/10/2024" />
              </div>
              <div className="fgv-group">
                <label>Data de Término</label>
                <input type="text" value={data.data_termino || ""} onChange={update("data_termino")} placeholder="Ex: 18/12/2024" />
              </div>
              <div className="fgv-group">
                <label>Data de Emissão</label>
                <input type="text" value={data.data_emissao} onChange={update("data_emissao")} />
              </div>
            </div>

            <div className="fgv-grid">
              <div className="fgv-group" style={{ gridColumn: "span 3" }}>
                <label>Ementa / Programa do Curso</label>
                <textarea rows={3} value={data.ementa} onChange={update("ementa")} />
              </div>
            </div>

            <div className="fgv-grid">
              <div className="fgv-group" style={{ gridColumn: "span 3" }}>
                <label>Competências Conquistadas</label>
                <textarea rows={4} value={data.competencias} onChange={update("competencias")} />
              </div>
            </div>

            <div className="fgv-grid">
              <div className="fgv-group" style={{ gridColumn: "span 3" }}>
                <label>Requisitos para Emissão</label>
                <textarea rows={2} value={data.requisitos} onChange={update("requisitos")} />
              </div>
            </div>

            {/* Assinatura */}
            <div className="fgv-divider">🖋️ 3. ASSINATURA E EMISSOR</div>
            <div className="fgv-grid">
              <div className="fgv-group">
                <label>Nome da Diretora</label>
                <input type="text" value={data.diretora_nome} onChange={update("diretora_nome")} />
              </div>
              <div className="fgv-group">
                <label>Cargo</label>
                <input type="text" value={data.diretora_cargo} onChange={update("diretora_cargo")} />
              </div>
              <div className="fgv-group">
                <label>Upload de Assinatura (Fundo Transparente)</label>
                <label className="fgv-btn-action" style={{ background: "#475569", cursor: "pointer" }}>
                  <Upload size={14} /> Upload PNG
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleUploadSignature} />
                </label>
              </div>
            </div>

          </div>

          {/* Preview Lado Direito */}
          <div className="fgv-right-preview">
            <div className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <FileText size={16} /> PRÉVIA EM TEMPO REAL
            </div>
            <div className="fgv-preview-box">
              <div className="fgv-preview-wrapper">
                <CertificadoFGVDocument data={data} isPreview={!saved} />
              </div>
            </div>
          </div>
        </div>

        {/* Preview oculto em tamanho real 1:1 para captura pelo exportador PDF */}
        <div style={{ position: "absolute", left: "-9999px", top: 0, opacity: 0 }}>
          <CertificadoFGVDocument ref={docRef} data={data} isPreview={!saved} />
        </div>

        {/* Botão de Salvar/Emitir */}
        <button className="fgv-floating-save" onClick={handleRequestEmit} disabled={loading}>
          {loading ? "Processando..." : <><Save size={18} /> {isEditing ? "SALVAR ALTERAÇÕES" : "EMITIR CERTIFICADO"}</>}
        </button>
      </div>

      <EmissionModal
        docLabel="Certificado FGV"
        docEmoji="🎓"
        documentPrice={documentPrice}
        userBalance={user?.balance ?? 0}
        showConfirm={showConfirmModal}
        showSuccess={showSuccessModal}
        isEmitting={loading}
        isDownloading={isDownloading}
        onConfirm={handleSave}
        onCancel={() => setShowConfirmModal(false)}
        onDownload={handleExportPdf}
        onClose={() => {
          setShowSuccessModal(false);
          setLocation("/dashboard");
        }}
        historyPath="/dashboard"
        isFree={user?.role === "admin" || (Array.isArray(user?.free_documents) && user.free_documents.includes("fgv"))}
      />
    </DashboardLayout>
  );
}
