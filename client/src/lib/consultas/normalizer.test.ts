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
