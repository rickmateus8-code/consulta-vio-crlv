/**
 * tests/engine/adapters/cnh.test.ts
 *
 * Suíte de testes unitários para o CNHLegacyAdapter (Phase 2B.2).
 * Valida a integração com o normalizador CNH, preservação de paridade 1:1,
 * invariantes de identidade (zero fallback de validationId), ausência de duplicação
 * e prevenção de falsos positivos em supports().
 */

import { cnhLegacyAdapter } from '../../../client/src/lib/engine/adapters/cnhLegacyAdapter';
import { normalizeCNHRenderInput } from '../../../client/src/lib/cnh/normalize';
import type { AdapterContext } from '../../../client/src/lib/engine/adapters/types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log('  ✓ ' + msg);
  } else {
    console.error('  ✗ FAIL: ' + msg);
    throw new Error('Assertion failed: ' + msg);
  }
}

console.log('=== RUNNING CNH LEGACY ADAPTER TEST SUITE ===\n');

// Fixtures
const trustedContextWithVal: AdapterContext = {
  emissionId: '7e2c918f-3d12-4c54-b59a-8fe0d1c3a812',
  validationId: 'VAL-7e2c918f',
  createdAt: '2026-08-14T21:00:00Z',
};

const trustedContextWithoutVal: AdapterContext = {
  emissionId: '7e2c918f-3d12-4c54-b59a-8fe0d1c3a812',
  createdAt: '2026-08-14T21:00:00Z',
};

const canonicalFixture = {
  tipo: 'cnh',
  nome: 'CARLOS SILVA PEREIRA',
  cpf: '123.456.789-00',
  rg: '123456789',
  orgaoEmissor: 'SSP',
  ufRG: 'SP',
  sexo: 'M',
  nacionalidade: 'BRASILEIRO',
  dataNascimento: '15/05/1985',
  localNascimento: 'SAO PAULO',
  ufNascimento: 'SP',
  nomePai: 'JOSE PEREIRA',
  nomeMae: 'MARIA SILVA',
  categoria: 'AB',
  tipo_cnh: 'Definitiva',
  registro: '01234567890',
  espelho: '88776655',
  validade: '15/05/2030',
  dataEmissao: '10/01/2025',
  primeiraHabilitacao: '15/05/2003',
  localEmissao: 'SAO PAULO',
  ufEmissao: 'SP',
  acc: 'NÃO',
  observacoes: 'EAR',
  assDigital1: 'SP12345678',
  assDigital2: 'RENACH0099',
  fotoUrl: 'https://cdn.example.com/foto.jpg',
  assinaturaUrl: 'https://cdn.example.com/ass.jpg',
  fotoScale: 1.1,
  fotoOffsetX: 5,
  fotoOffsetY: -2,
};

const legacyFlatFixture = {
  nome_completo: 'CARLOS SILVA PEREIRA',
  cpf_condutor: '123.456.789-00',
  doc_identidade: '123456789',
  orgao_emissor: 'SSP',
  uf_rg: 'SP',
  nascimento: '1985-05-15',
  local_nascimento: 'SAO PAULO',
  uf_nascimento: 'SP',
  filiacaoPai: 'JOSE PEREIRA',
  filiacaoMae: 'MARIA SILVA',
  categoria_cnh: 'AB',
  nRegistro: '01234567890',
  numeroFormulario: '88776655',
  validade_cnh: '2030-05-15',
  dtEmissao: '2025-01-10',
  primeiraHab: '2003-05-15',
  local: 'SAO PAULO',
  uf_emissao: 'SP',
  obs: 'EAR',
  renach: 'RENACH0099',
  foto: 'https://cdn.example.com/foto.jpg',
  assinatura: 'https://cdn.example.com/ass.jpg',
};

const nestedDataFixture = {
  tipo: 'cnh',
  data: {
    ...legacyFlatFixture,
  },
};

const doubleNestedDataFixture = {
  data: {
    tipo: 'cnh',
    data: {
      ...legacyFlatFixture,
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Adapter Contract Metadata & Supports Strategy
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Adapter Metadata & Supports Strategy ---');

assert(cnhLegacyAdapter.id === 'adapter_cnh_v1', 'Adapter ID é adapter_cnh_v1');
assert(cnhLegacyAdapter.documentType === 'cnh', 'documentType é cnh (não cnhcria)');
assert(cnhLegacyAdapter.version === 1, 'Version é 1');
assert(cnhLegacyAdapter.supports(canonicalFixture) === true, 'supports() aceita payload canônico');
assert(cnhLegacyAdapter.supports(legacyFlatFixture) === true, 'supports() aceita payload legado flat com chaves exclusivas');
assert(cnhLegacyAdapter.supports(nestedDataFixture) === true, 'supports() aceita payload com data.data');
assert(cnhLegacyAdapter.supports(doubleNestedDataFixture) === true, 'supports() aceita payload com duplo aninhamento');

// Prevenção de Falsos Positivos: uma única chave comum NÃO ativa supports
assert(cnhLegacyAdapter.supports({ categoria: 'A' }) === false, 'supports() rejeita { categoria: "A" } isolado para evitar falso positivo');
assert(cnhLegacyAdapter.supports({ registro: '12345' }) === false, 'supports() rejeita { registro: "12345" } isolado');
assert(cnhLegacyAdapter.supports({ validade: '10/10/2030' }) === false, 'supports() rejeita { validade: "..." } isolado');

// Chaves comuns combinadas (>= 2) ou chave exclusiva ativam supports
assert(cnhLegacyAdapter.supports({ categoria: 'A', registro: '123' }) === true, 'supports() aceita combinação de 2 chaves CNH');
assert(cnhLegacyAdapter.supports({ renach: 'SP123456' }) === true, 'supports() aceita chave exclusiva renach');
assert(cnhLegacyAdapter.supports({ categoria_cnh: 'B' }) === true, 'supports() aceita chave exclusiva categoria_cnh');

assert(cnhLegacyAdapter.supports({ random: 'object', without: 'cnh' }) === false, 'supports() rejeita objeto genérico não-CNH');
assert(cnhLegacyAdapter.supports(null) === false, 'supports() rejeita null');
assert(cnhLegacyAdapter.supports('string') === false, 'supports() rejeita string primitiva');

// ─────────────────────────────────────────────────────────────────────────────
// 2. Casos de Ingestão de Dados e Resolução de Aliases
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Data Ingestion & Alias Resolution ---');

// Case 1: Canonical flat
const res1 = cnhLegacyAdapter.adapt(canonicalFixture, trustedContextWithVal);
assert(res1.ok === true, 'Case 1: canonical flat retorna ok: true');
if (res1.ok) {
  assert(res1.data.nome === 'CARLOS SILVA PEREIRA', 'Nome canônico correto');
  assert(res1.data.cpf === '123.456.789-00', 'CPF canônico correto');
  assert(res1.data.categoria === 'AB', 'Categoria canônica correta');
  assert(res1.data.fotoScale === 1.1, 'fotoScale preservado');
  assert(res1.data.docIdentidade === '123456789', 'Alias docIdentidade presente');
  assert(res1.data.nascimento === '15/05/1985', 'Alias nascimento presente');
  assert(res1.mediaRefs === undefined, 'mediaRefs é undefined (não duplica source of truth)');
}

// Case 2: Legacy flat
const res2 = cnhLegacyAdapter.adapt(legacyFlatFixture, trustedContextWithVal);
assert(res2.ok === true, 'Case 2: legacy flat retorna ok: true');
if (res2.ok) {
  assert(res2.data.nome === 'CARLOS SILVA PEREIRA', 'nome_completo mapeado para nome');
  assert(res2.data.cpf === '123.456.789-00', 'cpf_condutor mapeado para cpf');
  assert(res2.data.dataNascimento === '15/05/1985', 'nascimento formatado para DD/MM/YYYY');
  assert(res2.data.registro === '01234567890', 'nRegistro mapeado para registro');
  assert(res2.data.espelho === '88776655', 'numeroFormulario mapeado para espelho');
}

// Case 3: Nested data.data
const res3 = cnhLegacyAdapter.adapt(nestedDataFixture, trustedContextWithVal);
assert(res3.ok === true, 'Case 3: nested data.data retorna ok: true');
if (res3.ok) {
  assert(res3.data.nome === 'CARLOS SILVA PEREIRA', 'Extrai nome de data.data');
  assert(res3.diagnostics.some(d => d.code === 'LEGACY_NESTING_DETECTED'), 'Emite warning para aninhamento');
}

// Case 4: Double nested data.data.data
const res4 = cnhLegacyAdapter.adapt(doubleNestedDataFixture, trustedContextWithVal);
assert(res4.ok === true, 'Case 4: double nested retorna ok: true');
if (res4.ok) {
  assert(res4.data.nome === 'CARLOS SILVA PEREIRA', 'Extrai nome de duplo aninhamento');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Invariantes de Identidade (Mandated Identity Tests)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Identity Segregation & Protection (Cases A, B, C, D) ---');

// CASE A: context com emissionId e validationId explícitos
const resCaseA = cnhLegacyAdapter.adapt(canonicalFixture, trustedContextWithVal);
assert(resCaseA.ok === true, 'Case A: ok: true');
if (resCaseA.ok) {
  assert(resCaseA.identity?.emissionId === trustedContextWithVal.emissionId, 'Case A: emissionId correto');
  assert(resCaseA.identity?.validationId === trustedContextWithVal.validationId, 'Case A: validationId correto');
}

// CASE B: context com emissionId presente e validationId AUSENTE -> validationId deve ser undefined (SEM FALLBACK)
const resCaseB = cnhLegacyAdapter.adapt(canonicalFixture, trustedContextWithoutVal);
assert(resCaseB.ok === true, 'Case B: ok: true');
if (resCaseB.ok) {
  assert(resCaseB.identity?.emissionId === trustedContextWithoutVal.emissionId, 'Case B: emissionId correto');
  assert(resCaseB.identity?.validationId === undefined, 'Case B: validationId é estritamente undefined (NÃO fez fallback para emissionId)');
}

// CASE C: raw contém id, docId, codigoQR, codigo_validacao, cpf, mas context está vazio
const untrustedRawWithIds = {
  ...canonicalFixture,
  id: 'raw-id-attacker',
  docId: 'raw-doc-id-attacker',
  codigoQR: 'raw-qr-attacker',
  codigo_validacao: 'raw-val-attacker',
  cpf: '123.456.789-00',
};
const resCaseC = cnhLegacyAdapter.adapt(untrustedRawWithIds);
assert(resCaseC.ok === true, 'Case C: ok: true');
if (resCaseC.ok) {
  assert(resCaseC.identity === undefined, 'Case C: identity é undefined (nenhum campo bruto vira emissionId nem validationId)');
  assert(resCaseC.data.id === undefined, 'Case C: id não vaza para CanonicalData');
  assert(resCaseC.data.emissionId === undefined, 'Case C: emissionId não vaza para CanonicalData');
}

// CASE D: raw.id diferente de context.emissionId -> context vence, warning emitido
const resCaseD = cnhLegacyAdapter.adapt(untrustedRawWithIds, trustedContextWithVal);
assert(resCaseD.ok === true, 'Case D: ok: true');
if (resCaseD.ok) {
  assert(resCaseD.identity?.emissionId === trustedContextWithVal.emissionId, 'Case D: context.emissionId vence');
  assert(resCaseD.identity?.emissionId !== untrustedRawWithIds.id, 'Case D: raw.id ignorado');
  assert(resCaseD.diagnostics.some(d => d.code === 'RAW_ID_IGNORED'), 'Case D: warning emitido para colisão de ID bruto');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Paridade Exata 1:1 com normalizeCNHRenderInput existente
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. 1:1 Parity Verification vs normalizeCNHRenderInput ---');

const trustedMeta = {
  emissionId: trustedContextWithVal.emissionId!,
  validationId: trustedContextWithVal.validationId,
  createdAt: trustedContextWithVal.createdAt,
};

// Paridade 1: Canonical
const norm1 = normalizeCNHRenderInput(canonicalFixture, trustedMeta);
const adapt1 = cnhLegacyAdapter.adapt(canonicalFixture, trustedContextWithVal);
assert(adapt1.ok === true, 'Parity 1: ok is true');
if (adapt1.ok) {
  assert(JSON.stringify(adapt1.data) === JSON.stringify(norm1.data), 'Paridade 1: canonical fixture gera exatamente o mesmo data');
  assert(adapt1.identity?.emissionId === norm1.identity.emissionId, 'Paridade 1: emissionId idêntico');
  assert(adapt1.identity?.validationId === norm1.identity.validationId, 'Paridade 1: validationId idêntico');
}

// Paridade 2: Legacy Flat
const norm2 = normalizeCNHRenderInput(legacyFlatFixture, trustedMeta);
const adapt2 = cnhLegacyAdapter.adapt(legacyFlatFixture, trustedContextWithVal);
assert(adapt2.ok === true, 'Parity 2: ok is true');
if (adapt2.ok) {
  assert(JSON.stringify(adapt2.data) === JSON.stringify(norm2.data), 'Paridade 2: legacy flat fixture gera exatamente o mesmo data');
}

// Paridade 3: Nested
const norm3 = normalizeCNHRenderInput(nestedDataFixture, trustedMeta);
const adapt3 = cnhLegacyAdapter.adapt(nestedDataFixture, trustedContextWithVal);
assert(adapt3.ok === true, 'Parity 3: ok is true');
if (adapt3.ok) {
  assert(JSON.stringify(adapt3.data) === JSON.stringify(norm3.data), 'Paridade 3: nested fixture gera exatamente o mesmo data');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Error Handling & Strict Mode
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Error Handling & Strict Mode ---');

// Input inválido
const resInvalid = cnhLegacyAdapter.adapt(null as unknown as Record<string, unknown>);
assert(resInvalid.ok === false, 'Input null retorna ok: false');
if (!resInvalid.ok) {
  assert(resInvalid.diagnostics.some(d => d.code === 'INVALID_INPUT_TYPE'), 'Diagnóstico de erro para input nulo');
}

// Strict mode em payload aninhado legado
const resStrict = cnhLegacyAdapter.adapt(nestedDataFixture, trustedContextWithVal, 'strict');
assert(resStrict.ok === false, 'Strict mode rejeita payload aninhado legado');
if (!resStrict.ok) {
  assert(resStrict.diagnostics.some(d => d.code === 'STRICT_MODE_REJECTED_NESTING'), 'Diagnóstico de erro para nesting em strict mode');
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n========================================');
console.log('Resultado: ' + passedTests + ' PASS  |  0 FAIL');
console.log('Total: ' + totalTests + ' testes do CNHLegacyAdapter (Phase 2B.2)');
console.log('========================================\n');
