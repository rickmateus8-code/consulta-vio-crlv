import { useState, useCallback, useMemo, useEffect } from "react";
import {
  PROFILES,
  createSubstitutionFields,
  getGradesForProfile,
  type GradeRow,
  type HistoricoDisponivelKey,
  type ProfileKey,
  type SubstitutionField,
  HISTORICOS_DISPONIVEIS
} from "@/lib/documentData_uninter";
import { generateAcademicGrades } from "@/lib/curriculumGenerator";
import { toast } from "sonner";

const HISTORICO_TO_PROFILE: Record<HistoricoDisponivelKey, ProfileKey> = {
  administracao: "administracao",
  ciencias_contabeis: "ciencias_contabeis",
  direito: "direito",
  enfermagem: "enfermagem",
  engenharia_controle_automacao: "engenharia_controle_automacao",
  engenharia_eletrica: "engenharia_eletrica",
  gestao_recursos_humanos: "gestao_recursos_humanos",
  historia: "historia",
  letras: "letras",
  marketing: "marketing",
  pedagogia: "pedagogia",
  psicologia: "psicologia",
  servico_social: "servico_social",
  teologia: "teologia",
  educacao_fisica: "educacao_fisica",
};

const DEFAULT_HISTORICO: HistoricoDisponivelKey | null = null;

function createEmptyFields() {
  const blueprint = createSubstitutionFields();
  return blueprint.map((field) => ({
    ...field,
    originalValue: field.originalValue,
    currentValue: field.id === "situacao_matricula" ? "FORMADO" : "",
  }));
}

function buildMatricula() {
  const value = Math.floor(1000000 + Math.random() * 9000000);
  return String(value);
}

function normalizeUpper(value: string) {
  return (value || "").trim().toUpperCase();
}

function normalizeDateByField(value: string, fieldId: string) {
  const clean = value.trim();
  if (!clean) return "";
  
  if (fieldId === "ingresso_ano") {
    return clean.replace(/\D/g, "").slice(0, 4);
  }

  if (["ingresso_mes_ano", "conclusao_curso"].includes(fieldId)) {
    const digits = clean.replace(/\D/g, "").slice(0, 6);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  const digits = clean.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function detectHistoricoByCurso(curso: string): HistoricoDisponivelKey | null {
  const text = normalizeUpper(curso);
  if (!text) return null;
  if (text.includes("ADMINISTRA")) return "administracao";
  if (text.includes("CONT") && text.includes("CIEN")) return "ciencias_contabeis";
  if (text.includes("DIREITO")) return "direito";
  if (text.includes("ENFERM")) return "enfermagem";
  if (text.includes("ENGENHARIA DE CONTROLE") || text.includes("AUTOMA")) return "engenharia_controle_automacao";
  if (text.includes("ENGENHARIA ELETRICA") || text.includes("ELÉTRICA")) return "engenharia_eletrica";
  if (text.includes("RH") || text.includes("HUMANO")) return "gestao_recursos_humanos";
  if (text.includes("HIST")) return "historia";
  if (text.includes("LETRAS")) return "letras";
  if (text.includes("MARKET")) return "marketing";
  if (text.includes("PEDAGOGIA")) return "pedagogia";
  if (text.includes("PSICOL")) return "psicologia";
  if (text.includes("SOCIAL")) return "servico_social";
  if (text.includes("TEOL")) return "teologia";
  if (text.includes("EDUCACAO FISICA") || text.includes("EDUCAÇÃO FÍSICA") || text.includes("ED. FISICA") || text.includes("ED. FÍSICA") || text.includes("EDF")) return "educacao_fisica";
  return null;
}

function parseGradeLine(line: string): GradeRow | null {
  const normalized = line.trim();
  if (!normalized) return null;
  if (/^ano\/m[eê]s/i.test(normalized)) return null;

  let parts = normalized.includes("\t")
    ? normalized.split(/\t+/).map((p) => p.trim())
    : normalized.split(/\s*\|\s*/).map((p) => p.trim());

  if (parts.length < 7 && normalized.includes(";")) {
    parts = normalized.split(/\s*;\s*/).map((p) => p.trim());
  }

  if (parts.length < 7) return null;
  
  return {
    anoMes: parts[0],
    disciplina: parts[1],
    ch: parts[2],
    media: parts[3],
    resultado: parts[4],
    docente: parts[5],
    titulacao: parts.slice(6).join(" | "),
  };
}

function parseImportText(text: string): {
  updates: Record<string, string>;
  gradeRows: GradeRow[];
  historicoKey: HistoricoDisponivelKey | null;
} {
  const updates: Record<string, string> = {};
  const gradeRows: GradeRow[] = [];
  let historicoKey: HistoricoDisponivelKey | null = null;
  let inGrades = false;
  let currentBlock = "";
  const addr: any = { logradouro: "", numero: "", bairro: "", municipio: "", uf: "", cep: "" };

  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const lines: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const upper = line.toUpperCase();
    if (upper.startsWith("PÁG:") || upper.includes("DADOS DO ALUNO") || upper.includes("DADOS ACADÊMICOS") || upper.includes("DADOS INSTITUCIONAIS")) {
      continue;
    }
    lines.push(line);
  }

  const knownLabels = [
     "NOME COMPLETO", "NOME", "CPF", "RG", "ÓRGÃO EMISSOR RG", "NACIONALIDADE", "DATA DE NASCIMENTO", "UF NASCIMENTO", "UF DE NASCIMENTO", "ENDEREÇO",
     "MATRÍCULA", "SITUAÇÃO DE MATRÍCULA", "SITUAÇÃO", "CURSO", "PROCESSO E-MEC", "PROCESSO SELETIVO", 
     "MÊS / ANO DE REALIZAÇÃO", "ANO DE INGRESSO", "CONCLUSÃO DO CURSO", "DATA CONCLUSÃO", "COLAÇÃO DE GRAU", "DATA COLAÇÃO",
     "EXPEDIÇÃO DO DIPLOMA", "EXPEDIÇÃO DO HISTÓRICO", "CARGA HORÁRIA", "TITULAÇÃO", "TÍTULO CONFERIDO",
     "CREDENCIAMENTO: PORTARIA N.º", "CREDENCIAMENTO: DATA PORTARIA", "CREDENCIAMENTO: DATA D.O.U.",
     "RECREDENC.: PORTARIA N.º", "RECREDENC.: DATA PORTARIA", "RECONHEC.: PORTARIA N.º", 
     "RECONHEC.: DATA PORTARIA", "RECONHEC.: DATA D.O.U.", "CÓDIGO DE VALIDAÇÃO", "HORA DE EMISSÃO",
     "INSTITUIÇÃO / POLO", "INSTITUIÇÃO", "POLO", "CEP", "ÓRGÃO EXPE", "NATURALIDADE", "CIDADE DA UNIDADE", "UF DA UNIDADE"
  ].sort((a, b) => b.length - a.length);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    if (upper.includes("COMPONENTES CURRICULARES")) { inGrades = true; continue; }
    if (upper.includes("1. DADOS DO DIPLOMADO")) { currentBlock = "diplomado"; continue; }
    if (upper.includes("2. CURSO, AUTORIZAÇÃO E RECONHECIMENTO")) { currentBlock = "curso"; continue; }
    if (upper.includes("4. INSTITUIÇÃO E MANTENEDORA")) { currentBlock = "instituicao"; continue; }

    if (inGrades) {
      const grade = parseGradeLine(line);
      if (grade) { gradeRows.push(grade); continue; }
    }

    let label = "";
    let val = "";
    let found = false;

    for (const kl of knownLabels) {
       if (upper.startsWith(kl)) {
          label = kl;
          const remaining = line.slice(kl.length).trim();
          val = remaining.startsWith(":") ? remaining.slice(1).trim() : remaining;
          
          if ((!val || val.toUpperCase().startsWith("PÁG:")) && i + 1 < lines.length) {
             let nextVal = lines[i+1];
             if (nextVal.toUpperCase().startsWith("PÁG:")) {
                if (i + 2 < lines.length) { val = lines[i+2]; i += 2; }
             } else if (!nextVal.includes(":")) {
                val = nextVal;
                i++;
             }
          }
          found = true;
          break;
       }
    }

    if (!found) {
       const idx = line.indexOf(":");
       if (idx !== -1) {
          label = line.slice(0, idx).trim().toUpperCase();
          val = line.slice(idx + 1).trim();
          if (!val && i + 1 < lines.length && !lines[i+1].includes(":")) {
             val = lines[i+1];
             i++;
          }
       } else { continue; }
    }

    if (!val) continue;

    // --- Mapeamento Refinado ---
    if (label === "NOME COMPLETO" || label === "NOME") updates.nome = val;
    if (label === "CPF") updates.cpf = val;
    if (label === "RG") updates.rg = val.split(/[-\/\s]/)[0];
    if (label === "ÓRGÃO EMISSOR RG" || label === "ÓRGÃO EXPE" || label === "RG_ORGAO") updates.rg_orgao = val.toUpperCase();
    if (label === "NACIONALIDADE") updates.nacionalidade = val.toUpperCase();
    if (label === "DATA DE NASCIMENTO") updates.data_nascimento = normalizeDateByField(val, "data_nascimento");
    if (label === "UF NASCIMENTO" || label === "UF DE NASCIMENTO") updates.uf_nascimento = val.toUpperCase();
    if (label === "NATURALIDADE") {
       const parts = val.split(/[\/\s-]/);
       updates.uf_nascimento = parts[parts.length - 1].toUpperCase();
    }

    if (label === "MATRÍCULA" || label === "MATR") updates.matricula = val;
    if (label === "SITUAÇÃO DE MATRÍCULA" || label === "SITUAÇÃO") updates.situacao_matricula = val.toUpperCase();
    
    if (label === "CURSO") {
       const clean = val.replace(/CURSO SUPERIOR DE LICENCIATURA EM\s+/i, "")
                        .replace(/LICENCIATURA EM\s+/i, "");
       historicoKey = detectHistoricoByCurso(clean) || historicoKey;
    }

    if (label === "CONCLUSÃO DO CURSO" || label === "DATA CONCLUSÃO") updates.conclusao_curso = normalizeDateByField(val, "conclusao_curso");
    if (label === "COLAÇÃO DE GRAU" || label === "DATA COLAÇÃO") updates.colacao_grau = normalizeDateByField(val, "colacao_grau");
    if (label === "MÊS / ANO DE REALIZAÇÃO") updates.ingresso_mes_ano = normalizeDateByField(val, "ingresso_mes_ano");
    if (label === "ANO DE INGRESSO") updates.ingresso_ano = normalizeDateByField(val, "ingresso_ano");
    if (label === "EXPEDIÇÃO DO DIPLOMA") updates.expedicao_diploma = normalizeDateByField(val, "expedicao_diploma");
    if (label === "EXPEDIÇÃO DO HISTÓRICO") updates.expedicao_historico = normalizeDateByField(val, "expedicao_historico");
    if (label === "CARGA HORÁRIA") updates.carga_horaria = val.replace(/[^\d]/g, "");
    if (label === "TITULAÇÃO" || label === "TÍTULO CONFERIDO") updates.titulacao = val.toUpperCase();
    if (label === "PROCESSO E-MEC" || label === "CÓD. E-MEC") updates.processo_emec = val;
    if (label === "PROCESSO SELETIVO") updates.processo_seletivo = val.toUpperCase();

    // Portarias
    if (label === "CREDENCIAMENTO: PORTARIA N.º") updates.cred_portaria = val;
    if (label === "CREDENCIAMENTO: DATA PORTARIA") updates.cred_portaria_dt = normalizeDateByField(val, "cred_portaria_dt");
    if (label === "CREDENCIAMENTO: DATA D.O.U.") updates.cred_dou_dt = normalizeDateByField(val, "cred_dou_dt");
    if (label === "RECREDENC.: PORTARIA N.º") updates.recred_portaria = val;
    if (label === "RECREDENC.: DATA PORTARIA") updates.recred_portaria_dt = normalizeDateByField(val, "recred_portaria_dt");
    if (label === "RECONHEC.: PORTARIA N.º") updates.reconhecimento_portaria = val;
    if (label === "RECONHEC.: DATA PORTARIA") updates.reconhecimento_portaria_dt = normalizeDateByField(val, "reconhecimento_portaria_dt");
    if (label === "RECONHEC.: DATA D.O.U.") updates.reconhecimento_dou_dt = normalizeDateByField(val, "reconhecimento_dou_dt");

    // Endereço e CEP
    if (label === "CEP") { addr.cep = val; updates.cep = val; }
    if (label === "ENDEREÇO" || label === "LOGRADOURO") {
       if (val.length > 10) {
          updates.endereco = val.toUpperCase();
          const cepMatch = val.match(/(\d{5}-\d{3})|(\d{8})/);
          if (cepMatch) updates.cep = cepMatch[0];
       } else { addr.logradouro = val; }
    }
    if (label === "NÚMERO" || label === "NÚMERO ENDEREÇO") addr.numero = val;
    if (label === "BAIRRO") addr.bairro = val;
    if (label === "MUNICÍPIO" || label === "CIDADE") addr.municipio = val;
    if (label === "UF") addr.uf = val;
    
    if (label === "INSTITUIÇÃO / POLO" || label === "POLO") {
       updates.instituicao_polo = val;
       const poloMatch = val.match(/POLO\s+([^-|]+)(?:\([^)]+\))?\s*-\s*([A-Z]{2})/i);
       if (poloMatch) {
          updates.unidade_cidade = poloMatch[1].trim().toUpperCase();
          updates.unidade_uf = poloMatch[2].toUpperCase();
       }
    }
    
    if (label === "CIDADE DA UNIDADE") updates.unidade_cidade = val.toUpperCase();
    if (label === "UF DA UNIDADE") updates.unidade_uf = val.toUpperCase();
    if (label === "CÓDIGO DE VALIDAÇÃO") updates.codigo_validacao = val;
    if (label === "HORA DE EMISSÃO") updates.emissao_hora = val;
  }

  if (!updates.endereco && addr.logradouro) {
    updates.endereco = `${addr.logradouro.toUpperCase()}, ${addr.numero || "S/N"} - ${addr.bairro.toUpperCase()}, ${addr.municipio.toUpperCase()}/${addr.uf.toUpperCase()} ${addr.cep || ""}`.trim();
  }
  if (addr.uf) updates.unidade_uf = addr.uf.toUpperCase();
  if (addr.municipio && !updates.unidade_cidade) updates.unidade_cidade = addr.municipio.toUpperCase();
  if (addr.cep) updates.cep = addr.cep;

  return { updates, gradeRows, historicoKey };
}

function normalizeHistoricoKey(input?: string): HistoricoDisponivelKey | null {
  if (!input) return null;
  const value = normalizeUpper(input);
  if (value.includes("ENG")) return "engenharia_controle_automacao";
  if (value.includes("PED")) return "pedagogia";
  if (value.includes("ADM")) return "administracao";
  if (value.includes("DIR")) return "direito";
  if (value.includes("EDF") || value.includes("EDUC")) return "educacao_fisica";
  const keys = Object.keys(HISTORICO_TO_PROFILE) as HistoricoDisponivelKey[];
  return keys.find(k => k.toUpperCase() === value) || null;
}

function applyFieldUpdates(fields: SubstitutionField[], updates: Record<string, string>) {
  return fields.map((field) =>
    Object.prototype.hasOwnProperty.call(updates, field.id)
      ? { ...field, currentValue: updates[field.id] }
      : field
  );
}

export function useSubstitutionUninter() {
  return useSubstitution();
}

export function useSubstitution() {
  const [activeHistorico, setActiveHistorico] = useState<HistoricoDisponivelKey | null>(DEFAULT_HISTORICO);
  const [fields, setFields] = useState<SubstitutionField[]>(() => createEmptyFields());
  const [importText, setImportText] = useState("");
  const [customGrades, setCustomGrades] = useState<GradeRow[]>([]);

  const activeProfile = activeHistorico ? HISTORICO_TO_PROFILE[activeHistorico] : null;

  const fieldMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of fields) map[f.id] = f.currentValue;
    return map;
  }, [fields]);

  const modifiedCount = useMemo(() => {
    return fields.filter((f) => f.currentValue.trim() !== "" && f.currentValue !== f.originalValue).length;
  }, [fields]);

  const gradeRows = useMemo(() => {
    return customGrades;
  }, [customGrades]);

  // Sincronia CEP -> UF/Cidade automática
  const handleCEPLookup = useCallback(async (cepVal: string, numVal: string = "") => {
    const cleanCEP = (cepVal || "").replace(/\D/g, "");
    if (cleanCEP.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await res.json();
      
      if (data.erro) {
        return;
      }

      const formattedEndereco = `${data.logradouro.toUpperCase()}, ${numVal || "S/N"} - ${data.bairro.toUpperCase()}, ${data.localidade.toUpperCase()}/${data.uf.toUpperCase()} ${data.cep}`;

      setFields(prev => prev.map(f => {
         if (f.id === "endereco") return { ...f, currentValue: formattedEndereco };
         if (f.id === "unidade_uf") return { ...f, currentValue: data.uf.toUpperCase() };
         if (f.id === "unidade_cidade") return { ...f, currentValue: data.localidade.toUpperCase() };
         if (f.id === "cep") return { ...f, currentValue: data.cep };
         return f;
      }));
    } catch {}
  }, []);

  // Monitor de alteração do campo 'cep' para disparar lookup automático
  useEffect(() => {
    const cepField = fields.find(f => f.id === "cep");
    if (cepField?.currentValue && cepField.currentValue.replace(/\D/g, "").length === 8) {
       handleCEPLookup(cepField.currentValue);
    }
  }, [fieldMap.cep, handleCEPLookup]);

  const applyHistorico = useCallback((historico: HistoricoDisponivelKey) => {
    setActiveHistorico(historico);
    const label = HISTORICOS_DISPONIVEIS.find(c => c.key === historico)?.label || "";
    const cleanCurso = label.replace(/CURSO SUPERIOR DE LICENCIATURA EM\s+/i, "")
                             .replace(/LICENCIATURA EM\s+/i, "");
    
    setFields(prev => prev.map(f => {
      if (f.id === "curso") return { ...f, currentValue: cleanCurso.toUpperCase() };
      return f;
    }));
    
    setCustomGrades([]);
  }, []);

  const updateField = useCallback((fieldId: string, newValue: string) => {
    if (["nome_reitor", "nome_secretaria"].includes(fieldId)) return;
    
    let val = newValue;
    if (fieldId.includes("data") || fieldId.includes("_dt") || ["conclusao_curso", "colacao_grau", "expedicao_diploma", "expedicao_historico", "ingresso_mes_ano", "ingresso_ano"].includes(fieldId)) {
       val = normalizeDateByField(newValue, fieldId);
    }

    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, currentValue: val } : f))
    );
  }, []);

  const generateMatricula = useCallback(() => {
    setFields((prev) => applyFieldUpdates(prev, { matricula: buildMatricula() }));
  }, []);

  const handleGenerateGrade = useCallback(() => {
    if (!activeProfile) {
      toast.error("Selecione um curso primeiro");
      return;
    }
    const start = fieldMap.ingresso_mes_ano || fieldMap.ingresso_ano;
    const end = fieldMap.conclusao_curso || fieldMap.colacao_grau;
    
    const newGrades = generateAcademicGrades(activeProfile, start, end);
    setCustomGrades(newGrades);
    toast.success(`Grade de ${PROFILES[activeProfile].label} gerada com sucesso!`);
  }, [activeProfile, fieldMap]);

  const applyImportText = useCallback(async () => {
    if (!importText.trim()) return;

    const parsed = parseImportText(importText);

    // Se detectou um curso, aplica a lógica de seleção de curso (incluindo o prefixo correto)
    if (parsed.historicoKey) {
      const historico = parsed.historicoKey;
      setActiveHistorico(historico);
      const label = HISTORICOS_DISPONIVEIS.find(c => c.key === historico)?.label || "";
      const cleanCurso = label.replace(/CURSO SUPERIOR DE LICENCIATURA EM\s+/i, "")
                               .replace(/LICENCIATURA EM\s+/i, "");
      
      parsed.updates.curso = cleanCurso.toUpperCase();
    }

    const updates = { ...parsed.updates };
    if (!updates.matricula) {
      updates.matricula = buildMatricula();
    }
    if (!updates.situacao_matricula) {
      updates.situacao_matricula = "FORMADO";
    }

    setFields((prev) => applyFieldUpdates(prev, updates));

    if (parsed.gradeRows.length > 0) {
      setCustomGrades(parsed.gradeRows);
    }

    toast.success("Importação concluída com sucesso!");
  }, [importText]);

  const resetToOriginal = useCallback(() => {
    setActiveHistorico(DEFAULT_HISTORICO);
    setFields(createEmptyFields());
    setImportText("");
    setCustomGrades([]);
  }, []);

  const loadFromFieldMap = useCallback((incoming: Record<string, unknown>, historicoInput?: string, incomingGrades?: unknown) => {
    const historico = normalizeHistoricoKey(historicoInput as string);
    setActiveHistorico(historico);

    const baseFields = createSubstitutionFields(historico ? PROFILES[HISTORICO_TO_PROFILE[historico]] : undefined);
    const normalized = baseFields.map((field) => {
      const value = incoming[field.id];
      if (value === undefined || value === null) return field;
      return { ...field, currentValue: String(value) };
    });

    setFields(normalized);

    if (Array.isArray(incomingGrades)) {
      const validGrades = incomingGrades
        .map((row: any) => ({
          anoMes: String(row?.anoMes || ""),
          disciplina: String(row?.disciplina || ""),
          ch: String(row?.ch || ""),
          media: String(row?.media || ""),
          resultado: String(row?.resultado || ""),
          docente: String(row?.docente || ""),
          titulacao: String(row?.titulacao || ""),
        }))
        .filter((row) => row.anoMes && row.disciplina);

      setCustomGrades(validGrades);
    }
  }, []);

  return {
    fields,
    fieldMap,
    activeHistorico,
    activeProfile,
    modifiedCount,
    importText,
    gradeRows,
    applyHistorico,
    updateField,
    resetToOriginal,
    loadFromFieldMap,
    setImportText,
    applyImportText,
    generateMatricula,
    handleGenerateGrade,
    handleCEPLookup
  };
}
