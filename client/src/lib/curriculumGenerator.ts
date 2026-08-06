import { type GradeRow, type ProfileKey } from "./documentData_uninter";

// ------------------------------------------------------------
// BANCO DE DISCIPLINAS POR CURSO (REAIS / COMPLETAS 40-50 CADA)
// ------------------------------------------------------------

const SUBJECTS_DATABASE: Record<string, string[]> = {
  administracao: [
    "Fundamentos da Administração", "Matemática Financeira", "Economia Brasileira", "Contabilidade Geral", "Comportamento Organizacional",
    "Gestão de Pessoas", "Gestão de Marketing", "Administração Financeira", "Administração da Produção", "Planejamento Estratégico",
    "Gestão de Projetos", "Empreendedorismo", "Logística e Cadeia de Suprimentos", "Direito Empresarial", "Ética e Responsabilidade Social",
    "Comércio Exterior", "Sistemas de Informação Gerencial", "Gestão da Qualidade", "Administração Pública", "Marketing Digital",
    "Cálculo para Administradores", "Teoria Geral da Administração", "Sociologia das Organizações", "Psicologia Aplicada à Administração", "Língua Portuguesa",
    "Estatística Aplicada", "Contabilidade Gerencial", "Análise de Investimentos", "Gestão da Inovação", "Mercado de Capitais",
    "Desenvolvimento Sustentável", "Comunicação Empresarial", "Gestão de Pequenas e Médias Empresas", "Negociação e Gestão de Conflitos", "Cultura Organizacional",
    "Tópicos Especiais em Administração", "Metodologia Científica", "Estágio Supervisionado I", "Estágio Supervisionado II", "TCC I", "TCC II"
  ],
  ciencias_contabeis: [
    "Contabilidade Geral I", "Contabilidade Geral II", "Contabilidade de Custos", "Análise de Balanços", "Contabilidade Tributária",
    "Auditoria Contábil", "Perícia Contábil", "Contabilidade Pública", "Contabilidade Gerencial", "Legislação Social e Trabalhista",
    "Teoria da Contabilidade", "Controladoria", "Orçamento Público", "Sistemas de Informações Contábeis", "Contabilidade Internacional",
    "Laboratório Contábil", "Matemática Atuarial", "Estrutura das Demonstrações Contábeis", "Direito Tributário", "Matemática Financeira",
    "Cálculo Diferencial e Integral", "Estatística Econômica", "Microeconomia", "Macroeconomia", "Direito Comercial",
    "Contabilidade das Instituições Financeiras", "Contabilidade de Seguros", "Ética Geral e Profissional", "Gestão Financeira", "Modelos de Gestão",
    "Capital de Giro", "Comunicação e Redação Técnica", "Métodos Quantitativos", "Sistemas de Custos", "Contabilidade Aplicada ao Setor Privado",
    "Auditoria de Sistemas", "Contabilidade Societária", "Prática Contábil", "Estágio Supervisionado", "TCC I", "TCC II"
  ],
  direito: [
    "Introdução ao Estudo do Direito", "Teoria Geral do Estado", "Direito Civil - Parte Geral", "Direito Constitucional I", "Direito Constitucional II",
    "Direito Penal I", "Direito Penal II", "Direito Penal III", "Direito Processual Civil I", "Direito Processual Civil II",
    "Direito do Trabalho I", "Direito do Trabalho II", "Direito Civil - Contratos", "Direito Administrativo I", "Direito Administrativo II",
    "Direito Processual Penal I", "Direito Processual Penal II", "Direito Tributário I", "Direito Tributário II", "Direito Empresarial I",
    "Direito Empresarial II", "Direito Ambiental", "Direito do Consumidor", "Direito Internacional Público", "Direito Internacional Privado",
    "Direito da Seguridade Social", "Direito da Criança e do Adolescente", "Medicina Legal", "Filosofia do Direito", "Sociologia Jurídica",
    "Antropologia Jurídica", "Hermenêutica Jurídica", "Ética Profissional", "Economia Política", "Direitos Humanos",
    "Prática Jurídica Cível", "Prática Jurídica Penal", "Prática Jurídica Trabalhista", "Estágio Curricular I", "Estágio Curricular II", "TCC I", "TCC II"
  ],
  educacao_fisica: [
    "Anatomia Humana Aplicada à Educação Física", "Fisiologia Humana e do Exercício", "Cinesiologia e Biomecânica do Movimento", "História e Fundamentos da Educação Física", "Aprendizagem e Desenvolvimento Motor",
    "Psicologia do Esporte e do Exercício", "Crescimento e Desenvolvimento Humano", "Recreação, Lazer e Sociedade", "Didática Geral e Organização do Trabalho Pedagógico", "Filosofia e Sociologia da Educação e do Esporte",
    "Metodologia do Ensino do Atletismo", "Metodologia do Ensino da Natação e Atividades Aquáticas", "Metodologia do Ensino da Ginástica Geral e de Academia", "Metodologia do Ensino dos Esportes Coletivos: Futebol e Futsal", "Metodologia do Ensino dos Esportes Coletivos: Basquetebol",
    "Metodologia do Ensino dos Esportes Coletivos: Voleibol", "Metodologia do Ensino dos Esportes Coletivos: Handebol", "Metodologia do Ensino dos Esportes de Combate e Lutas", "Metodologia do Ensino das Danças e Atividades Rítmicas", "Educação Física Inclusiva e Adaptada",
    "Atividade Física, Saúde Coletiva e Qualidade de Vida", "Primeiros Socorros e Urgências no Esporte e na Escola", "Avaliação Física, Antropometria e Prescrição de Exercícios", "Treinamento Desportivo e Preparação Física", "Bioquímica do Exercício e Nutrição Esportiva",
    "Organização e Gestão de Eventos Esportivos e Lazer", "Políticas Públicas de Educação, Esporte e Lazer", "Metodologia da Pesquisa em Educação Física", "Educação Física na Educação Infantil", "Educação Física no Ensino Fundamental - Anos Iniciais",
    "Educação Física no Ensino Fundamental - Anos Finais", "Educação Física no Ensino Médio", "Jogos, Brinquedos e Brincadeiras na Escola", "Ritmo e Expressão Corporal", "Libras - Língua Brasileira de Sinais",
    "Ética e Deontologia Profissional na Educação Física", "Educação Ambiental e Atividades de Aventura", "Tecnologias Aplicadas ao Ensino da Educação Física", "Atividades Acadêmico-Científico-Culturais (AACC)", "Estágio Supervisionado: Educação Infantil e Anos Iniciais",
    "Estágio Supervisionado: Ensino Fundamental e Médio", "Estágio Supervisionado: Gestão de Projetos e Espaços Não Escolares", "Trabalho de Conclusão de Curso (TCC) I", "Trabalho de Conclusão de Curso (TCC) II"
  ],
  enfermagem: [
    "Anatomia Humana I", "Anatomia Humana II", "Fisiologia Humana I", "Fisiologia Humana II", "Bioquímica",
    "Microbiologia", "Imunologia", "Histologia e Embriologia", "Genética Humana", "Fundamentos de Enfermagem I",
    "Fundamentos de Enfermagem II", "Semiologia", "Semiotécnica", "Farmacologia Aplicada", "Patologia Geral",
    "Epidemiologia", "Saúde Coletiva I", "Saúde Coletiva II", "Enfermagem na Saúde da Mulher", "Enfermagem na Saúde do Homem",
    "Enfermagem na Saúde da Criança", "Enfermagem na Saúde do Adolescente", "Enfermagem na Saúde do Idoso", "Enfermagem em Centro Cirúrgico", "Enfermagem em UTI",
    "Enfermagem em Urgência e Emergência", "Gestão em Enfermagem", "Bioética", "Ética Profissional", "Nutrição",
    "Psicologia da Saúde", "Sistematização da Assistência de Enfermagem", "Enfermagem em Saúde Mental", "Enfermagem em Doenças Transmissíveis", "Saúde do Trabalhador",
    "Práticas Integrativas e Complementares", "Metodologia da Pesquisa", "Estágio Hospitalar", "Estágio em Saúde Pública", "TCC I", "TCC II"
  ],
  engenharia_controle_automacao: [
    "Cálculo Diferencial e Integral I", "Cálculo Diferencial e Integral II", "Cálculo Diferencial e Integral III", "Álgebra Linear", "Geometria Analítica",
    "Física Geral I", "Física Geral II", "Física Geral III", "Química Geral", "Algoritmos e Programação I",
    "Algoritmos e Programação II", "Desenho Técnico", "Circuitos Elétricos I", "Circuitos Elétricos II", "Sistemas Digitais I",
    "Sistemas Digitais II", "Sinais e Sistemas", "Controle de Sistemas Lineares I", "Controle de Sistemas Lineares II", "Eletrônica Analógica I",
    "Eletrônica Analógica II", "Eletrônica de Potência", "Microcontroladores", "Instrumentação Industrial", "Sensores e Atuadores",
    "Redes Industriais", "Robótica Industrial", "Sistemas Supervisórios", "CLP I", "CLP II",
    "Automação Industrial I", "Automação Industrial II", "Sistemas Hidráulicos e Pneumáticos", "Mecânica dos Sólidos", "Ciência dos Materiais",
    "Termodinâmica", "Fenômenos de Transporte", "Gestão de Projetos de Engenharia", "Ética e Legislação para Engenharia", "TCC I", "TCC II"
  ],
  engenharia_eletrica: [
    "Cálculo Diferencial e Integral I", "Cálculo Diferencial e Integral II", "Cálculo Diferencial e Integral III", "Cálculo Diferencial e Integral IV", "Álgebra Linear e Geometria Analítica",
    "Física Geral e Experimental I", "Física Geral e Experimental II", "Física Geral e Experimental III", "Física Geral e Experimental IV", "Química Geral e Tecnológica",
    "Introdução à Engenharia Elétrica", "Desenho Técnico Assistido por Computador", "Algoritmos e Programação de Computadores", "Métodos Numéricos", "Probabilidade e Estatística",
    "Fenômenos de Transporte", "Resistência dos Materiais", "Circuitos Elétricos I", "Circuitos Elétricos II", "Sistemas Digitais I",
    "Sistemas Digitais II", "Eletrônica Analógica I", "Eletrônica Analógica II", "Eletromagnetismo Aplicado", "Conversão de Energia",
    "Máquinas Elétricas I", "Máquinas Elétricas II", "Instalações Elétricas Prediais", "Instalações Elétricas Industriais", "Sistemas de Potência I",
    "Sistemas de Potência II", "Proteção de Sistemas Elétricos", "Controle de Sistemas Lineares I", "Controle de Sistemas Lineares II", "Microprocessadores e Microcontroladores",
    "Eletrônica de Potência", "Acionamentos Elétricos", "Instrumentação Eletrônica", "Transmissão e Distribuição de Energia", "Energias Renováveis",
    "Eficiência Energética", "Automação e Controle Industrial", "Redes de Comunicação Industrial", "Engenharia Econômica", "Administração para Engenheiros",
    "Ética e Legislação Profissional", "Atividades Complementares", "Estágio Supervisionado", "Trabalho de Conclusão de Curso (TCC) I", "Trabalho de Conclusão de Curso (TCC) II"
  ],
  gestao_recursos_humanos: [
    "Rotinas Trabalhistas", "Gestão de Cargos e Salários", "Recrutamento e Seleção", "Treinamento e Desenvolvimento", "Comportamento Organizacional",
    "Legislação Trabalhista e Previdenciária", "Saúde e Segurança no Trabalho", "Gestão de Desempenho", "Cultura e Clima Organizacional", "Psicologia Organizacional",
    "Ética e Relações Humanas no Trabalho", "Gestão por Competências", "Liderança e Motivação", "Responsabilidade Social", "Comunicação Assertiva",
    "Matemática Financeira para RH", "Gestão Estratégica de Pessoas", "Consultoria em RH", "Auditoria de RH", "Planejamento de Carreira",
    "Gestão da Diversidade", "Educação Corporativa", "Sistemas de Informação para RH", "Qualidade de Vida no Trabalho", "Projeto Integrador I",
    "Projeto Integrador II", "Estágio Profissional", "TCC"
  ],
  historia: [
    "História Antiga I", "História Antiga II", "História Medieval I", "História Medieval II", "História Moderna I",
    "História Moderna II", "História Contemporânea I", "História Contemporânea II", "História do Brasil Colônia", "História do Brasil Império",
    "História do Brasil República I", "História do Brasil República II", "Teoria da História I", "Teoria da História II", "Historiografia Geral",
    "Historiografia Brasileira", "Arqueologia", "Antropologia Cultural", "Geografia Humana", "Metodologia do Ensino de História",
    "Prática Profissional: O Arquivo", "Prática Profissional: O Museu", "História da África", "História da América I", "História da América II",
    "Patrimônio e Museologia", "História e Meio Ambiente", "História e Cultura Indígena", "História Regional", "Filosofia Geral",
    "Sociologia Geral", "História da Ásia", "História da Igreja", "Paleografia", "Estágio em Ensino Fundamental", "Estágio em Ensino Médio", "TCC I", "TCC II"
  ],
  letras: [
    "Linguística Geral", "Fonética e Fonologia", "Morfossintaxe da Língua Portuguesa I", "Morfossintaxe da Língua Portuguesa II", "Semântica e Pragmática",
    "Teoria da Literatura I", "Teoria da Literatura II", "Literatura Brasileira I", "Literatura Brasileira II", "Literatura Brasileira III",
    "Literatura Portuguesa I", "Literatura Portuguesa II", "Literatura e Outras Artes", "Produção de Texto I", "Produção de Texto II",
    "Metodologia do Ensino de Língua Portuguesa", "Metodologia do Ensino de Literatura", "Libras", "Latim e Cultura Clássica", "Análise do Discurso",
    "Sociolinguística", "Psicolinguística", "Filologia Românica", "Literatura Infantojuvenil", "Literatura Comparada",
    "Prática de Ensino I", "Prática de Ensino II", "Estágio Supervisionado I", "Estágio Supervisionado II", "TCC I", "TCC II"
  ],
  marketing: [
    "Comportamento do Consumidor", "Pesquisa de Marketing", "Gestão de Marcas (Branding)", "Comunicação Integrada de Marketing", "Marketing Digital I",
    "Marketing Digital II", "Endomarketing", "Marketing de Serviços", "Estratégias de Preço", "Canais de Distribuição",
    "Marketing Estratégico", "Neuromarketing", "Planejamento de Comunicação", "Trade Marketing", "Marketing de Relacionamento",
    "Marketing B2B", "Gestão de Vendas", "Marketing Social e Ambiental", "Marketing Esportivo", "Marketing Político",
    "Matemática para Marketing", "Estatística Aplicada", "Projeto Integrador em Marketing I", "Projeto Integrador em Marketing II", "TCC"
  ],
  pedagogia: [
    "Fundamentos Históricos da Educação", "Fundamentos Filosóficos da Educação", "Psicologia da Educação", "Sociologia da Educação", "Didática: Organização do Trabalho Pedagógico",
    "Políticas Educacionais e Organização da Educação Básica", "Educação e Sociedade", "Psicologia do Desenvolvimento e da Aprendizagem", "Currículo e Avaliação", "Alfabetização e Letramento: Fundamentos e Metodologia",
    "Educação Infantil: Teorias e Práticas", "Metodologia do Ensino de Língua Portuguesa", "Metodologia do Ensino de Matemática", "Metodologia do Ensino de Ciências", "Metodologia do Ensino de História e Geografia",
    "Gestão Escolar e Organização do Trabalho Pedagógico", "Educação de Jovens e Adultos: Fundamentos e Metodologia", "Educação Inclusiva", "Educação Especial", "Libras - Língua Brasileira de Sinais",
    "Tecnologias na Educação", "Pesquisa e Prática Pedagógica I", "Pesquisa e Prática Pedagógica II", "Arte e Ludicidade na Educação", "Literatura Infantil e Juvenil",
    "Filosofia da Educação", "Antropologia da Educação", "Ética e Cidadania", "Linguagem e Argumentação", "Saúde e Primeiros Socorros na Escola",
    "Planejamento Estratégico e Gestão Educacional", "Psicopedagogia Institucional", "Neurociência e Aprendizagem", "Fundamentos da Educação Especial e Inclusiva", "Relações Étnico-Raciais e Educação para a Diversidade",
    "Direitos Humanos e Mediação de Conflitos", "Educação Ambiental e Sustentabilidade", "Jogos, Brinquedos e Brincadeiras no Contexto Escolar", "Ensino Religioso: Fundamentos e Práticas", "Orientação e Supervisão Escolar",
    "Atividades Acadêmicas Complementares (AAC)", "Estágio Supervisionado: Educação Infantil", "Estágio Supervisionado: Anos Iniciais do Ensino Fundamental", "Estágio Supervisionado: Gestão Escolar e Espaços não Escolares",
    "Trabalho de Conclusão de Curso (TCC) I", "Trabalho de Conclusão de Curso (TCC) II"
  ],
  psicologia: [
    "Psicologia Geral", "Teorias e Sistemas em Psicologia", "Anatomia e Fisiologia do Sistema Nervoso", "Processos Psicológicos Básicos I", "Processos Psicológicos Básicos II",
    "Psicologia do Desenvolvimento I", "Psicologia do Desenvolvimento II", "Psicopatologia I", "Psicopatologia II", "Psicologia Social I",
    "Psicologia Social II", "Avaliação Psicológica I", "Avaliação Psicológica II", "Teoria Psicanalítica", "Terapia Cognitivo-Comportamental",
    "Psicologia Humanista-Existencial", "Neuropsicologia", "Psicologia Organizacional e do Trabalho", "Psicologia Hospitalar", "Psicologia Jurídica",
    "Psicologia Escolar e Educacional", "Psicologia do Esporte", "Ética Profissional", "Métodos de Pesquisa em Psicologia", "Estatística Aplicada à Psicologia",
    "Psicofarmacologia", "Transtornos Mentais", "Dinâmica de Grupo", "Estágio Básico I", "Estágio Básico II", "Estágio Específico I", "Estágio Específico II", "TCC I", "TCC II"
  ],
  servico_social: [
    "Fundamentos do Serviço Social I", "Fundamentos do Serviço Social II", "Ética Profissional", "Política Social I", "Política Social II",
    "Sociologia Geral", "Sociologia Brasileira", "Direito e Legislação Social", "Pesquisa Social I", "Pesquisa Social II",
    "Trabalho e Sociabilidade", "Planejamento e Gestão Social", "Serviço Social na Saúde", "Serviço Social e Família", "Serviço Social na Educação",
    "Questão Social e Direitos Humanos", "Assessoria e Consultoria em Serviço Social", "Movimentos Sociais", "Economia Política", "Filosofia",
    "Seguridade Social", "Prática Profissional I", "Prática Profissional II", "Seminários de Prática", "Estágio Curricular I", "Estágio Curricular II", "TCC I", "TCC II"
  ],
  teologia: [
    "Teoria Geral da Religião", "Introdução ao Estudo da Teologia", "História do Cristianismo Antigo", "História do Cristianismo Medieval", "História do Cristianismo Moderno",
    "Teologia Sistemática I", "Teologia Sistemática II", "Exegese Bíblica do Antigo Testamento", "Exegese Bíblica do Novo Testamento", "Hermenêutica Sagrada",
    "Filosofia da Religião", "Sociologia da Religião", "Liderança e Gestão Eclesiástica", "Ética Teológica", "Cultura e Sociedade Contemporânea",
    "Missiologia", "Teologia Pastoral", "Línguas Bíblicas: Grego", "Línguas Bíblicas: Hebraico", "Educação Cristã",
    "Ecumenismo e Diálogo Inter-religioso", "Antropologia Teológica", "Escatologia", "Teologia e Literatura", "Prática Ministerial", "TCC I", "TCC II"
  ]
};

// ------------------------------------------------------------
// BANCO DE DOCENTES E TITULAÇÕES
// ------------------------------------------------------------

const PROFESSORS = [
  "Adriano de Oliveira", "Beatriz Mendonça", "Carlos Eduardo Santos", "Dinamara Pereira Machado", "Edna Marta Oliveira",
  "Felipe Augusto Rocha", "Gisele do Rocio Cordeiro", "Hélio Ferreira Lima", "Isabel Cristina Silva", "João Paulo Mendes",
  "Katia Cristina Soares", "Luis Fernando Lopes", "Maria Thereza David", "Neliva Terezinha Tessaro", "Oscar Alberto Souza",
  "Paulo Henrique Martins", "Queila Regina Oliveira", "Ricardo Almeida Souza", "Simone Ramos de Oliveira", "Tiago de Campos",
  "Ursula Maria Freitas", "Valéria Pilão", "Wagner Roberto Silva", "Xavier de Arantes", "Yuri Gabriel Castro", "Zuleide de Fátima"
];

const TITLES = ["Especialização", "Mestrado", "Mestrado", "Doutorado", "Doutorado"];

// ------------------------------------------------------------
// AUXILIARES
// ------------------------------------------------------------

function getRandomGrade(): string {
  const grade = (Math.random() * 2.5 + 7.5).toFixed(1); // 7.5 a 10.0
  return grade.replace(".", ",");
}

function getResultFromGrade(grade: string): string {
  const val = parseFloat(grade.replace(",", "."));
  if (val >= 7.0) return "APR.MÉDIA";
  if (val >= 5.0) return "APR.EXAME";
  return "APR.RECUP";
}

// ------------------------------------------------------------
// MOTOR DE GERAÇÃO
// ------------------------------------------------------------

export function generateAcademicGrades(
  courseKey: ProfileKey,
  startMonthYear?: string, 
  endMonthYear?: string    
): GradeRow[] {
  const subjects = SUBJECTS_DATABASE[courseKey] || SUBJECTS_DATABASE.historia;
  const rows: GradeRow[] = [];

  // Parsing de datas aprimorado
  const parseMY = (d?: string, fallbackYear = 2021, fallbackMonth = 1) => {
    if (!d) return { y: fallbackYear, m: fallbackMonth };
    
    const clean = d.trim().replace(/\D/g, "");
    
    // Caso MMYYYY ou MYYYY
    if (clean.length === 6) {
      const m = parseInt(clean.slice(0, 2));
      const y = parseInt(clean.slice(2));
      if (y > 1900 && y < 2100) return { y, m };
    }
    
    // Tenta match DD/MM/AAAA ou MM/AAAA
    const match = d.match(/(\d{2})[\/\s](\d{4})|(\d{4})/);
    if (match) {
      if (match[2]) return { y: parseInt(match[2]), m: parseInt(match[1]) };
      if (match[3]) return { y: parseInt(match[3]), m: fallbackMonth };
    }

    if (clean.length === 4) return { y: parseInt(clean), m: fallbackMonth };

    return { y: fallbackYear, m: fallbackMonth };
  };

  const start = parseMY(startMonthYear, 2021, 2);
  let end = parseMY(endMonthYear, start.y + 4, 12);

  // Garantia de cronologia positiva e respeito ao final preenchido
  if (end.y < start.y || (end.y === start.y && end.m < start.m)) {
    end = { y: start.y + 4, m: start.m };
  }

  // Diferença exata em meses
  const totalMonths = (end.y - start.y) * 12 + (end.m - start.m);
  const numSubjects = subjects.length;

  subjects.forEach((subj, idx) => {
    // Interpolação linear: garante que a última disciplina caia EXATAMENTE no mês/ano de conclusão
    const progress = numSubjects > 1 ? idx / (numSubjects - 1) : 0;
    const monthsFromStart = Math.floor(progress * totalMonths);

    const currentYear = start.y + Math.floor((start.m - 1 + monthsFromStart) / 12);
    const currentMonth = ((start.m - 1 + monthsFromStart) % 12) + 1;

    const anoMes = `${currentYear}/${String(currentMonth).padStart(2, "0")}`;
    const grade = getRandomGrade();
    const isActivity = subj.toLowerCase().includes("atividades") || subj.toLowerCase().includes("estágio") || subj.toLowerCase().includes("tcc");

    let ch = "80h";
    if (subj.includes("Complementares")) ch = "200h";
    else if (subj.includes("Estágio")) ch = "100h";
    else if (subj.includes("TCC")) ch = "60h";

    rows.push({
      anoMes,
      disciplina: subj.toUpperCase(),
      ch,
      media: isActivity ? "-" : grade,
      resultado: isActivity ? "CONCLUÍDA" : getResultFromGrade(grade),
      docente: PROFESSORS[idx % PROFESSORS.length],
      titulacao: TITLES[idx % TITLES.length]
    });
  });

  return rows;
}
