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

export function normalizeConsultaResult(rawData: unknown): ConsultaViewModel {
  const root = (rawData && typeof rawData === 'object' ? rawData : {}) as Record<string, unknown>;
  const perfil = (root.perfil || root.body || root.data || root) as Record<string, unknown>;
  const cpfData = (perfil.cpf_dados || perfil.body || perfil.data || perfil) as Record<string, unknown>;

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

  // Veículos
  const veiculosList: VeiculoItem[] = [];
  const rawVeiculos = safeArray(cpfData.vehicles || cpfData.veiculos || perfil.veiculos);
  for (const v of rawVeiculos) {
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

  // Serasa & Poder Aquisitivo
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

  const totalRecordsFound =
    (nome !== 'Não informado' ? 1 : 0) +
    telefonesList.length +
    enderecosList.length +
    parentesList.length +
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
    isFullyEmpty: totalRecordsFound === 0,
  };
}
