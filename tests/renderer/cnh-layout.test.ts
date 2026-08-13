/**
 * Testes unitários — Geometry Bridge Fase 1 / cnh-layout endpoint
 *
 * Este arquivo exerce a implementação REAL de validateAndSanitizeBoxes()
 * importada diretamente de functions/api/renderer/cnh-layout.ts.
 * Não há duplicação da lógica de validação.
 *
 * Execute: npx tsx tests/renderer/cnh-layout.test.ts
 *
 * Não usa dados pessoais. Não conecta ao D1 nem à rede.
 */

import {
  validateAndSanitizeBoxes,
  REQUIRED_FIELD_KEYS,
  REQUIRED_TYPE_MAP,
} from '../../functions/api/renderer/cnh-layout.ts';

// ── Helpers de fixture ────────────────────────────────────────────────────────

/** Gera um box mínimo válido para o fieldKey dado. */
function makeBox(fieldKey: string, overrides: Record<string, any> = {}): any {
  const type    = REQUIRED_TYPE_MAP[fieldKey] ?? 'text';
  // fontSize=0 para logo/qrcode (igual ao D1 real); fontSize>0 para text
  const fontSize = type === 'text' ? 8 : 0;
  return {
    id: `t-${fieldKey}`, fieldKey, type,
    x: 100, y: 100, width: 50, height: 10, fontSize,
    textAlign: 'left',
    ...overrides,
  };
}

/** Gera todos os 21 boxes obrigatórios válidos. */
function makeAll21(): any[] {
  return (REQUIRED_FIELD_KEYS as readonly string[]).map(fk => makeBox(fk));
}

// ── Mini runner ───────────────────────────────────────────────────────────────

let passed = 0; let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) { console.log(`  PASS  ${label}`); passed++; }
  else           { console.error(`  FAIL  ${label}`); failed++; }
}
function suite(name: string, fn: () => void): void { console.log(`\n--- ${name}`); fn(); }

// ══════════════════════════════════════════════════════════════════════════════
// T01–T14 — Contratos originais de hardening
// ══════════════════════════════════════════════════════════════════════════════

suite('T01 — 21 validos e unicos → PASS', () => {
  const r = validateAndSanitizeBoxes(makeAll21());
  assert('nao null', r !== null);
  assert('tem 21 boxes', (r?.length ?? 0) >= 21);
});

suite('T02 — falta acc → null (422)', () => {
  assert('null', validateAndSanitizeBoxes(makeAll21().filter(b => b.fieldKey !== 'acc')) === null);
});

suite('T03 — nome duplicado → null (422)', () => {
  assert('null', validateAndSanitizeBoxes([...makeAll21(), makeBox('nome')]) === null);
});

suite('T04 — fotoUrl duplicado → null (422)', () => {
  assert('null', validateAndSanitizeBoxes([...makeAll21(), makeBox('fotoUrl')]) === null);
});

suite('T05 — fotoUrl type=text → null (422)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'fotoUrl' ? { ...b, type: 'text' } : b);
  assert('null', validateAndSanitizeBoxes(boxes) === null);
});

suite('T06 — qrcode_validacao type=logo → null (422)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'qrcode_validacao' ? { ...b, type: 'logo' } : b);
  assert('null', validateAndSanitizeBoxes(boxes) === null);
});

suite('T07 — x=NaN (number NaN) → null (422)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'nome' ? { ...b, x: NaN } : b);
  assert('null por NaN literal', validateAndSanitizeBoxes(boxes) === null);
});

suite('T08 — width=0 → null (422)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'cpf' ? { ...b, width: 0 } : b);
  assert('null', validateAndSanitizeBoxes(boxes) === null);
});

suite('T09 — width negativo → null (422)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'cpf' ? { ...b, width: -5 } : b);
  assert('null', validateAndSanitizeBoxes(boxes) === null);
});

suite('T10 — fontSize=Infinity (number) → null (422)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'registro' ? { ...b, fontSize: Infinity } : b);
  assert('null', validateAndSanitizeBoxes(boxes) === null);
});

suite('T11 — box extra espelho preservado', () => {
  const boxes = [
    ...makeAll21(),
    { id: 'x-1', fieldKey: 'espelho', type: 'text', x: 208, y: 952, width: 50, height: 10, fontSize: 12 },
  ];
  const r = validateAndSanitizeBoxes(boxes);
  assert('nao null', r !== null);
  assert('espelho presente', (r ?? []).some((b: any) => b.fieldKey === 'espelho'));
  assert('total=22', (r?.length ?? 0) === 22);
});

suite('T12 — array vazio / null / undefined → null', () => {
  assert('[] -> null',        validateAndSanitizeBoxes([]) === null);
  assert('null -> null',      validateAndSanitizeBoxes(null as any) === null);
  assert('undefined -> null', validateAndSanitizeBoxes(undefined as any) === null);
});

suite('T13 — assinaturaUrl type=qrcode → null (422)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'assinaturaUrl' ? { ...b, type: 'qrcode' } : b);
  assert('null', validateAndSanitizeBoxes(boxes) === null);
});

suite('T14 — nome sem campo type → null (422)', () => {
  const boxes = makeAll21().map(b => {
    if (b.fieldKey === 'nome') { const { type: _, ...r } = b; return r; }
    return b;
  });
  assert('null', validateAndSanitizeBoxes(boxes) === null);
});

// ══════════════════════════════════════════════════════════════════════════════
// T15–T27 — Coerção Number() / geometria obrigatória por tipo
// ══════════════════════════════════════════════════════════════════════════════

suite('T15 — x = "" (string) → null (sem coercao)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'nome' ? { ...b, x: '' } : b);
  assert('null por x string vazia', validateAndSanitizeBoxes(boxes) === null);
});

suite('T16 — x = "100" (string numerica) → null (sem coercao)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'nome' ? { ...b, x: '100' } : b);
  assert('null por x string numerica', validateAndSanitizeBoxes(boxes) === null);
});

suite('T17 — x = null → null (sem coercao)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'nome' ? { ...b, x: null } : b);
  assert('null por x null', validateAndSanitizeBoxes(boxes) === null);
});

suite('T18 — x = true (boolean) → null (sem coercao)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'cpf' ? { ...b, x: true } : b);
  assert('null por x boolean', validateAndSanitizeBoxes(boxes) === null);
});

suite('T19 — width = "" → null (sem coercao)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'nome' ? { ...b, width: '' } : b);
  assert('null por width string vazia', validateAndSanitizeBoxes(boxes) === null);
});

suite('T20 — fontSize = "" → null (sem coercao, apenas texto)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'nome' ? { ...b, fontSize: '' } : b);
  assert('null por fontSize string vazia em text', validateAndSanitizeBoxes(boxes) === null);
});

suite('T21 — texto sem width → null (geometria obrigatoria)', () => {
  const boxes = makeAll21().map(b => {
    if (b.fieldKey === 'nome') { const { width: _, ...r } = b; return r; }
    return b;
  });
  assert('null por nome sem width', validateAndSanitizeBoxes(boxes) === null);
});

suite('T22 — texto sem height → null (geometria obrigatoria)', () => {
  const boxes = makeAll21().map(b => {
    if (b.fieldKey === 'cpf') { const { height: _, ...r } = b; return r; }
    return b;
  });
  assert('null por cpf sem height', validateAndSanitizeBoxes(boxes) === null);
});

suite('T23 — texto sem fontSize → null (geometria obrigatoria)', () => {
  const boxes = makeAll21().map(b => {
    if (b.fieldKey === 'registro') { const { fontSize: _, ...r } = b; return r; }
    return b;
  });
  assert('null por registro sem fontSize', validateAndSanitizeBoxes(boxes) === null);
});

suite('T24 — fontSize = 0 em texto → null (geometria obrigatoria)', () => {
  const boxes = makeAll21().map(b => b.fieldKey === 'nome' ? { ...b, fontSize: 0 } : b);
  assert('null por fontSize=0 em text', validateAndSanitizeBoxes(boxes) === null);
});

suite('T25 — logo sem width → null (geometria obrigatoria)', () => {
  const boxes = makeAll21().map(b => {
    if (b.fieldKey === 'fotoUrl') { const { width: _, ...r } = b; return r; }
    return b;
  });
  assert('null por fotoUrl sem width', validateAndSanitizeBoxes(boxes) === null);
});

suite('T26 — logo sem height → null (geometria obrigatoria)', () => {
  const boxes = makeAll21().map(b => {
    if (b.fieldKey === 'assinaturaUrl') { const { height: _, ...r } = b; return r; }
    return b;
  });
  assert('null por assinaturaUrl sem height', validateAndSanitizeBoxes(boxes) === null);
});

suite('T27 — QR sem width → null (geometria obrigatoria)', () => {
  const boxes = makeAll21().map(b => {
    if (b.fieldKey === 'qrcode_validacao') { const { width: _, ...r } = b; return r; }
    return b;
  });
  assert('null por qrcode_validacao sem width', validateAndSanitizeBoxes(boxes) === null);
});

// ══════════════════════════════════════════════════════════════════════════════
// T28–T29 — Compatibilidade com D1 real
// ══════════════════════════════════════════════════════════════════════════════

suite('T28 — fontSize=0 em logo → PASS (D1 real: renderer ignora fontSize)', () => {
  // makeBox já gera fontSize=0 para logo — igual ao D1 real
  const boxes = makeAll21();
  const foto  = boxes.find(b => b.fieldKey === 'fotoUrl');
  assert('fotoUrl fontSize=0 aceito', foto?.fontSize === 0 && validateAndSanitizeBoxes(boxes) !== null);
});

suite('T29 — QR com width e height validos → PASS (height nao obrigatorio mas aceito)', () => {
  const boxes = makeAll21().map(b =>
    b.fieldKey === 'qrcode_validacao' ? { ...b, width: 275, height: 275, fontSize: 10 } : b
  );
  assert('nao null (QR com height extra valido)', validateAndSanitizeBoxes(boxes) !== null);
});

// ── Resultado ─────────────────────────────────────────────────────────────────

console.log('\n========================================');
console.log(`Resultado: ${passed} PASS  |  ${failed} FAIL`);
console.log(`Total: ${passed + failed} testes`);
if (failed > 0) process.exit(1);
