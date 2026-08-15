/**
 * DocMaster — Synthetic Local Fixtures for Consultas (Development & Offline Testing)
 * All data is 100% anonymized, synthetic, and fictitious.
 */
import type { ConsultaViewModel } from '../types';

export const MOCK_BASIC_PERSON: ConsultaViewModel = {
  cpf: '000.000.000-00',
  nome: 'MARIA SILVA SINTETICA DA CRUZ',
  nascimento: '1990-05-15',
  idadeStr: '34 anos',
  sexo: 'FEMININO',
  mae: 'ANA SILVA SINTETICA',
  pai: 'JOAO SILVA SINTETICO',
  naturalidade: 'SAO PAULO / SP',
  statusReceita: 'REGULAR',
  rg: '00.000.000-0',
  cnh: '00000000000',
  tituloEleitor: '000000000000',
  pisNis: '000.00000.00-0',
  renda: 'R$ 4.500,00',
  scoreVal: 820,
  profissao: 'ANALISTA DE SISTEMAS',
  isDeceased: false,
  isCpfIrregular: false,
  enderecoPrincipal: 'AVENIDA PAULISTA, 1000, APTO 42, BELA VISTA, SAO PAULO - SP, 01310-100',
  enderecos: [
    {
      logradouro: 'AVENIDA PAULISTA',
      numero: '1000',
      bairro: 'BELA VISTA',
      cidade: 'SAO PAULO',
      uf: 'SP',
      cep: '01310-100',
      tipo: 'RUA',
    },
  ],
  telefones: [
    { numero: '(11) 99999-0000', tipo: 'CELULAR', fonte: 'WHATSAPP' },
    { numero: '(11) 3333-0000', tipo: 'FIXO', fonte: 'TELEFONIA' },
  ],
  parentes: [
    { nome: 'PEDRO SILVA SINTETICO', cpf: '111.111.111-11', vinculo: 'IRMAO' },
  ],
  veiculos: [
    { placa: 'ABC-1234', modelo: 'ONIX 1.0', marca: 'CHEVROLET', ano: '2022', cor: 'BRANCO' },
  ],
  vacinas: [
    {
      nome: 'COVID-19 COMIRNATY (PFIZER)',
      dose: '2ª DOSE',
      fabricante: 'PFIZER',
      lote: 'FN0001',
      dataAplicacao: '2021-08-20',
      local: 'UBS BELA VISTA',
    },
  ],
  beneficios: [
    { programa: 'Bolsa Família', parcelasCount: 12, ultimoValor: '600,00', nisFavorecido: '12345678901' },
  ],
  serasaMosaic: {
    codMosaic: 'B02',
    descricaoMosaic: 'CLASSE MEDIA URBANA',
    descMosaicSecundario: 'JOVENS CONECTADOS',
  },
  poderAquisitivo: {
    poderAquisitivo: 'ALTO',
    faixaRenda: 'B2',
    rendaEstimada: '4500.00',
  },
  emails: ['maria.sintetica@exemplo.com.br'],
  fotos: [],
  isCache: false,
  totalRecordsFound: 8,
  isFullyEmpty: false,
};

export const MOCK_EMPTY_PROFILE: ConsultaViewModel = {
  cpf: '999.999.999-99',
  nome: 'Não informado',
  statusReceita: 'REGULAR',
  isDeceased: false,
  isCpfIrregular: false,
  enderecoPrincipal: 'Não informado',
  enderecos: [],
  telefones: [],
  parentes: [],
  veiculos: [],
  vacinas: [],
  beneficios: [],
  serasaMosaic: {},
  poderAquisitivo: {},
  emails: [],
  fotos: [],
  isCache: false,
  totalRecordsFound: 0,
  isFullyEmpty: true,
};
