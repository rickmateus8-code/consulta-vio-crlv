/**
 * DocMaster — Normalizador de Resposta de Consultas (RAW -> ViewModel Boundary)
 * Transforma payloads heterogêneos em uma ViewModel unificada e previsível para a UI.
 * 100% livre de `any` — utiliza narrowing seguro em `unknown` e `Record<string, unknown>`.
 */
import type {
  ConsultaViewModel,
  EnderecoItem,
  TelefoneItem,
  ParenteItem,
  VeiculoItem,
  VacinaItem,
  BeneficioItem,
  OperadoraInfo,
  BancoInfo,
  TituloEleitoralInfo,
  PisInfo,
  VehicleProfileData,
  PersonListItem,
  VizinhoItem,
  ProfissionalItem,
} from './types';

function sanitize(val: unknown): string | null {
  if (val === undefined || val === null) return null;
  const str = String(val).trim();
  const upper = str.toUpperCase();
  if (
    upper === '' ||
    upper === 'INVALIDO' ||
    upper === 'INVÁLIDO' ||
    upper === 'NAO CONSTA' ||
    upper === 'NÃO CONSTA' ||
    upper === 'N/A' ||
    upper === 'NULL' ||
    upper === 'UNDEFINED' ||
    upper === '0' ||
    upper === '-'
  ) {
    return null;
  }
  return str;
}

function safeArray<T = unknown>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.body)) return obj.body as T[];
    if (Array.isArray(obj.list)) return obj.list as T[];
    if (Array.isArray(obj.parentes)) return obj.parentes as T[];
    if (Array.isArray(obj.vizinhos)) return obj.vizinhos as T[];
    if (Array.isArray(obj.profissionais)) return obj.profissionais as T[];
  }
  return [];
}

function calculateAge(birthDateStr: string | null): string | null {
  if (!birthDateStr) return null;
  const parts = birthDateStr.split(/[-/]/);
  if (parts.length < 3) return null;
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let day = parseInt(parts[2], 10);
  if (parts[0].length === 2) {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() + 1 - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) age--;
  return age >= 0 && age < 120 ? `${age} anos` : null;
}

function extractOperadora(root: Record<string, unknown>, hasCpfDados: boolean): OperadoraInfo | undefined {
  if (hasCpfDados) return undefined;
  const rawOp = (root.body || root.data || root) as Record<string, unknown>;
  if (!rawOp || typeof rawOp !== 'object') return undefined;

  const isOperadora = !!(rawOp.operadora || rawOp.carrier || rawOp.portabilidade || rawOp.status_operadora);
  if (!isOperadora) return undefined;

  const operadora = sanitize(rawOp.operadora || rawOp.carrier) || 'Não informado';
  const portadoRaw = rawOp.portado ?? rawOp.portabilidade;
  const portado = portadoRaw === true ? 'SIM' : portadoRaw === false ? 'NÃO' : sanitize(portadoRaw) || 'Não informado';
  const telefone = sanitize(rawOp.telefone || rawOp.phone) || 'Não informado';
  const ddd = sanitize(rawOp.ddd) || '';
  const estado = sanitize(rawOp.uf || rawOp.estado) || '';

  return {
    telefone,
    operadora,
    portado,
    ddd,
    estado,
  };
}

function extractBanco(root: Record<string, unknown>, hasCpfDados: boolean): BancoInfo | undefined {
  if (hasCpfDados) return undefined;
  const rawBank = (root.body || root.data || root) as Record<string, unknown>;
  if (!rawBank || typeof rawBank !== 'object') return undefined;

  const isBanco = !!(rawBank.ispb || rawBank.COMPE || rawBank.banco || rawBank.fullName);
  if (!isBanco) return undefined;

  const nome = sanitize(rawBank.name || rawBank.fullName || rawBank.banco || rawBank.NOME) || 'Não informado';
  const codigo = sanitize(rawBank.code || rawBank.COMPE || rawBank.codigo) || 'Não informado';
  const ispb = sanitize(rawBank.ispb) || 'Não informado';
  const site = sanitize(rawBank.site) || undefined;

  return {
    nome,
    codigo,
    ispb,
    site,
  };
}

function extractTituloEleitoral(root: Record<string, unknown>, hasCpfDados: boolean): TituloEleitoralInfo | undefined {
  if (hasCpfDados) return undefined;
  const rawTse = (root.body || root.data || root) as Record<string, unknown>;
  if (!rawTse || typeof rawTse !== 'object') return undefined;

  const isTitulo = !!(rawTse.inscricao || rawTse.secao || rawTse.zona || rawTse.titulo_eleitor || rawTse.TITULO_ELEITOR);
  if (!isTitulo) return undefined;

  const nome = sanitize(rawTse.nome || rawTse.NOME) || 'Não informado';
  const inscricao = sanitize(rawTse.inscricao || rawTse.titulo_eleitor || rawTse.TITULO_ELEITOR) || 'Não informado';
  const secao = sanitize(rawTse.secao) || 'Não informado';
  const zona = sanitize(rawTse.zona) || 'Não informado';
  const municipio = sanitize(rawTse.municipio) || 'Não informado';
  const uf = sanitize(rawTse.uf || rawTse.estado) || '';

  return {
    nome,
    inscricao,
    secao,
    zona,
    municipio,
    uf,
  };
}

function extractPis(root: Record<string, unknown>, hasCpfDados: boolean): PisInfo | undefined {
  if (hasCpfDados) return undefined;
  const rawPis = (root.body || root.data || root) as Record<string, unknown>;
  if (!rawPis || typeof rawPis !== 'object') return undefined;

  const isPIS = !!(rawPis.pis || rawPis.nis || rawPis.nit || rawPis.pasep || rawPis.PIS || rawPis.NIS);
  if (!isPIS) return undefined;

  const nome = sanitize(rawPis.nome || rawPis.NOME) || 'Não informado';
  const pisNum = sanitize(rawPis.pis || rawPis.nis || rawPis.nit || rawPis.pasep || rawPis.PIS || rawPis.NIS) || 'Não informado';
  const cpf = sanitize(rawPis.cpf || rawPis.CPF) || 'Não informado';
  const ctps = sanitize(rawPis.ctps || rawPis.carteira_trabalho) || 'Não informado';

  return {
    nome,
    pisNum,
    cpf,
    ctps,
  };
}

function extractSingleVehicle(root: Record<string, unknown>, hasCpfDados: boolean): VehicleProfileData | undefined {
  if (hasCpfDados) return undefined;
  const rawBody = (root.body || root.data || root) as Record<string, unknown>;
  const bodyPlaca = typeof root.body === 'object' && root.body !== null ? (root.body as Record<string, unknown>).placa : undefined;
  const dataPlaca = typeof root.data === 'object' && root.data !== null ? (root.data as Record<string, unknown>).placa : undefined;

  const isVehicle = !!(root.placa || root.chassi || root.renavam || root.marca_modelo || bodyPlaca || dataPlaca || rawBody.placa || rawBody.chassi);
  if (!isVehicle) return undefined;

  const v = rawBody;
  const prop = typeof v.proprietario === 'object' && v.proprietario !== null ? (v.proprietario as Record<string, unknown>) : undefined;
  const propNome = sanitize(prop?.nome || v.PROPRIETARIO || v.NOME_PROPRIETARIO) || undefined;
  const propCpf = sanitize(prop?.cpf_cnpj || v.CPF_PROPRIETARIO) || undefined;

  return {
    placa: sanitize(v.placa || v.PLACA) || undefined,
    placa_mercosul: sanitize(v.placa_mercosul || v.PLACA_MERCOSUL) || undefined,
    chassi: sanitize(v.chassi || v.CHASSI) || undefined,
    renavam: sanitize(v.renavam || v.RENAVAM) || undefined,
    motor: sanitize(v.motor || v.NUMERO_MOTOR) || undefined,
    restricoes: sanitize(v.restricoes || v.RESTRIÇÃO || v.RESTRIÇÕES) || undefined,
    situacao_veiculo: sanitize(v.situacao_veiculo || v.SITUACAO_VEICULO) || undefined,
    situacao_chassi: sanitize(v.situacao_chassi || v.SITUACAO_CHASSI) || undefined,
    marca_modelo: sanitize(v.marca_modelo || v.MARCA_MODELO || v.modelo) || undefined,
    modelo: sanitize(v.modelo) || undefined,
    ano_fabricacao: sanitize(v.ano_fabricacao || v.ANO_FABRICACAO) || undefined,
    ano_modelo: sanitize(v.ano_modelo || v.ANO_MODELO) || undefined,
    cor: sanitize(v.cor || v.COR) || undefined,
    combustivel: sanitize(v.combustivel || v.COMBUSTIVEL) || undefined,
    municipio: sanitize(v.municipio || v.MUNICIPIO) || undefined,
    uf: sanitize(v.uf || v.UF) || undefined,
    proprietario: propNome || propCpf ? {
      nome: propNome,
      cpf_cnpj: propCpf,
    } : undefined,
  };
}

function extractPersonList(rawData: unknown): PersonListItem[] | undefined {
  if (!rawData) return undefined;
  let items: unknown[] | null = null;
  if (Array.isArray(rawData)) {
    items = rawData;
  } else if (typeof rawData === 'object' && rawData !== null) {
    const obj = rawData as Record<string, unknown>;
    if (Array.isArray(obj.data)) items = obj.data;
    else if (Array.isArray(obj.body)) items = obj.body;
  }
  if (!items || items.length === 0 || typeof items[0] !== 'object' || items[0] === null) {
    return undefined;
  }

  const result: PersonListItem[] = [];
  for (const item of items) {
    if (typeof item === 'object' && item !== null) {
      const it = item as Record<string, unknown>;
      const rawNome = sanitize(it.name || it.nome || it.NOME || it.razao_social) || 'Não informado';
      const rawCpf = sanitize(it.cpf || it.CPF);
      const rawCnpj = sanitize(it.cnpj || it.CNPJ);
      const rawDoc = rawCpf || rawCnpj;

      const documento = rawDoc || 'Não informado';
      const documentoTipo: 'cpf' | 'cnpj' | 'outro' = rawCpf ? 'cpf' : rawCnpj ? 'cnpj' : 'outro';
      const isSelectable = !!rawDoc && rawDoc !== 'Não informado';

      const rawEnd = (typeof it.endereco === 'object' && it.endereco !== null ? it.endereco : {}) as Record<string, unknown>;
      const uf = sanitize(it.uf || it.UF || rawEnd.state || rawEnd.uf) || undefined;
      const mae = sanitize(it.mother_name || it.mae || it.NOME_MAE) || undefined;
      const nascimento = sanitize(it.birth_date || it.nascimento) || undefined;

      result.push({
        nome: rawNome,
        documento,
        documentoTipo,
        mae,
        nascimento,
        uf,
        isSelectable,
      });
    }
  }
  return result.length > 0 ? result : undefined;
}

export function normalizeConsultaResult(rawData: unknown): ConsultaViewModel {
  const root = (rawData && typeof rawData === 'object' ? rawData : {}) as Record<string, unknown>;
  const perfil = (root.perfil || root.body || root.data || root) as Record<string, unknown>;
  const cpfData = (perfil.cpf_dados || perfil.body || perfil.data || perfil) as Record<string, unknown>;
  const hasCpfDados = !!(perfil.cpf_dados || (typeof root.perfil === 'object' && root.perfil !== null && (root.perfil as Record<string, unknown>).cpf_dados));

  // Cascata de Precedência Exata (FIRST MATCH WINS): Operadora -> Banco -> Título -> PIS -> Vehicle -> PersonList -> Profile
  let operadoraData: OperadoraInfo | undefined;
  let bancoData: BancoInfo | undefined;
  let tituloEleitoralData: TituloEleitoralInfo | undefined;
  let pisData: PisInfo | undefined;
  let singleVehicle: VehicleProfileData | undefined;
  let personList: PersonListItem[] | undefined;

  if (!hasCpfDados) {
    operadoraData = extractOperadora(root, false);
    if (!operadoraData) {
      bancoData = extractBanco(root, false);
      if (!bancoData) {
        tituloEleitoralData = extractTituloEleitoral(root, false);
        if (!tituloEleitoralData) {
          pisData = extractPis(root, false);
          if (!pisData) {
            singleVehicle = extractSingleVehicle(root, false);
            if (!singleVehicle) {
              personList = extractPersonList(rawData);
            }
          }
        }
      }
    }
  } else {
    personList = extractPersonList(rawData);
  }

  const nome = sanitize(cpfData.name || cpfData.nome || cpfData.NOME) || 'Não informado';
  const cpf = sanitize(cpfData.cpf || cpfData.CPF || root.cpf) || 'Não informado';
  const nascimento = sanitize(cpfData.birth_date || cpfData.nascimento || cpfData.DATA_NASCIMENTO) || 'Não informado';
  const sexo = sanitize(cpfData.gender || cpfData.sexo || cpfData.SEXO) || undefined;
  const mae = sanitize(cpfData.mother_name || cpfData.mae || cpfData.NOME_MAE) || undefined;
  const pai = sanitize(cpfData.father_name || cpfData.pai || cpfData.NOME_PAI) || undefined;
  const naturalidade = sanitize(cpfData.birth_city || cpfData.naturalidade || cpfData.NATURALIDADE) || undefined;

  const statusReceita = sanitize(cpfData.federal_status) || 'REGULAR';
  const isDeceased =
    cpfData.death_flag === '1' ||
    String(cpfData.death_flag).toLowerCase() === 'sim' ||
    cpfData.death_flag === true ||
    !!cpfData.death_date ||
    statusReceita.toUpperCase().includes('OBITO');
  const isCpfIrregular = statusReceita !== 'REGULAR' && !isDeceased;

  // Telefones
  const telefonesList: TelefoneItem[] = [];
  const rawPhones = [
    ...safeArray(cpfData.phones),
    ...safeArray(cpfData.telefones),
    ...safeArray(cpfData.telefonesHistorico),
    ...(cpfData.telefone ? [cpfData.telefone] : []),
  ];
  const seenPhones = new Set<string>();
  for (const item of rawPhones) {
    let num = '';
    let tipo: string | undefined;
    let fonte: string | undefined;

    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      num = String(obj.numero || obj.telefone || obj.phone || '');
      tipo = sanitize(obj.tipo) || undefined;
      fonte = sanitize(obj.fonte) || undefined;
    } else {
      num = String(item);
    }

    const clean = num.replace(/\D/g, '');
    if (clean && !seenPhones.has(clean)) {
      seenPhones.add(clean);
      telefonesList.push({ numero: num, tipo, fonte });
    }
  }

  // Endereços
  const enderecosList: EnderecoItem[] = [];
  const rawAddresses = [...safeArray(cpfData.all_addresses), ...safeArray(cpfData.enderecos)];
  if (cpfData.address) rawAddresses.unshift(cpfData.address);
  const seenAddresses = new Set<string>();

  for (const item of rawAddresses) {
    if (typeof item === 'object' && item !== null) {
      const a = item as Record<string, unknown>;
      const key = [a.street || a.logradouro, a.number || a.numero, a.city || a.cidade].filter(Boolean).join('|');
      if (key && !seenAddresses.has(key)) {
        seenAddresses.add(key);
        enderecosList.push({
          logradouro: sanitize(a.street || a.logradouro) || undefined,
          numero: sanitize(a.number || a.numero) || undefined,
          bairro: sanitize(a.neighborhood || a.bairro) || undefined,
          cidade: sanitize(a.city || a.cidade) || undefined,
          uf: sanitize(a.state || a.uf) || undefined,
          cep: sanitize(a.zip_code || a.cep) || undefined,
          tipo: sanitize(a.type || a.tipologradouro) || undefined,
        });
      }
    }
  }

  let enderecoPrincipal = 'Não informado';
  if (enderecosList.length > 0) {
    const a = enderecosList[0];
    enderecoPrincipal = [a.tipo, a.logradouro, a.numero, a.bairro, a.cidade, a.uf, a.cep].filter(Boolean).join(', ') || 'Não informado';
  }

  // Parentes
  const parentesList: ParenteItem[] = [];
  const rawParentes = safeArray(cpfData.parentes || perfil.parentes);
  for (const p of rawParentes) {
    if (typeof p === 'object' && p !== null) {
      const pObj = p as Record<string, unknown>;
      const pNome = sanitize(pObj.nome || pObj.NOME);
      if (pNome) {
        parentesList.push({
          nome: pNome,
          cpf: sanitize(pObj.cpf || pObj.CPF) || undefined,
          vinculo: sanitize(pObj.vinculo || pObj.VINCULO) || 'Parente',
        });
      }
    }
  }

  // Vizinhos
  const vizinhosList: VizinhoItem[] = [];
  const rawVizinhos = safeArray(root.vizinhos || perfil.vizinhos || cpfData.vizinhos);
  for (const vz of rawVizinhos) {
    if (typeof vz === 'object' && vz !== null) {
      const vObj = vz as Record<string, unknown>;
      const vNome = sanitize(vObj.nome || vObj.NOME);
      if (vNome) {
        vizinhosList.push({
          nome: vNome,
          cpf: sanitize(vObj.cpf || vObj.CPF) || undefined,
          vinculo: sanitize(vObj.vinculo || vObj.tipo) || undefined,
        });
      }
    }
  }

  // Profissionais
  const profissionaisList: ProfissionalItem[] = [];
  const rawProf = safeArray(root.profissionais || perfil.profissionais || cpfData.profissionais);
  for (const pr of rawProf) {
    if (typeof pr === 'object' && pr !== null) {
      const pObj = pr as Record<string, unknown>;
      const empresa = sanitize(pObj.empresa || pObj.razao_social || pObj.nome_empresa);
      const cargo = sanitize(pObj.cargo || pObj.profissao || pObj.cbo_descricao);
      const dataAdmissao = sanitize(pObj.data_admissao || pObj.admissao);
      const rendaProf = sanitize(pObj.renda || pObj.salario);
      if (empresa || cargo) {
        profissionaisList.push({
          empresa: empresa || undefined,
          cargo: cargo || undefined,
          dataAdmissao: dataAdmissao || undefined,
          renda: rendaProf || undefined,
        });
      }
    }
  }

  // Veículos (coleção no perfil)
  const veiculosList: VeiculoItem[] = [];
  const rawVehicles = safeArray(cpfData.vehicles || cpfData.veiculos || perfil.veiculos);
  for (const v of rawVehicles) {
    if (typeof v === 'object' && v !== null) {
      const vObj = v as Record<string, unknown>;
      veiculosList.push({
        placa: sanitize(vObj.placa || vObj.plate) || undefined,
        modelo: sanitize(vObj.modelo || vObj.model) || undefined,
        marca: sanitize(vObj.marca || vObj.brand) || undefined,
        ano: sanitize(vObj.ano || vObj.year) || undefined,
        cor: sanitize(vObj.cor || vObj.color) || undefined,
      });
    }
  }

  // Vacinas
  const vacinasList: VacinaItem[] = [];
  const rawVacinas = [...safeArray(cpfData.vacinas), ...safeArray(cpfData.vacinasGerais)];
  for (const vac of rawVacinas) {
    if (typeof vac === 'object' && vac !== null) {
      const main = vac as Record<string, unknown>;
      const vObj = (typeof main.vacina === 'object' && main.vacina !== null ? main.vacina : main) as Record<string, unknown>;
      const aObj = (typeof main.aplicacao === 'object' && main.aplicacao !== null ? main.aplicacao : main) as Record<string, unknown>;
      const vNome = sanitize(vObj.nomeVacina || vObj.vacinaNome || vObj.nome);
      if (vNome) {
        vacinasList.push({
          nome: vNome,
          dose: sanitize(main.descricaoDose || aObj.descricaoDose) || 'Imunização',
          fabricante: sanitize(vObj.fabricante || aObj.fabricante) || 'Oficial SUS',
          lote: sanitize(vObj.lote || aObj.lote) || 'Não Informado',
          dataAplicacao: sanitize(aObj.dataAplicacao || main.dataAplicacao) || 'Data N/I',
          local: sanitize(aObj.estabelecimento || aObj.estabAplicacao) || 'Posto de Saúde',
        });
      }
    }
  }

  // Benefícios
  const beneficiosList: BeneficioItem[] = [];
  const benObj = (typeof cpfData.beneficios === 'object' && cpfData.beneficios !== null
    ? cpfData.beneficios
    : typeof perfil.beneficios === 'object' && perfil.beneficios !== null
    ? perfil.beneficios
    : {}) as Record<string, unknown>;

  const bfObj = benObj.bolsaFamilia as Record<string, unknown> | undefined;
  const bfParcelas = safeArray(bfObj?.parcelasRecebidas);
  if (bfParcelas.length > 0) {
    const lastP = (bfParcelas[bfParcelas.length - 1] || {}) as Record<string, unknown>;
    const firstP = (bfParcelas[0] || {}) as Record<string, unknown>;
    beneficiosList.push({
      programa: 'Bolsa Família',
      parcelasCount: bfParcelas.length,
      ultimoValor: sanitize(lastP.valor) || undefined,
      nisFavorecido: sanitize(firstP.nisFavorecido) || undefined,
    });
  }

  const abObj = benObj.auxilioBrasil as Record<string, unknown> | undefined;
  const abParcelas = safeArray(abObj?.parcelasRecebidas);
  if (abParcelas.length > 0) {
    const lastP = (abParcelas[abParcelas.length - 1] || {}) as Record<string, unknown>;
    beneficiosList.push({
      programa: 'Auxílio Brasil',
      parcelasCount: abParcelas.length,
      ultimoValor: sanitize(lastP.valor) || undefined,
    });
  }

  // Serasa Mosaico & Poder Aquisitivo
  const serasaObj = (typeof cpfData.serasaMosaic === 'object' && cpfData.serasaMosaic !== null
    ? cpfData.serasaMosaic
    : typeof perfil.serasaMosaic === 'object' && perfil.serasaMosaic !== null
    ? perfil.serasaMosaic
    : {}) as Record<string, unknown>;

  const poderObj = (typeof cpfData.poderAquisitivo === 'object' && cpfData.poderAquisitivo !== null
    ? cpfData.poderAquisitivo
    : typeof perfil.poderAquisitivo === 'object' && perfil.poderAquisitivo !== null
    ? perfil.poderAquisitivo
    : {}) as Record<string, unknown>;

  // E-mails
  const emailsList: string[] = [];
  const rawEmails = [...safeArray(cpfData.emails), ...(cpfData.email ? [cpfData.email] : [])];
  const seenEmails = new Set<string>();
  for (const em of rawEmails) {
    let eStr = '';
    if (typeof em === 'object' && em !== null) {
      eStr = String((em as Record<string, unknown>).email || '');
    } else {
      eStr = String(em);
    }
    if (eStr && eStr.includes('@') && !seenEmails.has(eStr.toLowerCase())) {
      seenEmails.add(eStr.toLowerCase());
      emailsList.push(eStr);
    }
  }

  const hasSpecializedSingle = !!(operadoraData || bancoData || tituloEleitoralData || pisData || singleVehicle);
  const hasSpecializedData = hasSpecializedSingle || !!(personList && personList.length > 0);

  const totalRecordsFound = personList
    ? personList.length
    : hasSpecializedSingle
    ? 1
    : (nome !== 'Não informado' ? 1 : 0) +
      telefonesList.length +
      enderecosList.length +
      parentesList.length +
      vizinhosList.length +
      profissionaisList.length +
      veiculosList.length +
      vacinasList.length +
      beneficiosList.length +
      emailsList.length;

  let scoreDisplay: string | number | undefined = undefined;
  if (typeof cpfData.score === 'number' || typeof cpfData.score === 'string') {
    scoreDisplay = cpfData.score;
  } else if (typeof cpfData.score === 'object' && cpfData.score !== null) {
    const sObj = cpfData.score as Record<string, unknown>;
    if (typeof sObj.value === 'number' || typeof sObj.value === 'string') {
      scoreDisplay = sObj.value;
    }
  }

  return {
    cpf,
    nome,
    nascimento: nascimento !== 'Não informado' ? nascimento : undefined,
    idadeStr: calculateAge(nascimento !== 'Não informado' ? nascimento : null) || undefined,
    sexo,
    mae,
    pai,
    naturalidade,
    statusReceita,
    rg: sanitize(cpfData.rg || cpfData.RG || cpfData.registro_geral) || undefined,
    cnh: sanitize(cpfData.cnh || cpfData.NUMERO_CNH) || undefined,
    tituloEleitor: sanitize(cpfData.voter_id || cpfData.titulo) || undefined,
    pisNis: sanitize(cpfData.pis || cpfData.PIS) || undefined,
    renda: sanitize(cpfData.income || cpfData.renda) || undefined,
    scoreVal: scoreDisplay,
    profissao: sanitize(cpfData.occupation || cpfData.profissao) || undefined,
    isDeceased,
    isCpfIrregular,
    enderecoPrincipal,
    enderecos: enderecosList,
    telefones: telefonesList,
    parentes: parentesList,
    veiculos: veiculosList,
    vacinas: vacinasList,
    beneficios: beneficiosList,
    serasaMosaic: {
      codMosaic: sanitize(serasaObj.codMosaic),
      descricaoMosaic: sanitize(serasaObj.descricaoMosaic),
      descMosaicSecundario: sanitize(serasaObj.descMosaicSecundario),
    },
    poderAquisitivo: {
      poderAquisitivo: sanitize(poderObj.poderAquisitivo),
      faixaRenda: sanitize(poderObj.faixaRenda),
      rendaEstimada: sanitize(poderObj.renda),
    },
    emails: emailsList,
    fotos: [],
    isCache: !!root.from_cache,
    totalRecordsFound,
    isFullyEmpty: totalRecordsFound === 0 && !hasSpecializedData,
    operadoraData,
    bancoData,
    tituloEleitoralData,
    pisData,
    singleVehicle,
    personList,
    vizinhos: vizinhosList,
    profissionais: profissionaisList,
  };
}
