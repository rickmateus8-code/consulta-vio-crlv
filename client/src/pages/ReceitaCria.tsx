/**
 * ReceitaCria — Emissão de Receituário Médico (Dr. Consulta)
 *
 * Fluxo:
 * 1. Selecionar UF → Cidade → Unidade (preenche endereço automaticamente)
 * 2. Selecionar Especialidade + buscar médico (opcional)
 * 3. Preencher dados do paciente
 * 4. Adicionar medicamentos
 * 5. Emitir receita
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import PrescricaoDocument from "@/components/PrescricaoDocument";
import type { PrescricaoItem } from "@/components/PrescricaoDocument";
import { exportElementToPDF, generatePDFFilename } from "@/lib/pdfExport";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { validarCPF } from "@/lib/utils";
import EmissaoConfirmModal from "@/components/EmissaoConfirmModal";

// ─── API helpers ─────────────────────────────────────────────────────────────
async function apiFetch(path: string) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 25000);
  try {
    const r = await fetch(`/api/medicos${path}`, { signal: c.signal, headers: { "Content-Type": "application/json" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("Timeout");
    throw e;
  } finally { clearTimeout(t); }
}

// ─── Máscaras ────────────────────────────────────────────────────────────────
function maskCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}
function handleDateInput(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`;
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`;
}
function todayBR() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}
function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Unidade {
  id: number; id_unit: number; nome: string; key: string;
  endereco: string; bairro: string; cidade: string; uf: string;
  cep: string; telefone: string; horario: string; rt_nome: string; rt_crm: string;
}
interface MedicoDB {
  id: number; nome_medico: string; crm: string; uf_crm: string;
  especialidade: string; local_trabalho: string; cidade: string;
  uf_local: string; endereco: string; bairro: string;
}
type TipoReceituario = "simples" | "controle_especial" | "antimicrobiano";

// ─── Componente ──────────────────────────────────────────────────────────────
export default function ReceitaCria() {
  const { user, updateBalance } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [, navigate] = useLocation();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [documentPrice, setDocumentPrice] = useState(0);

  // Assinatura
  const [signatureColor, setSignatureColor] = useState("#000000");
  const [signatureImage, setSignatureImage] = useState("");
  const signatureRef = useRef<HTMLInputElement>(null);

  // Tipo
  const [tipoReceituario, setTipoReceituario] = useState<TipoReceituario>("controle_especial");

  // ── Unidades Dr. Consulta ──────────────────────────────────────────────────
  const [ufs, setUfs] = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [especialidades, setEspecialidades] = useState<string[]>([]);
  const [filtroUF, setFiltroUF] = useState("");
  const [filtroCidade, setFiltroCidade] = useState("");
  const [filtroUnidade, setFiltroUnidade] = useState<Unidade | null>(null);
  const [filtroEsp, setFiltroEsp] = useState("");

  // ── Busca de médicos ───────────────────────────────────────────────────────
  const [termoBusca, setTermoBusca] = useState("");
  const [resultados, setResultados] = useState<MedicoDB[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState("");
  const [showResultados, setShowResultados] = useState(false);
  const [medicoSelecionado, setMedicoSelecionado] = useState(false);

  // ── Formulário ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    unidade: "", enderecoEmitente: "",
    cnpjEmitente: "14.245.016/0059-95", telefoneEmitente: "4090-1510", siteEmitente: "www.drconsulta.com",
    medico: "", crm: "", especialidade: "",
    paciente: "", cpf: "", identidade: "", endereco: "", telefone: "", cidade: "",
    dataEmissao: todayBR(), horaEmissao: nowTime(),
  });

  // Prescrição
  const [prescricao, setPrescricao] = useState<PrescricaoItem[]>([
    { numero: 1, uso_interno: true, medicamento: "", quantidade: "", modo_uso: "" },
  ]);

  // ── Carregar UFs disponíveis ───────────────────────────────────────────────
  useEffect(() => {
    apiFetch("/unidades").then(d => setUfs(d.ufs || [])).catch(() => {});
    apiFetch("/especialidades").then(d => setEspecialidades(d.especialidades || [])).catch(() => {});
  }, []);

  // ── Carregar cidades ao selecionar UF ──────────────────────────────────────
  useEffect(() => {
    if (!filtroUF) { setCidades([]); setFiltroCidade(""); setUnidades([]); setFiltroUnidade(null); return; }
    apiFetch(`/unidades?uf=${filtroUF}`).then(d => setCidades(d.cidades || [])).catch(() => setCidades([]));
  }, [filtroUF]);

  // ── Carregar unidades ao selecionar cidade ─────────────────────────────────
  useEffect(() => {
    if (!filtroUF || !filtroCidade) { setUnidades([]); setFiltroUnidade(null); return; }
    apiFetch(`/unidades?uf=${filtroUF}&cidade=${encodeURIComponent(filtroCidade)}`)
      .then(d => setUnidades(d.unidades || []))
      .catch(() => setUnidades([]));
  }, [filtroUF, filtroCidade]);

  // ── Ao selecionar unidade → preencher emitente automaticamente ─────────────
  const selecionarUnidade = (u: Unidade) => {
    setFiltroUnidade(u);
    const endCompleto = [u.endereco, u.bairro, `${u.cidade}/${u.uf}`, u.cep ? `CEP ${u.cep}` : ""].filter(Boolean).join(", ");
    setForm(p => ({
      ...p,
      unidade: `UNIDADE DR. CONSULTA ${u.nome.toUpperCase()}`,
      enderecoEmitente: endCompleto,
    }));
  };

  // ── Buscar médicos ─────────────────────────────────────────────────────────
  const buscarMedicos = useCallback(async () => {
    if (!filtroUF) { setErroBusca("Selecione o estado."); return; }
    setBuscando(true); setErroBusca(""); setShowResultados(true);
    try {
      const params = new URLSearchParams({ uf: filtroUF });
      if (filtroCidade) params.set("cidade", filtroCidade);
      if (filtroEsp) params.set("especialidade", filtroEsp);
      if (termoBusca.trim().length >= 3) params.set("nome", termoBusca.trim());
      const data = await apiFetch(`/buscar?${params}`);
      const medicos = data.medicos || data || [];
      setResultados(medicos);
      if (medicos.length === 0) setErroBusca("Nenhum médico encontrado. Tente outros filtros.");
    } catch (err: any) { setErroBusca(err.message || "Erro ao buscar."); }
    finally { setBuscando(false); }
  }, [filtroUF, filtroCidade, filtroEsp, termoBusca]);

  // ── Selecionar médico ──────────────────────────────────────────────────────
  const selecionarMedico = (m: MedicoDB) => {
    setForm(p => ({
      ...p,
      medico: m.nome_medico.toUpperCase(),
      crm: `CRM/${m.uf_crm || m.uf_local} ${m.crm}`,
      especialidade: (m.especialidade || "CLÍNICO GERAL").toUpperCase(),
    }));
    setShowResultados(false); setTermoBusca(""); setMedicoSelecionado(true);
  };

  // ── Upload assinatura ──────────────────────────────────────────────────────
  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setSignatureImage(await readFileAsBase64(file));
  };

  // ── Prescrição ─────────────────────────────────────────────────────────────
  const addMedicamento = () => setPrescricao(p => [...p, { numero: p.length + 1, uso_interno: true, medicamento: "", quantidade: "", modo_uso: "" }]);
  const removeMedicamento = (idx: number) => setPrescricao(p => p.filter((_, i) => i !== idx).map((item, i) => ({ ...item, numero: i + 1 })));
  const updateMedicamento = (idx: number, field: keyof PrescricaoItem, value: any) => setPrescricao(p => p.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  // ── Download PDF ───────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    try {
      await exportElementToPDF(previewRef.current, { filename: generatePDFFilename(form.paciente || "RECEITA", "receita"), scale: 2, quality: 0.92, multiPage: true });
    } catch (err) { alert(`Erro ao gerar PDF: ${err instanceof Error ? err.message : "Erro"}`); }
  };

  // ── Mostrar modal de confirmação ──────────────────────────────────────────
  const handleShowConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { alert("Faça login para emitir."); return; }
    const prescricaoValida = prescricao.filter(p => p.medicamento.trim());
    if (prescricaoValida.length === 0) { alert("Adicione pelo menos um medicamento."); return; }
    if (!form.medico.trim()) { alert("Preencha o nome do médico."); return; }
    if (form.cpf && !validarCPF(form.cpf)) { alert("CPF inválido! Verifique os dígitos informados."); return; }
    try {
      const res = await fetch("/api/pricing", { credentials: "include" });
      const data = await res.json();
      if (data.success && data.pricing?.receita) setDocumentPrice(data.pricing.receita.price);
    } catch { /* usa preço padrão 0 */ }
    setShowConfirmModal(true);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setShowConfirmModal(false);
    if (!user) { alert("Faça login para emitir."); return; }
    setIsLoading(true);
    try {
      const prescricaoValida = prescricao.filter(p => p.medicamento.trim());
      const payload = {
        tipo_receituario: tipoReceituario,
        paciente: form.paciente.toUpperCase(), cpf: form.cpf || null,
        identidade: form.identidade || null, endereco: form.endereco || null,
        telefone: form.telefone || null, cidade: form.cidade || null,
        medico: form.medico.toUpperCase(), crm: form.crm,
        especialidade: form.especialidade.toUpperCase(),
        instituicao: "DR. CONSULTA", unidade: form.unidade || null,
        endereco_emitente: form.enderecoEmitente || null,
        prescricao: prescricaoValida, data_emissao: form.dataEmissao, hora_emissao: form.horaEmissao,
        logo_url: "/logos/drconsulta.png",
        signature_color: signatureColor, signature_image: signatureImage || null,
      };
      const res = await fetch("/api/receitas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Erro ao emitir");
      setCreatedCode(data.data?.codigo_qr || null);
      if (data.newBalance !== undefined) updateBalance(data.newBalance);
      setShowSuccessModal(true);
    } catch (error) { alert(`Erro: ${error instanceof Error ? error.message : "Erro"}`); }
    finally { setIsLoading(false); }
  };

  // ── Estilos ────────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: isDark ? "#1e293b" : "#fff", borderRadius: 10, boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.08)", padding: "14px 16px", marginBottom: 12, border: isDark ? "1px solid #334155" : "none" };
  const secTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: isDark ? "#60a5fa" : "#005CA9", borderBottom: isDark ? "2px solid #3b82f6" : "2px solid #005CA9", paddingBottom: 5, marginBottom: 10 };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: isDark ? "#cbd5e1" : "#000", marginBottom: 3 };
  const inp: React.CSSProperties = { width: "100%", padding: "7px 10px", border: isDark ? "1px solid #475569" : "1px solid #d1d5db", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", color: isDark ? "#e2e8f0" : "#000", background: isDark ? "#0f172a" : "#fff" };
  const sel: React.CSSProperties = { ...inp, background: isDark ? "#0f172a" : "#fff" };
  const btnBlue: React.CSSProperties = { background: "#005CA9", color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: 0.5 };
  const btnGreen: React.CSSProperties = { background: "#16a34a", color: "#fff", border: "none", borderRadius: 7, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" };
  const btnGray: React.CSSProperties = { background: isDark ? "#334155" : "#e2e8f0", color: isDark ? "#e2e8f0" : "#000", border: isDark ? "1px solid #475569" : "1px solid #cbd5e1", borderRadius: 7, padding: "8px 16px", fontWeight: 600, fontSize: 12, cursor: "pointer" };
  const btnRed: React.CSSProperties = { background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: 700, fontSize: 11, cursor: "pointer" };

  // ── Preview data ───────────────────────────────────────────────────────────
  const previewData = {
    tipo_receituario: tipoReceituario,
    logo_url: "/logos/drconsulta.png",
    nome_unidade: form.unidade || "UNIDADE DR. CONSULTA",
    cnpj_emitente: form.cnpjEmitente || undefined,
    endereco_emitente: form.enderecoEmitente || undefined,
    telefone_emitente: form.telefoneEmitente || undefined,
    site_emitente: form.siteEmitente || undefined,
    paciente_nome: form.paciente || "NOME DO PACIENTE",
    paciente_cpf: form.cpf || undefined,
    paciente_identidade: form.identidade || undefined,
    paciente_endereco: form.endereco || undefined,
    paciente_telefone: form.telefone || undefined,
    paciente_cidade: form.cidade || undefined,
    medico_nome: form.medico || "NOME DO MÉDICO",
    medico_crm: form.crm || "000000",
    medico_uf: filtroUF || "UF",
    medico_especialidade: form.especialidade || undefined,
    medico_assinatura_url: signatureImage || undefined,
    signature_color: signatureColor,
    medicamentos: prescricao.filter(p => p.medicamento.trim()).map(p => ({
      uso_tipo: p.uso_interno ? "interno" as const : "externo" as const,
      nome: p.medicamento, quantidade: p.quantidade, posologia: p.modo_uso,
    })),
    data_emissao: form.dataEmissao || todayBR(),
    codigo_qr: createdCode || undefined,
  };

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#0f172a" : "#f1f5f9", fontFamily: "Arial, Helvetica, sans-serif", color: isDark ? "#e2e8f0" : "#1e293b" }}>
      {/* Modal Sucesso */}
      {showSuccessModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: isDark ? "#1e293b" : "#fff", borderRadius: 14, padding: 28, maxWidth: 400, width: "90%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", color: isDark ? "#e2e8f0" : "#1e293b" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#16a34a", marginBottom: 8 }}>Receita Emitida!</h2>
            {createdCode && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 16px", marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: "#166534", margin: 0, marginBottom: 4 }}>Código de Verificação:</p>
                <p style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", color: "#15803d", margin: 0, letterSpacing: 2 }}>{createdCode}</p>
                <p style={{ fontSize: 10, color: "#166534", margin: "4px 0 0" }}>Valide em: <a href={`https://verificamed.digital/verificar/receita/${createdCode}`} target="_blank" rel="noreferrer" style={{ color: "#15803d" }}>verificamed.digital</a></p>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button style={{ ...btnBlue, flex: 1 }} disabled={isDownloadingPdf}
                onClick={async () => { setIsDownloadingPdf(true); await handleDownloadPdf(); setIsDownloadingPdf(false); setShowSuccessModal(false); navigate("/dashboard"); }}>
                {isDownloadingPdf ? "Baixando PDF..." : "BAIXAR PDF"}
              </button>
              <button style={{ ...btnGray, flex: 1 }} onClick={() => { setShowSuccessModal(false); navigate("/dashboard"); }}>FECHAR</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#005CA9", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={{ ...btnGray, padding: "5px 12px", fontSize: 11 }} onClick={() => navigate("/dashboard")}>← VOLTAR</button>
          <h1 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: 0 }}>EMITIR RECEITA MÉDICA — Dr. Consulta</h1>
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", background: "rgba(0,0,0,0.15)", padding: "4px 12px", borderRadius: 6, fontWeight: 600 }}>
          Dados excluídos após 60 dias
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 p-3 md:p-4 max-w-[1600px] mx-auto overflow-hidden">
        {/* ═══ COLUNA ESQUERDA — FORMULÁRIO ═══ */}
        <div className="w-full lg:w-[540px] xl:w-[580px] lg:flex-shrink-0 lg:overflow-y-auto lg:max-h-[calc(100vh-100px)] custom-scrollbar">
          <form onSubmit={handleShowConfirm} className="space-y-4">

            {/* Tipo de Receituário */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-4 border-b pb-2">Tipo de Receituário</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { value: "simples", label: "Simples", desc: "Branco", color: "gray" },
                  { value: "controle_especial", label: "Controle Especial", desc: "2 vias — Retenção", color: "amber" },
                  { value: "antimicrobiano", label: "Antimicrobiano", desc: "Notificação", color: "blue" },
                ] as const).map(t => (
                  <button 
                    key={t.value} 
                    type="button" 
                    onClick={() => setTipoReceituario(t.value)}
                    className={`
                      p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-1
                      ${tipoReceituario === t.value 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 shadow-md ring-2 ring-indigo-500/10' 
                        : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-500'
                      }
                    `}
                  >
                    <div className="text-xs font-black uppercase">{t.label}</div>
                    <div className="text-[10px] font-medium opacity-60">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── 1. Unidade Dr. Consulta ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-4 border-b pb-2">1. Unidade Dr. Consulta</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase ml-1">Estado (UF) *</label>
                  <select 
                    className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm focus:border-indigo-500 outline-none transition-all"
                    value={filtroUF} 
                    onChange={e => { setFiltroUF(e.target.value); setFiltroCidade(""); setUnidades([]); setFiltroUnidade(null); setMedicoSelecionado(false); setResultados([]); setShowResultados(false); }}
                  >
                    <option value="">Selecione</option>
                    {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase ml-1">Cidade *</label>
                  <select 
                    className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                    value={filtroCidade} 
                    onChange={e => { setFiltroCidade(e.target.value); setFiltroUnidade(null); }} 
                    disabled={!filtroUF || cidades.length === 0}
                  >
                    <option value="">Selecione</option>
                    {cidades.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Lista de unidades */}
              {unidades.length > 0 && (
                <div className="mt-4">
                  <label className="text-[11px] font-bold text-gray-600 uppercase ml-1 mb-2 block">Selecione a Unidade *</label>
                  <div className="max-h-48 overflow-y-auto border-2 border-gray-100 dark:border-gray-800 rounded-xl divide-y divide-gray-50 dark:divide-gray-800 bg-white dark:bg-gray-950">
                    {unidades.map(u => (
                      <div 
                        key={u.id} 
                        onClick={() => selecionarUnidade(u)}
                        className={`
                          p-3 cursor-pointer transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/10
                          ${filtroUnidade?.id === u.id ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-600" : "border-l-4 border-transparent"}
                        `}
                      >
                        <div className="text-xs font-black text-gray-900 dark:text-white uppercase">{u.nome}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{u.endereco}, {u.bairro}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── 2. Médico ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-4 border-b pb-2">2. Médico Prescritor</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase ml-1">Especialidade</label>
                  <select 
                    className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm outline-none"
                    value={filtroEsp} 
                    onChange={e => setFiltroEsp(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase ml-1">Buscar por Nome</label>
                  <input 
                    className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm outline-none"
                    value={termoBusca} 
                    onChange={e => setTermoBusca(e.target.value)}
                    placeholder="Nome do médico..." 
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); buscarMedicos(); } }} 
                  />
                </div>
              </div>

              <button 
                type="button" 
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                onClick={buscarMedicos} 
                disabled={buscando || !filtroUF}
              >
                {buscando ? "BUSCANDO..." : "BUSCAR MÉDICO"}
              </button>

              {/* Médico fields manual... */}
              <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-600 uppercase ml-1">Nome Completo *</label>
                      <input 
                        className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm outline-none uppercase"
                        value={form.medico} 
                        onChange={e => setForm(p => ({ ...p, medico: e.target.value.toUpperCase() }))} 
                        placeholder="NOME DO MÉDICO" 
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-gray-600 uppercase ml-1">CRM *</label>
                      <input 
                        className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm outline-none"
                        value={form.crm} 
                        onChange={e => setForm(p => ({ ...p, crm: e.target.value }))} 
                        placeholder="CRM/UF 000000" 
                      />
                   </div>
                </div>
              </div>
            </div>

            {/* ── 3. Paciente ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-4 border-b pb-2">3. Dados do Paciente</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-600 uppercase ml-1">Nome Completo *</label>
                  <input 
                    className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm outline-none"
                    value={form.paciente} 
                    onChange={e => setForm(p => ({ ...p, paciente: e.target.value }))} 
                    placeholder="Nome Completo do Paciente" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600 uppercase ml-1">CPF</label>
                    <input 
                      className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm outline-none"
                      value={form.cpf} 
                      onChange={e => setForm(p => ({ ...p, cpf: maskCPF(e.target.value) }))} 
                      placeholder="000.000.000-00" 
                      inputMode="numeric" 
                      maxLength={14} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-600 uppercase ml-1">Cidade</label>
                    <input 
                      className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm outline-none uppercase"
                      value={form.cidade} 
                      onChange={e => setForm(p => ({ ...p, cidade: e.target.value.toUpperCase() }))} 
                      placeholder="Ex: SÃO PAULO" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── 4. Prescrição ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <p className="text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest">4. Prescrição Médica</p>
                <button 
                  type="button" 
                  className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-[10px] rounded-lg hover:bg-indigo-700 transition-colors uppercase"
                  onClick={addMedicamento}
                >
                  + Adicionar
                </button>
              </div>
              <div className="space-y-4">
                {prescricao.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border-2 border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">{idx + 1}</div>
                        <button 
                          type="button" 
                          onClick={() => updateMedicamento(idx, "uso_interno", !item.uso_interno)}
                          className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-colors ${item.uso_interno ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}
                        >
                          {item.uso_interno ? "USO INTERNO" : "USO EXTERNO"}
                        </button>
                      </div>
                      {prescricao.length > 1 && (
                        <button 
                          type="button" 
                          className="w-6 h-6 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors"
                          onClick={() => removeMedicamento(idx)}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <input 
                      className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm outline-none uppercase"
                      value={item.medicamento} 
                      onChange={e => updateMedicamento(idx, "medicamento", e.target.value.toUpperCase())} 
                      placeholder="Nome do Medicamento" 
                      required={idx === 0} 
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input 
                        className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm outline-none"
                        value={item.quantidade} 
                        onChange={e => updateMedicamento(idx, "quantidade", e.target.value)} 
                        placeholder="Quantidade (ex: 01 caixa)" 
                      />
                      <input 
                        className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-sm outline-none"
                        value={item.modo_uso} 
                        onChange={e => updateMedicamento(idx, "modo_uso", e.target.value)} 
                        placeholder="Modo de uso" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 5. Data ── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-black text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-4 border-b pb-2">5. Data de Emissão</p>
              <div className="grid grid-cols-2 gap-4">
                <input 
                  className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm outline-none"
                  value={form.dataEmissao} 
                  onChange={e => setForm(p => ({ ...p, dataEmissao: handleDateInput(e.target.value) }))} 
                  placeholder="DD/MM/AAAA" 
                  maxLength={10} 
                  inputMode="numeric" 
                  required 
                />
                <input 
                  className="w-full h-11 px-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm outline-none"
                  type="time" 
                  value={form.horaEmissao} 
                  onChange={e => setForm(p => ({ ...p, horaEmissao: e.target.value }))} 
                />
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button 
                type="button" 
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-black text-sm rounded-2xl active:scale-95 transition-all"
                onClick={() => navigate("/dashboard")}
              >
                CANCELAR
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-100 dark:shadow-none active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoading ? "EMITINDO..." : "CONFIRMAR E EMITIR RECEITA"}
              </button>
            </div>
          </form>
        </div>

        {/* ═══ COLUNA DIREITA — PREVIEW ═══ */}
        <div className="hidden lg:flex flex-1 flex-col min-w-0">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm mb-4 flex items-center justify-between">
            <span className="text-sm font-black text-gray-800 dark:text-gray-200 italic uppercase">Preview em Tempo Real</span>
            <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-black rounded-lg border border-amber-100 dark:border-amber-800">
              QR CODE GERADO PÓS-EMISSÃO
            </div>
          </div>
          <div className="flex-1 bg-gray-200 dark:bg-gray-800 rounded-3xl p-6 overflow-auto shadow-inner flex items-start justify-center">
            <div 
              ref={previewRef} 
              className="bg-white shadow-2xl origin-top transition-transform"
              style={{ width: 794, minHeight: 1123, flexShrink: 0 }}
            >
              <PrescricaoDocument data={previewData} />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação de emissão */}
      {showConfirmModal && (
        <EmissaoConfirmModal
          documentoNome="Receituário Médico"
          documentoEmoji="💊"
          documentPrice={1800}
          userBalance={user?.balance ?? 0}
          isFree={user?.role === 'admin' || (Array.isArray(user?.free_documents) && user.free_documents.includes('receita'))}
          isLoading={isLoading}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
}
