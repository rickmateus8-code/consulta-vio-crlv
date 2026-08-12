// ============================================================
// Document Data Model — Histórico Escolar UNINTER Elite 3.0 (Universal)
// Design: "Document Studio" — Swiss Design / Functional
// ============================================================

export interface SubstitutionField {
  id: string;
  label: string;
  category: "pessoal" | "academico" | "institucional";
  originalValue: string;
  currentValue: string;
  pages: number[];
  placeholder?: string;
}

export type ProfileKey =
  | "historia"
  | "pedagogia"
  | "engenharia_controle_automacao"
  | "engenharia_eletrica"
  | "engenharia_producao"
  | "gestao_producao_industrial"
  | "administracao"
  | "letras"
  | "direito"
  | "ciencias_contabeis"
  | "enfermagem"
  | "psicologia"
  | "marketing"
  | "gestao_recursos_humanos"
  | "servico_social"
  | "teologia"
  | "educacao_fisica";

export type HistoricoDisponivelKey = ProfileKey;

export interface HistoricoDisponivel {
  key: HistoricoDisponivelKey;
  label: string;
  shortLabel: string;
}

export const HISTORICOS_DISPONIVEIS: HistoricoDisponivel[] = [
  { key: "administracao", label: "ADMINISTRAÇÃO", shortLabel: "ADM" },
  { key: "ciencias_contabeis", label: "CIÊNCIAS CONTÁBEIS", shortLabel: "CONT" },
  { key: "direito", label: "DIREITO", shortLabel: "DIR" },
  { key: "educacao_fisica", label: "EDUCAÇÃO FÍSICA", shortLabel: "EDF" },
  { key: "enfermagem", label: "ENFERMAGEM", shortLabel: "ENF" },
  { key: "engenharia_controle_automacao", label: "ENG. CONTROLE E AUTOMAÇÃO", shortLabel: "ENG" },
  { key: "engenharia_eletrica", label: "ENGENHARIA ELÉTRICA", shortLabel: "ELET" },
  { key: "engenharia_producao", label: "ENGENHARIA DE PRODUÇÃO", shortLabel: "PROD" },
  { key: "gestao_producao_industrial", label: "GESTÃO DE PRODUÇÃO INDUSTRIAL", shortLabel: "GPI" },
  { key: "gestao_recursos_humanos", label: "GESTÃO DE REC. HUMANOS", shortLabel: "RH" },
  { key: "historia", label: "HISTÓRIA", shortLabel: "HIST" },
  { key: "letras", label: "LETRAS", shortLabel: "LET" },
  { key: "marketing", label: "MARKETING", shortLabel: "MKT" },
  { key: "pedagogia", label: "PEDAGOGIA", shortLabel: "PED" },
  { key: "psicologia", label: "PSICOLOGIA", shortLabel: "PSI" },
  { key: "servico_social", label: "SERVIÇO SOCIAL", shortLabel: "SERV" },
  { key: "teologia", label: "TEOLOGIA", shortLabel: "TEO" },
];

export const UNINTER_IMPORT_TEMPLATE = [
  "DADOS DO ALUNO",
  "Nome:",
  "CPF:",
  "RG:",
  "Órgão Emissor RG:",
  "Nacionalidade:",
  "Data de Nascimento:",
  "UF Nascimento:",
  "Endereço:",
  "",
  "DADOS ACADÊMICOS / MATRÍCULA",
  "Matrícula:",
  "Situação de Matrícula:",
  "Curso:",
  "Credenciamento: Portaria n.º",
  "Credenciamento: Data Portaria",
  "Credenciamento: Data D.O.U.",
  "Recredenc.: Portaria n.º",
  "Recredenc.: Data Portaria",
  "Reconhec.: Portaria n.º",
  "Reconhec.: Data Portaria",
  "Reconhec.: Data D.O.U.",
  "Processo e-MEC:",
  "Processo Seletivo:",
  "Mês / Ano de Realização:",
  "Ano de Ingresso:",
  "Conclusão do Curso:",
  "Colação de Grau:",
  "Expedição do Diploma:",
  "Expedição do Histórico:",
  "Carga Horária:",
  "Titulação:",
  "Código de Validação:",
  "Hora de Emissão:",
  "",
  "DADOS INSTITUCIONAIS",
  "Instituição / Polo:",
  "CEP:",
].join("\n");

export interface Profile {
  name: string;
  label: string;
  curso: string;
  cursoAbreviado: string;
  fields: Record<string, string>;
}

export interface CourseMetadata {
  cursoCompleto: string;
  reconhecimento: string;
  reconhecimentoInline: string;
  dateText: string;
  ingressoMesAno: string;
  ingressoAno: string;
  unidadeLabel: string;
  unidadeEndereco: string;
  codigoValidacao: string;
}

const BASE_FIELDS: Record<string, string> = {
  nome: "",
  cpf: "",
  rg: "",
  rg_orgao: "",
  data_nascimento: "",
  uf_nascimento: "",
  nacionalidade: "",
  matricula: "",
  situacao_matricula: "FORMADO",
  endereco: "",
  conclusao_curso: "",
  colacao_grau: "",
  expedicao_diploma: "",
  expedicao_historico: "",
  carga_horaria: "",
  titulacao: "",
  ingresso_mes_ano: "",
  ingresso_ano: "",
  cred_portaria: "688",
  cred_portaria_dt: "25/05/2012",
  cred_dou_dt: "28/05/2012",
  recred_portaria: "1.219",
  recred_portaria_dt: "28/11/2019",
  reconhecimento_portaria: "357",
  reconhecimento_portaria_dt: "24/05/2018",
  reconhecimento_dou_dt: "25/05/2018",
  processo_emec: "201605151",
  processo_seletivo: "VESTIBULAR",
  instituicao_polo: "CENTRO UNIVERSITÁRIO INTERNACIONAL UNINTER | POLO CURITIBA (CENTRO) - PR",
  cep: "",
  unidade_uf: "",
  unidade_cidade: "",
  codigo_validacao: "",
  emissao_hora: "15:01:39",
};

export const PROFILES: Record<ProfileKey, Profile> = {
  administracao: { name: "", label: "Administração", curso: "BACHARELADO EM ADMINISTRAÇÃO", cursoAbreviado: "Administração", fields: { ...BASE_FIELDS } },
  ciencias_contabeis: { name: "", label: "Ciências Contábeis", curso: "BACHARELADO EM CIÊNCIAS CONTÁBEIS", cursoAbreviado: "Ciências Contábeis", fields: { ...BASE_FIELDS } },
  direito: { name: "", label: "Direito", curso: "BACHARELADO EM DIREITO", cursoAbreviado: "Direito", fields: { ...BASE_FIELDS } },
  educacao_fisica: { name: "", label: "Educação Física", curso: "LICENCIATURA EM EDUCAÇÃO FÍSICA", cursoAbreviado: "Educação Física", fields: { ...BASE_FIELDS } },
  enfermagem: { name: "", label: "Enfermagem", curso: "BACHARELADO EM ENFERMAGEM", cursoAbreviado: "Enfermagem", fields: { ...BASE_FIELDS } },
  engenharia_controle_automacao: { name: "", label: "Eng. Controle e Automação", curso: "BACHARELADO EM ENGENHARIA DE CONTROLE E AUTOMAÇÃO", cursoAbreviado: "Eng. Controle e Automação", fields: { ...BASE_FIELDS } },
  engenharia_eletrica: { name: "", label: "Engenharia Elétrica", curso: "BACHARELADO EM ENGENHARIA ELÉTRICA", cursoAbreviado: "Engenharia Elétrica", fields: { ...BASE_FIELDS } },
  engenharia_producao: { name: "", label: "Engenharia de Produção", curso: "BACHARELADO EM ENGENHARIA DE PRODUÇÃO", cursoAbreviado: "Engenharia de Produção", fields: { ...BASE_FIELDS } },
  gestao_producao_industrial: { name: "", label: "Gestão de Prod. Industrial", curso: "TECNOLOGIA EM GESTÃO DE PRODUÇÃO INDUSTRIAL", cursoAbreviado: "Gestão de Prod. Industrial", fields: { ...BASE_FIELDS } },
  gestao_recursos_humanos: { name: "", label: "Gestão de RH", curso: "TECNOLOGIA EM GESTÃO DE RECURSOS HUMANOS", cursoAbreviado: "Gestão RH", fields: { ...BASE_FIELDS } },
  historia: { name: "", label: "História", curso: "LICENCIATURA EM HISTÓRIA", cursoAbreviado: "História", fields: { ...BASE_FIELDS } },
  letras: { name: "", label: "Letras", curso: "LICENCIATURA EM LETRAS", cursoAbreviado: "Letras", fields: { ...BASE_FIELDS } },
  marketing: { name: "", label: "Marketing", curso: "TECNOLOGIA EM MARKETING", cursoAbreviado: "Marketing", fields: { ...BASE_FIELDS } },
  pedagogia: { name: "", label: "Pedagogia", curso: "LICENCIATURA EM PEDAGOGIA", cursoAbreviado: "Pedagogia", fields: { ...BASE_FIELDS } },
  psicologia: { name: "", label: "Psicologia", curso: "BACHARELADO EM PSICOLOGIA", cursoAbreviado: "Psicologia", fields: { ...BASE_FIELDS } },
  servico_social: { name: "", label: "Serviço Social", curso: "BACHARELADO EM SERVIÇO SOCIAL", cursoAbreviado: "Serviço Social", fields: { ...BASE_FIELDS } },
  teologia: { name: "", label: "Teologia", curso: "BACHARELADO EM TEOLOGIA", cursoAbreviado: "Teologia", fields: { ...BASE_FIELDS } },
};

const BASE_META: CourseMetadata = {
  cursoCompleto: "",
  reconhecimento: "",
  reconhecimentoInline: "",
  dateText: "Curitiba/PR, ____ de __________ de ____.",
  ingressoMesAno: "",
  ingressoAno: "",
  unidadeLabel: "UNIDADE:",
  unidadeEndereco: "",
  codigoValidacao: "",
};

export const COURSE_METADATA: Record<ProfileKey, CourseMetadata> = {
  administracao: { ...BASE_META },
  ciencias_contabeis: { ...BASE_META },
  direito: { ...BASE_META },
  educacao_fisica: { ...BASE_META },
  enfermagem: { ...BASE_META },
  engenharia_controle_automacao: { ...BASE_META },
  engenharia_eletrica: { ...BASE_META },
  engenharia_producao: { ...BASE_META },
  gestao_producao_industrial: { ...BASE_META },
  gestao_recursos_humanos: { ...BASE_META },
  historia: { ...BASE_META },
  letras: { ...BASE_META },
  marketing: { ...BASE_META },
  pedagogia: { ...BASE_META },
  psicologia: { ...BASE_META },
  servico_social: { ...BASE_META },
  teologia: { ...BASE_META },
};

// ==================== SUBSTITUTION FIELDS ====================
export function createSubstitutionFields(profile?: Profile): SubstitutionField[] {
  const fields = profile ? profile.fields : BASE_FIELDS;
  return [
    { id: "nome", label: "Nome Completo", category: "pessoal", originalValue: "", currentValue: fields.nome, pages: [1, 2, 3, 5], placeholder: "JOÃO DA SILVA" },
    { id: "cpf", label: "CPF", category: "pessoal", originalValue: "", currentValue: fields.cpf, pages: [1, 2, 3, 5], placeholder: "000.000.000-00" },
    { id: "rg", label: "RG", category: "pessoal", originalValue: "", currentValue: fields.rg, pages: [3, 5], placeholder: "00.000.000-0" },
    { id: "rg_orgao", label: "Órgão Emissor RG", category: "pessoal", originalValue: "", currentValue: fields.rg_orgao, pages: [3, 5], placeholder: "SSP/PR" },
    { id: "data_nascimento", label: "Data de Nascimento", category: "pessoal", originalValue: "", currentValue: fields.data_nascimento, pages: [3, 5], placeholder: "01/01/1990" },
    { id: "uf_nascimento", label: "UF Nascimento", category: "pessoal", originalValue: "", currentValue: fields.uf_nascimento, pages: [3, 5], placeholder: "PR" },
    { id: "nacionalidade", label: "Nacionalidade", category: "pessoal", originalValue: "", currentValue: fields.nacionalidade, pages: [3, 5], placeholder: "BRASILEIRA" },
    { id: "matricula", label: "Matrícula", category: "academico", originalValue: "", currentValue: fields.matricula, pages: [1, 2, 3, 5], placeholder: "1022071" },
    { id: "situacao_matricula", label: "Situação de Matrícula", category: "academico", originalValue: "FORMADO", currentValue: fields.situacao_matricula, pages: [3, 5] },
    { id: "curso", label: "Nome do Curso", category: "academico", originalValue: "", currentValue: fields.curso, pages: [1, 2, 3], placeholder: "PEDAGOGIA" },
    { id: "conclusao_curso", label: "Conclusão do Curso", category: "academico", originalValue: "", currentValue: fields.conclusao_curso, pages: [1, 2, 3], placeholder: "12/2025" },
    { id: "colacao_grau", label: "Colação de Grau", category: "academico", originalValue: "", currentValue: fields.colacao_grau, pages: [1, 2, 3], placeholder: "22/12/2025" },
    { id: "ingresso_mes_ano", label: "Mês / Ano de Realização", category: "academico", originalValue: "", currentValue: fields.ingresso_mes_ano, pages: [3], placeholder: "01/2021" },
    { id: "ingresso_ano", label: "Ano de Ingresso", category: "academico", originalValue: "", currentValue: fields.ingresso_ano, pages: [3], placeholder: "2021" },
    { id: "expedicao_diploma", label: "Expedição do Diploma", category: "academico", originalValue: "", currentValue: fields.expedicao_diploma, pages: [3, 4], placeholder: "22/12/2025" },
    { id: "expedicao_historico", label: "Expedição do Histórico", category: "academico", originalValue: "", currentValue: fields.expedicao_historico, pages: [3], placeholder: "22/12/2025" },
    { id: "carga_horaria", label: "Carga Horária", category: "academico", originalValue: "", currentValue: fields.carga_horaria, pages: [2, 6], placeholder: "3200" },
    { id: "titulacao", label: "Titulação", category: "academico", originalValue: "", currentValue: fields.titulacao, pages: [5, 6], placeholder: "LICENCIADA EM PEDAGOGIA" },
    { id: "processo_emec", label: "Processo e-MEC*", category: "academico", originalValue: "201605151", currentValue: fields.processo_emec, pages: [3], placeholder: "201605151" },
    { id: "processo_seletivo", label: "Processo Seletivo", category: "academico", originalValue: "VESTIBULAR", currentValue: fields.processo_seletivo, pages: [3], placeholder: "VESTIBULAR" },
    { id: "cred_portaria", label: "Credenciamento: Portaria n.º", category: "academico", originalValue: "688", currentValue: fields.cred_portaria, pages: [2, 3], placeholder: "688" },
    { id: "cred_portaria_dt", label: "Credenciamento: Data Portaria", category: "academico", originalValue: "25/05/2012", currentValue: fields.cred_portaria_dt, pages: [2, 3], placeholder: "25/05/2012" },
    { id: "cred_dou_dt", label: "Credenciamento: Data D.O.U.", category: "academico", originalValue: "28/05/2012", currentValue: fields.cred_dou_dt, pages: [2, 3], placeholder: "28/05/2012" },
    { id: "recred_portaria", label: "Recredenc.: Portaria n.º", category: "academico", originalValue: "1.219", currentValue: fields.recred_portaria, pages: [2, 3], placeholder: "1.219" },
    { id: "recred_portaria_dt", label: "Recredenc.: Data Portaria", category: "academico", originalValue: "28/11/2019", currentValue: fields.recred_portaria_dt, pages: [2, 3], placeholder: "28/11/2019" },
    { id: "reconhecimento_portaria", label: "Reconhec.: Portaria n.º", category: "academico", originalValue: "357", currentValue: fields.reconhecimento_portaria, pages: [1, 2, 3], placeholder: "357" },
    { id: "reconhecimento_portaria_dt", label: "Reconhec.: Data Portaria", category: "academico", originalValue: "24/05/2018", currentValue: fields.reconhecimento_portaria_dt, pages: [1, 2, 3], placeholder: "24/05/2018" },
    { id: "reconhecimento_dou_dt", label: "Reconhec.: Data D.O.U.", category: "academico", originalValue: "25/05/2018", currentValue: fields.reconhecimento_dou_dt, pages: [1, 2, 3], placeholder: "25/05/2018" },
    { id: "codigo_validacao", label: "Código de Validação", category: "academico", originalValue: "", currentValue: fields.codigo_validacao, pages: [4], placeholder: "732.551/822.441" },
    { id: "emissao_hora", label: "Hora de Emissão", category: "academico", originalValue: "15:01:39", currentValue: fields.emissao_hora, pages: [4], placeholder: "15:01:39" },
    // Institucional
    { id: "instituicao_polo", label: "Instituição / Polo", category: "institucional", originalValue: "CENTRO UNIVERSITÁRIO INTERNACIONAL UNINTER | POLO CURITIBA (CENTRO) - PR", currentValue: fields.instituicao_polo, pages: [3] },
    { id: "cep", label: "CEP Busca", category: "institucional", originalValue: "", currentValue: fields.cep, pages: [], placeholder: "81200-170" },
    { id: "endereco", label: "Endereço Completo", category: "institucional", originalValue: "", currentValue: fields.endereco, pages: [3], placeholder: "RUA CLARA VENDRAMIN, 58..." },
    { id: "unidade_uf", label: "UF da Unidade", category: "institucional", originalValue: "", currentValue: fields.unidade_uf, pages: [], placeholder: "PR" },
    { id: "unidade_cidade", label: "Cidade da Unidade", category: "institucional", originalValue: "", currentValue: fields.unidade_cidade || "", pages: [], placeholder: "CURITIBA" },
  ];
}

export interface GradeRow {
  anoMes: string;
  disciplina: string;
  ch: string;
  media: string;
  resultado: string;
  docente: string;
  titulacao: string;
}

export function getGradesForProfile(profileKey: ProfileKey): { page5: GradeRow[]; page6: GradeRow[] } {
  return { 
    page5: [{ anoMes: "", disciplina: "Clique em 'GERAR GRADE' ou 'Importar Inteligente' para preencher", ch: "", media: "", resultado: "", docente: "", titulacao: "" }], 
    page6: [] 
  };
}
