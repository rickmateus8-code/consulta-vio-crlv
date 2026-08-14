/**
 * tests/engine/adapters/contracts.test.ts
 *
 * Suíte de testes unitários para a camada de Adapters de Borda (Phase 2B.1).
 * Valida a união discriminada, diagnósticos, envelope de identidade confiável e isolamento.
 */

import {
  createDiagnostic,
  hasAdapterErrors,
  warningsOf,
  errorsOf,
  createAdapterSuccess,
  createAdapterFailure,
  type AdapterDiagnostic,
  type AdapterContext,
  type AdapterResult,
  type LegacyInputAdapter,
  type CanonicalData,
  type EmissionIdentity,
} from '../../../client/src/lib/engine';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${msg}`);
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('=== RUNNING ENGINE V1 ADAPTER CONTRACTS TEST SUITE ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. AdapterSuccess e AdapterFailure (União Discriminada)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Discriminated Union & Success / Failure Semantics ---');

const sampleData: CanonicalData = {
  field_a: 'Valor A',
  field_b: 123,
};

const diagWarn = createDiagnostic('warning', 'DEPRECATED_ALIAS', "Alias 'old_key' foi mapeado para 'field_a'", 'field_a');
const successResult: AdapterResult = createAdapterSuccess(sampleData, {
  diagnostics: [diagWarn],
});

assert(successResult.ok === true, 'AdapterSuccess possui ok === true');
if (successResult.ok) {
  assert(successResult.data.field_a === 'Valor A', 'Data está acessível em AdapterSuccess');
  assert(successResult.diagnostics.length === 1, 'Diagnóstico de warning preservado em AdapterSuccess');
}

const diagErr = createDiagnostic('error', 'CORRUPT_PAYLOAD', 'Payload não pôde ser interpretado');
const failureResult: AdapterResult = createAdapterFailure([diagErr]);

assert(failureResult.ok === false, 'AdapterFailure possui ok === false');
if (!failureResult.ok) {
  assert(failureResult.diagnostics.length === 1, 'Diagnóstico de error preservado em AdapterFailure');
  assert(!('data' in failureResult), 'CanonicalData válida NÃO é exposta em AdapterFailure');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Diagnostics Helpers (warningsOf, errorsOf, hasAdapterErrors)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Diagnostic Helpers Filtering ---');

const diagList: readonly AdapterDiagnostic[] = [
  createDiagnostic('warning', 'WARN_1', 'Aviso 1', 'path.to.field'),
  createDiagnostic('warning', 'WARN_2', 'Aviso 2'),
  createDiagnostic('error', 'ERR_1', 'Erro fatal 1', 'root'),
];

assert(hasAdapterErrors(diagList) === true, 'hasAdapterErrors retorna true quando há erros');
assert(hasAdapterErrors([diagList[0], diagList[1]]) === false, 'hasAdapterErrors retorna false quando há apenas warnings');
assert(warningsOf(diagList).length === 2, 'warningsOf filtra exatamente 2 avisos');
assert(errorsOf(diagList).length === 1, 'errorsOf filtra exatamente 1 erro');
assert(diagList[0].path === 'path.to.field', 'Path é preservado no diagnóstico');

// ─────────────────────────────────────────────────────────────────────────────
// 3. AdapterContext vs Untrusted Raw Payload Identity
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. AdapterContext Trusted Envelope vs Raw Untrusted Data ---');

const untrustedRawInput = {
  id: 'attacker-arbitrary-id',
  docId: 'spoofed-doc-id',
  codigoQR: 'spoofed-qr',
  cpf: '12345678900',
  nome: 'Fulano de Tal',
};

const trustedContext: AdapterContext = {
  emissionId: '7e2c918f-3d12-4c54-b59a-8fe0d1c3a812',
  validationId: 'VALID-998811',
  createdAt: '2026-08-14T21:00:00Z',
};

// Mock de Adapter demonstrando o cumprimento estrito do contrato
const mockAdapter: LegacyInputAdapter<typeof untrustedRawInput> = {
  id: 'adapter_mock_demo',
  documentType: 'demo_doc',
  version: 1,
  supports(input: unknown): input is typeof untrustedRawInput {
    return typeof input === 'object' && input !== null && 'nome' in input;
  },
  adapt(raw, context, mode = 'legacy'): AdapterResult {
    if (!raw || typeof raw !== 'object') {
      return createAdapterFailure([createDiagnostic('error', 'INVALID_INPUT', 'Input must be an object')]);
    }

    // Identidade vem EXCLUSIVAMENTE do context confiável, nunca de raw.id
    const identity: EmissionIdentity | undefined = context?.emissionId
      ? {
          emissionId: context.emissionId,
          validationId: context.validationId,
          createdAt: context.createdAt,
        }
      : undefined;

    const data: CanonicalData = {
      nome: String(raw.nome || ''),
      cpf: String(raw.cpf || ''),
    };

    const diagnostics: AdapterDiagnostic[] = [];
    if ('id' in raw) {
      diagnostics.push(createDiagnostic('warning', 'RAW_ID_IGNORED', "Chave 'id' do payload bruto foi ignorada em favor do contexto confiável"));
    }

    return createAdapterSuccess(data, { identity, diagnostics });
  },
};

assert(mockAdapter.documentType === 'demo_doc', 'Adapter declara documentType semântico');
assert(mockAdapter.supports(untrustedRawInput) === true, 'supports() valida tipo de input');

const adapted = mockAdapter.adapt(untrustedRawInput, trustedContext);
assert(adapted.ok === true, 'Mock adapter concluiu com sucesso');

if (adapted.ok) {
  assert(adapted.identity?.emissionId === '7e2c918f-3d12-4c54-b59a-8fe0d1c3a812', 'emissionId preservou o UUID do contexto confiável');
  assert(adapted.identity?.emissionId !== untrustedRawInput.id, 'raw.id NÃO substituiu emissionId');
  assert(adapted.diagnostics.some(d => d.code === 'RAW_ID_IGNORED'), 'Warning emitido para presença de raw.id');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Invariantes de Borda e Neutralidade do Core
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Generic Invariant Checks ---');

assert(typeof createAdapterSuccess === 'function', 'createAdapterSuccess exportada');
assert(typeof createAdapterFailure === 'function', 'createAdapterFailure exportada');
assert(typeof createDiagnostic === 'function', 'createDiagnostic exportada');

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n========================================`);
console.log(`Resultado: ${passedTests} PASS  |  0 FAIL`);
console.log(`Total: ${totalTests} testes de contratos de Adapters (Phase 2B.1)`);
console.log(`========================================\n`);
