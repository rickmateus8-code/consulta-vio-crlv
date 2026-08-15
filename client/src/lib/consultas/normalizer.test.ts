/**
 * DocMaster — Testes Unitários de Robustez e Fronteira do Normalizador de Consultas
 * Valida resiliência contra entradas null, undefined, vazias, malformed, parciais e grandes,
 * além do mapeamento estrito e seguro de erros técnicos (mapConsultaError).
 * 100% livre de `any` em todo o escopo de testes e produção.
 */
import { normalizeConsultaResult } from './normalizer';
import { mapConsultaError } from './types';
import { MOCK_BASIC_PERSON, MOCK_EMPTY_PROFILE } from './fixtures/mockProfiles';

export function runNormalizerTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`FAIL: [${testName}] ${detail || ''}`);
    }
  }

  // 1. Entradas Nulas e Indefinidas
  try {
    const resNull = normalizeConsultaResult(null);
    assert(resNull.isFullyEmpty === true, 'null input produces empty ViewModel');
    assert(resNull.nome === 'Não informado', 'null input fallback name');
    assert(resNull.totalRecordsFound === 0, 'null input zero records');
  } catch (e: unknown) {
    assert(false, 'null input throws exception', (e as Error)?.message);
  }

  try {
    const resUndef = normalizeConsultaResult(undefined);
    assert(resUndef.isFullyEmpty === true, 'undefined input produces empty ViewModel');
    assert(resUndef.totalRecordsFound === 0, 'undefined input zero records');
  } catch (e: unknown) {
    assert(false, 'undefined input throws exception', (e as Error)?.message);
  }

  // 2. Objeto Vazio e Primitivos Inesperados
  try {
    const resObj = normalizeConsultaResult({});
    assert(resObj.isFullyEmpty === true, 'empty object produces empty ViewModel');
    assert(resObj.totalRecordsFound === 0, 'empty object zero records');
  } catch (e: unknown) {
    assert(false, 'empty object throws exception', (e as Error)?.message);
  }

  try {
    const resStr = normalizeConsultaResult('string_invalida');
    assert(resStr.isFullyEmpty === true, 'string primitive produces empty ViewModel');
  } catch (e: unknown) {
    assert(false, 'string primitive throws exception', (e as Error)?.message);
  }

  try {
    const resNum = normalizeConsultaResult(12345);
    assert(resNum.isFullyEmpty === true, 'number primitive produces empty ViewModel');
  } catch (e: unknown) {
    assert(false, 'number primitive throws exception', (e as Error)?.message);
  }

  try {
    const resArr = normalizeConsultaResult([1, 2, 3]);
    assert(resArr.isFullyEmpty === true, 'array primitive produces empty ViewModel');
  } catch (e: unknown) {
    assert(false, 'array primitive throws exception', (e as Error)?.message);
  }

  // 3. Resposta Parcial Malformada
  try {
    const malformedPayload = {
      cpf_dados: {
        nome: 'CARLOS TESTE PARCIAL',
        cpf: '111.222.333-44',
        phones: 'telefones_nao_array',
        vacinas: null,
        beneficios: undefined,
        enderecos: [null, { street: 'RUA TESTE', number: '100' }, 123],
      },
    };

    const resMalformed = normalizeConsultaResult(malformedPayload);
    assert(resMalformed.nome === 'CARLOS TESTE PARCIAL', 'partial response parses name');
    assert(resMalformed.cpf === '111.222.333-44', 'partial response parses cpf');
    assert(Array.isArray(resMalformed.telefones), 'malformed phones produces array');
    assert(Array.isArray(resMalformed.vacinas), 'null vacinas produces array');
    assert(Array.isArray(resMalformed.beneficios), 'undefined beneficios produces array');
    assert(resMalformed.enderecos.length === 1, 'malformed address list filters invalid elements safely');
    assert(resMalformed.enderecos[0].logradouro === 'RUA TESTE', 'valid address element parsed');
  } catch (e: unknown) {
    assert(false, 'malformed payload throws exception', (e as Error)?.message);
  }

  // 4. Teste de Não Mutações do Objeto RAW Entrada
  try {
    const rawInput = {
      cpf_dados: {
        nome: 'ANA MUTAÇÃO TESTE',
        cpf: '555.666.777-88',
        phones: [{ numero: '11999998888' }],
      },
      extra_metadata: { source: 'snoop_v2' },
    };
    const stringifiedBefore = JSON.stringify(rawInput);
    normalizeConsultaResult(rawInput);
    const stringifiedAfter = JSON.stringify(rawInput);
    assert(stringifiedBefore === stringifiedAfter, 'raw input is never mutated by normalizer');
  } catch (e: unknown) {
    assert(false, 'raw non-mutation test error', (e as Error)?.message);
  }

  // 5. Teste de Payload Sintético Completo
  try {
    const resFull = normalizeConsultaResult({
      cpf_dados: {
        nome: MOCK_BASIC_PERSON.nome,
        cpf: MOCK_BASIC_PERSON.cpf,
        birth_date: '1990-05-15',
        phones: [{ numero: '(11) 99999-0000', tipo: 'CELULAR' }],
        vacinas: [{ nomeVacina: 'COVID-19', descricaoDose: '1ª DOSE' }],
        beneficios: {
          bolsaFamilia: {
            parcelasRecebidas: [{ valor: '600,00', nisFavorecido: '12345' }],
          },
        },
      },
    });

    assert(resFull.nome === MOCK_BASIC_PERSON.nome, 'synthetic full profile parses name');
    assert(resFull.telefones.length === 1, 'synthetic full profile parses phone');
    assert(resFull.vacinas.length === 1, 'synthetic full profile parses vaccine');
    assert(resFull.beneficios.length === 1, 'synthetic full profile parses benefit');
    assert(resFull.isFullyEmpty === false, 'synthetic full profile is not empty');
  } catch (e: unknown) {
    assert(false, 'synthetic full payload error', (e as Error)?.message);
  }

  // 6. Teste de Resposta Grande (Large Payload)
  try {
    const largePhones = Array.from({ length: 200 }, (_, i) => ({ numero: `1198${1000000 + i}` }));
    const largeAddresses = Array.from({ length: 150 }, (_, i) => ({ street: `RUA ${i}`, number: `${i}` }));

    const resLarge = normalizeConsultaResult({
      cpf_dados: {
        nome: 'PESSOA PAYLOAD GRANDE',
        cpf: '000.111.222-33',
        phones: largePhones,
        all_addresses: largeAddresses,
      },
    });

    assert(resLarge.telefones.length === 200, 'large response parses all 200 phones');
    assert(resLarge.enderecos.length === 150, 'large response parses all 150 addresses');
    assert(resLarge.totalRecordsFound >= 350, 'large response record counter is correct');
  } catch (e: unknown) {
    assert(false, 'large payload test error', (e as Error)?.message);
  }

  // 7. Testes Unitários de Error Mapping (mapConsultaError)
  try {
    const errNull = mapConsultaError(null);
    assert(errNull.type === 'SERVER_ERROR', 'null error produces SERVER_ERROR');

    const errUndef = mapConsultaError(undefined);
    assert(errUndef.type === 'SERVER_ERROR', 'undefined error produces SERVER_ERROR');

    const errLimit = mapConsultaError({ error: 'PLANO_INATIVO' });
    assert(errLimit.type === 'LIMIT_ERROR', 'PLANO_INATIVO produces LIMIT_ERROR');

    const errAuth = mapConsultaError({ error: 'UNAUTHENTICATED' });
    assert(errAuth.type === 'AUTH_ERROR', 'UNAUTHENTICATED produces AUTH_ERROR');

    const errValidation = mapConsultaError({ error: 'VALIDATION_ERROR' });
    assert(errValidation.type === 'VALIDATION_ERROR', 'VALIDATION_ERROR produces VALIDATION_ERROR');

    const errNoResults = mapConsultaError({ error: 'DADOS_NAO_ENCONTRADOS' });
    assert(errNoResults.type === 'NO_RESULTS', 'DADOS_NAO_ENCONTRADOS produces NO_RESULTS');

    const errParse = mapConsultaError({ error: 'PARSE_ERROR' });
    assert(errParse.type === 'INVALID_RESPONSE', 'PARSE_ERROR produces INVALID_RESPONSE');

    const errNetwork = mapConsultaError(new Error('Failed to fetch'));
    assert(errNetwork.type === 'NETWORK_ERROR', 'Failed to fetch produces NETWORK_ERROR');

    const errGeneric = mapConsultaError(new Error('Internal database fault'));
    assert(errGeneric.type === 'SERVER_ERROR', 'Generic unhandled error produces SERVER_ERROR');
    assert(errGeneric.message.includes('Internal database fault'), 'Generic error preserves friendly message');
  } catch (e: unknown) {
    assert(false, 'mapConsultaError tests threw exception', (e as Error)?.message);
  }

  // 8. Teste de Consulta de Operadora Dedicada
  try {
    const resOp = normalizeConsultaResult({
      operadora: 'VIVO',
      portabilidade: true,
      telefone: '(11) 98888-7777',
      ddd: '11',
      uf: 'SP',
    });
    assert(resOp.operadoraData !== undefined, 'operadora payload sets operadoraData');
    assert(resOp.operadoraData?.operadora === 'VIVO', 'operadora name parsed');
    assert(resOp.operadoraData?.portado === 'SIM', 'operadora boolean portabilidade parsed as SIM');
    assert(resOp.operadoraData?.telefone === '(11) 98888-7777', 'operadora phone parsed');
    assert(resOp.isFullyEmpty === false, 'operadora result is not empty');
  } catch (e: unknown) {
    assert(false, 'operadora test error', (e as Error)?.message);
  }

  // 9. Teste de Consulta de Banco Dedicada
  try {
    const resBank = normalizeConsultaResult({
      banco: 'BANCO DO BRASIL S.A.',
      code: '001',
      ispb: '00000000',
      site: 'https://www.bb.com.br',
    });
    assert(resBank.bancoData !== undefined, 'banco payload sets bancoData');
    assert(resBank.bancoData?.nome === 'BANCO DO BRASIL S.A.', 'banco name parsed');
    assert(resBank.bancoData?.codigo === '001', 'banco code parsed');
    assert(resBank.bancoData?.ispb === '00000000', 'banco ispb parsed');
    assert(resBank.bancoData?.site === 'https://www.bb.com.br', 'banco site parsed');
    assert(resBank.isFullyEmpty === false, 'banco result is not empty');
  } catch (e: unknown) {
    assert(false, 'banco test error', (e as Error)?.message);
  }

  // 10. Teste de Consulta de Título Eleitoral Dedicada
  try {
    const resTse = normalizeConsultaResult({
      nome: 'MARIA ELEITORA',
      inscricao: '123456789012',
      secao: '0042',
      zona: '001',
      municipio: 'SAO PAULO',
      uf: 'SP',
    });
    assert(resTse.tituloEleitoralData !== undefined, 'tse payload sets tituloEleitoralData');
    assert(resTse.tituloEleitoralData?.nome === 'MARIA ELEITORA', 'tse elector name parsed');
    assert(resTse.tituloEleitoralData?.inscricao === '123456789012', 'tse registration number parsed');
    assert(resTse.tituloEleitoralData?.secao === '0042', 'tse section parsed');
    assert(resTse.tituloEleitoralData?.zona === '001', 'tse zone parsed');
    assert(resTse.isFullyEmpty === false, 'tse result is not empty');
  } catch (e: unknown) {
    assert(false, 'tse test error', (e as Error)?.message);
  }

  // 11. Teste de Consulta de PIS / PASEP Dedicada
  try {
    const resPis = normalizeConsultaResult({
      nome: 'JOAO TRABALHADOR',
      pis: '123.45678.90-1',
      cpf: '123.456.789-00',
      ctps: '12345/001-SP',
    });
    assert(resPis.pisData !== undefined, 'pis payload sets pisData');
    assert(resPis.pisData?.nome === 'JOAO TRABALHADOR', 'pis worker name parsed');
    assert(resPis.pisData?.pisNum === '123.45678.90-1', 'pis number parsed');
    assert(resPis.pisData?.ctps === '12345/001-SP', 'pis ctps parsed');
    assert(resPis.isFullyEmpty === false, 'pis result is not empty');
  } catch (e: unknown) {
    assert(false, 'pis test error', (e as Error)?.message);
  }

  // 12. Teste de Consulta de Veículo Isolado (Placa)
  try {
    const resVehicle = normalizeConsultaResult({
      placa: 'ABC1234',
      placa_mercosul: 'ABC1D23',
      chassi: '9BWZZZ377VT004251',
      renavam: '12345678901',
      motor: 'EA111-12345',
      marca_modelo: 'VW/GOL 1.0',
      ano_fabricacao: '2015',
      ano_modelo: '2016',
      cor: 'BRANCO',
      combustivel: 'FLEX',
      municipio: 'CAMPINAS',
      uf: 'SP',
      proprietario: {
        nome: 'PEDRO PROPRIETARIO',
        cpf_cnpj: '999.888.777-66',
      },
    });
    assert(resVehicle.singleVehicle !== undefined, 'vehicle payload sets singleVehicle');
    assert(resVehicle.singleVehicle?.placa === 'ABC1234', 'vehicle plate parsed');
    assert(resVehicle.singleVehicle?.placa_mercosul === 'ABC1D23', 'mercosul plate parsed');
    assert(resVehicle.singleVehicle?.chassi === '9BWZZZ377VT004251', 'vehicle chassi parsed');
    assert(resVehicle.singleVehicle?.marca_modelo === 'VW/GOL 1.0', 'vehicle brand/model parsed');
    assert(resVehicle.singleVehicle?.proprietario?.nome === 'PEDRO PROPRIETARIO', 'vehicle owner parsed');
    assert(resVehicle.isFullyEmpty === false, 'vehicle result is not empty');
  } catch (e: unknown) {
    assert(false, 'single vehicle test error', (e as Error)?.message);
  }

  // 13. Teste de Lista de Múltiplas Pessoas / Busca por Nome ou Endereço
  try {
    const resList = normalizeConsultaResult([
      {
        name: 'ANA SILVA',
        cpf: '111.222.333-44',
        mother_name: 'MARIA SILVA',
        birth_date: '1985-02-10',
        uf: 'SP',
      },
      {
        razao_social: 'EMPRESA TESTE LTDA',
        cnpj: '12.345.678/0001-90',
        uf: 'RJ',
      },
    ]);
    assert(resList.personList !== undefined, 'list payload sets personList');
    assert(resList.personList?.length === 2, 'person list length is 2');
    assert(resList.personList?.[0].nome === 'ANA SILVA', 'person 1 name parsed');
    assert(resList.personList?.[0].documentoTipo === 'cpf', 'person 1 is cpf');
    assert(resList.personList?.[0].isSelectable === true, 'person 1 is selectable');
    assert(resList.personList?.[1].nome === 'EMPRESA TESTE LTDA', 'person 2 name parsed');
    assert(resList.personList?.[1].documentoTipo === 'cnpj', 'person 2 is cnpj');
    assert(resList.personList?.[1].isSelectable === true, 'person 2 cnpj is selectable matching legacy itemCpf behavior');
    assert(resList.totalRecordsFound === 2, 'totalRecordsFound reflects list items');
    assert(resList.isFullyEmpty === false, 'person list is not empty');
  } catch (e: unknown) {
    assert(false, 'person list test error', (e as Error)?.message);
  }

  // 14. Teste de Vizinhos e Profissionais no Perfil
  try {
    const resVizinhosProf = normalizeConsultaResult({
      cpf_dados: {
        nome: 'LUCAS VIZINHOS PROFISSIONAIS',
        cpf: '333.444.555-66',
        vizinhos: [
          { nome: 'VIZINHO UM', cpf: '000.111.222-33', vinculo: 'Vizinho Frente' },
        ],
        profissionais: [
          { empresa: 'TECH CORP', cargo: 'ENGENHEIRO', data_admissao: '2020-01-01', renda: '10000' },
        ],
      },
    });
    assert(resVizinhosProf.vizinhos?.length === 1, 'vizinhos list length is 1');
    assert(resVizinhosProf.vizinhos?.[0].nome === 'VIZINHO UM', 'vizinho name parsed');
    assert(resVizinhosProf.profissionais?.length === 1, 'profissionais list length is 1');
    assert(resVizinhosProf.profissionais?.[0].empresa === 'TECH CORP', 'empresa parsed');
    assert(resVizinhosProf.profissionais?.[0].cargo === 'ENGENHEIRO', 'cargo parsed');
  } catch (e: unknown) {
    assert(false, 'vizinhos and profissionais test error', (e as Error)?.message);
  }

  // 15. Teste de Anti-Colisão (Perfil CPF Completo com chaves que coincidem com nomes de branches)
  try {
    const resCollision = normalizeConsultaResult({
      perfil: {
        cpf_dados: {
          nome: 'PERFIL CPF COM CHAVES DE BANCO E OPERADORA',
          cpf: '444.555.666-77',
          operadora: 'CLARO',
          banco: 'ITAU',
          placa: 'XYZ9999',
        },
      },
    });
    assert(resCollision.operadoraData === undefined, 'full CPF profile does not trigger dedicated operadoraData');
    assert(resCollision.bancoData === undefined, 'full CPF profile does not trigger dedicated bancoData');
    assert(resCollision.singleVehicle === undefined, 'full CPF profile does not trigger dedicated singleVehicle');
    assert(resCollision.nome === 'PERFIL CPF COM CHAVES DE BANCO E OPERADORA', 'full CPF profile parses main name correctly');
    assert(resCollision.cpf === '444.555.666-77', 'full CPF profile parses CPF correctly');
  } catch (e: unknown) {
    assert(false, 'anti-collision test error', (e as Error)?.message);
  }

  // 16. Teste de Overlap e Precedência FIRST MATCH WINS (ex: Banco + Título no mesmo payload)
  try {
    const resOverlap = normalizeConsultaResult({
      // Chaves de Banco E chaves de Título no mesmo payload sem perfil
      banco: 'BANCO OVERLAP',
      ispb: '12345678',
      inscricao: '99999999',
      secao: '001',
      zona: '002',
    });
    assert(resOverlap.bancoData !== undefined, 'banco wins precedence over tse');
    assert(resOverlap.bancoData?.nome === 'BANCO OVERLAP', 'banco data populated');
    assert(resOverlap.tituloEleitoralData === undefined, 'tse data is undefined due to first match wins');
    assert(resOverlap.totalRecordsFound === 1, 'overlap does not inflate totalRecordsFound');
  } catch (e: unknown) {
    assert(false, 'overlap regression test error', (e as Error)?.message);
  }

  // 17. Teste de Consistência de totalRecordsFound e isFullyEmpty
  try {
    const resEmpty = normalizeConsultaResult({});
    assert(resEmpty.totalRecordsFound === 0, 'empty payload totalRecordsFound is 0');
    assert(resEmpty.isFullyEmpty === true, 'empty payload isFullyEmpty is true');

    const resSingleOp = normalizeConsultaResult({ operadora: 'TIM', telefone: '1199999999' });
    assert(resSingleOp.totalRecordsFound === 1, 'single specialized totalRecordsFound is 1');
    assert(resSingleOp.isFullyEmpty === false, 'single specialized isFullyEmpty is false');
  } catch (e: unknown) {
    assert(false, 'totalRecordsFound consistency test error', (e as Error)?.message);
  }

  return { passed, failed, errors };
}

// Executar quando chamado diretamente via runner tsx
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('normalizer.test.ts')) {
  const result = runNormalizerTests();
  console.log(`\n=== RESULTADO DOS TESTES UNITÁRIOS DO NORMALIZER & ERROR MAPPING ===`);
  console.log(`Total de Testes: ${result.passed + result.failed}`);
  console.log(`Passaram: ${result.passed}`);
  console.log(`Falharam: ${result.failed}`);
  if (result.errors.length > 0) {
    console.log(`Erros:\n` + result.errors.join('\n'));
    process.exit(1);
  } else {
    console.log(`Todos os ${result.passed} testes passaram com SUCESSO!\n`);
    process.exit(0);
  }
}
