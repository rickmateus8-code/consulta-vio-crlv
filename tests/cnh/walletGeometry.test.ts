/**
 * tests/cnh/walletGeometry.test.ts
 *
 * Testes de contrato do walletGeometry.ts (Fase 2C).
 *
 * Verificações:
 *   1. Dimensões de canvas (source e output) e transform
 *   2. Backgrounds corretos por profile
 *   3. Coordenadas literais auditadas (todos os 25 elementos)
 *   4. Unicidade de element.id no escopo global (FRONT ∪ BACK)
 *   5. Nenhum elemento contém função/callback
 *   6. Modelo declarativo: apenas tipos primitivos nos elementos
 *
 * Fase 2C — Phase 2 Unified Master Render
 */

import {
  WALLET_FRONT_LAYOUT,
  WALLET_BACK_LAYOUT,
  WALLET_FRONT_ELEMENTS,
  WALLET_BACK_ELEMENTS,
  type WalletElement,
  type TextElement,
  type ImageElement,
  type RectElement,
  type ConditionalTextElement,
  type CompositeTextElement,
} from "../../client/src/lib/cnh/walletGeometry";

// ── Utilitários ────────────────────────────────────────────────────────────────

type TestResult = { name: string; pass: boolean; detail?: string };
const results: TestResult[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, pass: true });
  } catch (e: any) {
    results.push({ name, pass: false, detail: String(e?.message ?? e) });
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertEq<T>(actual: T, expected: T, label: string) {
  if (actual !== expected)
    throw new Error(`${label}: esperado ${JSON.stringify(expected)}, obtido ${JSON.stringify(actual)}`);
}

function getEl<T extends WalletElement>(id: string): T {
  const el =
    WALLET_FRONT_ELEMENTS[id] ??
    WALLET_BACK_ELEMENTS[id];
  if (!el) throw new Error(`Elemento "${id}" não encontrado`);
  return el as T;
}

// ── Suite 1: Dimensões de canvas ───────────────────────────────────────────────

test("FRONT sourceWidth = 963", () => assertEq(WALLET_FRONT_LAYOUT.sourceWidth, 963, "FRONT sourceWidth"));
test("FRONT sourceHeight = 680", () => assertEq(WALLET_FRONT_LAYOUT.sourceHeight, 680, "FRONT sourceHeight"));
test("FRONT outputWidth = 680", () => assertEq(WALLET_FRONT_LAYOUT.outputWidth, 680, "FRONT outputWidth"));
test("FRONT outputHeight = 963", () => assertEq(WALLET_FRONT_LAYOUT.outputHeight, 963, "FRONT outputHeight"));

test("BACK sourceWidth = 963", () => assertEq(WALLET_BACK_LAYOUT.sourceWidth, 963, "BACK sourceWidth"));
test("BACK sourceHeight = 680", () => assertEq(WALLET_BACK_LAYOUT.sourceHeight, 680, "BACK sourceHeight"));

// ── Suite 2: Backgrounds ───────────────────────────────────────────────────────

test("FRONT background = parte_superior.jpg", () =>
  assertEq(WALLET_FRONT_LAYOUT.background, "/img/cnh-templates/parte_superior.jpg", "FRONT bg"));
test("BACK background = parte_inferior.jpg", () =>
  assertEq(WALLET_BACK_LAYOUT.background, "/img/cnh-templates/parte_inferior.jpg", "BACK bg"));

// ── Suite 3: Transform comum (Portrait -90°) ──────────────────────────────────

test("FRONT transform.translateX = 0", () =>
  assertEq(WALLET_FRONT_LAYOUT.outputTransform.translateX, 0, "FRONT translateX"));
test("FRONT transform.translateY = 963", () =>
  assertEq(WALLET_FRONT_LAYOUT.outputTransform.translateY, 963, "FRONT translateY"));
test("FRONT transform.rotateRad = -PI/2", () => {
  const r = WALLET_FRONT_LAYOUT.outputTransform.rotateRad;
  const expected = -Math.PI / 2;
  assert(Math.abs(r - expected) < 1e-10, `rotateRad: esperado ${expected}, obtido ${r}`);
});

// ── Suite 4: Coordenadas FRONT (literais auditados) ────────────────────────────

test("front.photoFrame x=177,y=192,w=250,h=335", () => {
  const el = getEl<RectElement>("front.photoFrame");
  assertEq(el.x, 177, "photoFrame.x"); assertEq(el.y, 192, "photoFrame.y");
  assertEq(el.width, 250, "photoFrame.w"); assertEq(el.height, 335, "photoFrame.h");
  assertEq(el.color, "#ffffff", "photoFrame.color");
});

test("front.photo x=177,y=192,w=250,h=335 (com clip)", () => {
  const el = getEl<ImageElement>("front.photo");
  assertEq(el.x, 177, "photo.x"); assertEq(el.y, 192, "photo.y");
  assertEq(el.width, 250, "photo.w"); assertEq(el.height, 335, "photo.h");
  assert(el.clip !== undefined, "photo.clip deve existir");
  assertEq(el.clip!.x, 177, "photo.clip.x");
  assertEq(el.clip!.y, 192, "photo.clip.y");
  assertEq(el.clip!.width, 250, "photo.clip.w");
  assertEq(el.clip!.height, 335, "photo.clip.h");
});

test("front.assinatura x=187,y=580,w=230,h=54", () => {
  const el = getEl<ImageElement>("front.assinatura");
  assertEq(el.x, 187, "ass.x"); assertEq(el.y, 580, "ass.y");
  assertEq(el.width, 230, "ass.w"); assertEq(el.height, 54, "ass.h");
});

test("front.espelho x=80,y=110 font=24px Times", () => {
  const el = getEl<TextElement>("front.espelho");
  assertEq(el.x, 80, "espelho.x"); assertEq(el.y, 110, "espelho.y");
  assertEq(el.font.size, 24, "espelho.fontSize");
  assert(el.font.family.includes("Times New Roman"), "espelho.fontFamily");
  assertEq(el.color, "#000000", "espelho.color");
});

test("front.nome x=400,y=215 font=19px Rawline color=black", () => {
  const el = getEl<TextElement>("front.nome");
  assertEq(el.x, 400, "nome.x"); assertEq(el.y, 215, "nome.y");
  assertEq(el.font.size, 19, "nome.fontSize");
  assertEq(el.color, "#000000", "nome.color");
});

test("front.primeiraHabilitacao x=820,y=215", () => {
  const el = getEl<TextElement>("front.primeiraHabilitacao");
  assertEq(el.x, 820, "primHab.x"); assertEq(el.y, 215, "primHab.y");
});

test("front.nascimento x=460,y=280 joiner=' - '", () => {
  const el = getEl<CompositeTextElement>("front.nascimento");
  assertEq(el.x, 460, "nasc.x"); assertEq(el.y, 280, "nasc.y");
  assertEq(el.joiner, " - ", "nasc.joiner");
});

test("front.dataEmissao x=460,y=345", () => {
  const el = getEl<TextElement>("front.dataEmissao");
  assertEq(el.x, 460, "emissao.x"); assertEq(el.y, 345, "emissao.y");
});

test("front.validade x=630,y=345 color=red", () => {
  const el = getEl<TextElement>("front.validade");
  assertEq(el.x, 630, "validade.x"); assertEq(el.y, 345, "validade.y");
  assertEq(el.color, "#c0392b", "validade.color");
});

test("front.docIdentidade x=460,y=410 joiner=' '", () => {
  const el = getEl<CompositeTextElement>("front.docIdentidade");
  assertEq(el.x, 460, "docId.x"); assertEq(el.y, 410, "docId.y");
  assertEq(el.joiner, " ", "docId.joiner");
});

test("front.cpf x=460,y=475", () => {
  const el = getEl<TextElement>("front.cpf");
  assertEq(el.x, 460, "cpf.x"); assertEq(el.y, 475, "cpf.y");
});

test("front.registro x=660,y=475 color=red", () => {
  const el = getEl<TextElement>("front.registro");
  assertEq(el.x, 660, "reg.x"); assertEq(el.y, 475, "reg.y");
  assertEq(el.color, "#c0392b", "reg.color");
});

test("front.categoria x=860,y=475 color=red", () => {
  const el = getEl<TextElement>("front.categoria");
  assertEq(el.x, 860, "cat.x"); assertEq(el.y, 475, "cat.y");
  assertEq(el.color, "#c0392b", "cat.color");
});

test("front.nacionalidade x=460,y=538", () => {
  const el = getEl<TextElement>("front.nacionalidade");
  assertEq(el.x, 460, "nac.x"); assertEq(el.y, 538, "nac.y");
});

test("front.nomeMae x=460,y=595 font=17px", () => {
  const el = getEl<TextElement>("front.nomeMae");
  assertEq(el.x, 460, "mae.x"); assertEq(el.y, 595, "mae.y");
  assertEq(el.font.size, 17, "mae.fontSize");
});

test("front.nomePai x=460,y=625 font=17px", () => {
  const el = getEl<TextElement>("front.nomePai");
  assertEq(el.x, 460, "pai.x"); assertEq(el.y, 625, "pai.y");
  assertEq(el.font.size, 17, "pai.fontSize");
});

// ── Suite 5: Coordenadas BACK (literais auditados) ────────────────────────────

test("back.espelho x=80,y=110 font=24px Times", () => {
  const el = getEl<TextElement>("back.espelho");
  assertEq(el.x, 80, "b.espelho.x"); assertEq(el.y, 110, "b.espelho.y");
  assertEq(el.font.size, 24, "b.espelho.fontSize");
});

test("back.estadoExtenso x=80,y=400 font=32px Rawline", () => {
  const el = getEl<TextElement>("back.estadoExtenso");
  assertEq(el.x, 80, "estado.x"); assertEq(el.y, 400, "estado.y");
  assertEq(el.font.size, 32, "estado.fontSize");
});

test("back.validadeA x=855,y=232 color=red font=15px", () => {
  const el = getEl<ConditionalTextElement>("back.validadeA");
  assertEq(el.x, 855, "vA.x"); assertEq(el.y, 232, "vA.y");
  assertEq(el.color, "#c0392b", "vA.color");
  assertEq(el.font.size, 15, "vA.fontSize");
  assertEq(el.condition.value, "A", "vA.condition.value");
  assertEq(el.condition.operator, "contains", "vA.condition.operator");
});

test("back.validadeB x=855,y=296", () => {
  const el = getEl<ConditionalTextElement>("back.validadeB");
  assertEq(el.x, 855, "vB.x"); assertEq(el.y, 296, "vB.y");
  assertEq(el.condition.value, "B", "vB.condition");
});

test("back.validadeC x=855,y=360", () => {
  const el = getEl<ConditionalTextElement>("back.validadeC");
  assertEq(el.x, 855, "vC.x"); assertEq(el.y, 360, "vC.y");
  assertEq(el.condition.value, "C", "vC.condition");
});

test("back.validadeD x=855,y=590", () => {
  const el = getEl<ConditionalTextElement>("back.validadeD");
  assertEq(el.x, 855, "vD.x"); assertEq(el.y, 590, "vD.y");
  assertEq(el.condition.value, "D", "vD.condition");
});

test("back.observacoes x=180,y=220 font=18px", () => {
  const el = getEl<TextElement>("back.observacoes");
  assertEq(el.x, 180, "obs.x"); assertEq(el.y, 220, "obs.y");
  assertEq(el.font.size, 18, "obs.fontSize");
});

test("back.localEmissao x=180,y=595", () => {
  const el = getEl<CompositeTextElement>("back.localEmissao");
  assertEq(el.x, 180, "local.x"); assertEq(el.y, 595, "local.y");
});

test("back.assDigital x=330,y=635 font=12px", () => {
  const el = getEl<CompositeTextElement>("back.assDigital");
  assertEq(el.x, 330, "ass.x"); assertEq(el.y, 635, "ass.y");
  assertEq(el.font.size, 12, "ass.fontSize");
});

// ── Suite 6: Unicidade de element.id ──────────────────────────────────────────

test("IDs únicos no escopo FRONT ∪ BACK", () => {
  const allIds = [
    ...WALLET_FRONT_LAYOUT.elements.map(e => e.id),
    ...WALLET_BACK_LAYOUT.elements.map(e => e.id),
  ];
  const unique = new Set(allIds);
  assert(
    unique.size === allIds.length,
    `IDs duplicados detectados: ${allIds.length} total, ${unique.size} únicos`
  );
});

test("FRONT tem 16 elementos", () =>
  assertEq(WALLET_FRONT_LAYOUT.elements.length, 16, "FRONT elements count"));

test("BACK tem 9 elementos", () =>
  assertEq(WALLET_BACK_LAYOUT.elements.length, 9, "BACK elements count"));

// ── Suite 7: Modelo declarativo — sem funções nos elementos ───────────────────

function containsFunction(obj: unknown): boolean {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === "function") return true;
  if (typeof obj !== "object") return false;
  return Object.values(obj as Record<string, unknown>).some(containsFunction);
}

test("Nenhum elemento FRONT contém função/callback", () => {
  for (const el of WALLET_FRONT_LAYOUT.elements) {
    assert(!containsFunction(el), `Elemento "${el.id}" contém uma função`);
  }
});

test("Nenhum elemento BACK contém função/callback", () => {
  for (const el of WALLET_BACK_LAYOUT.elements) {
    assert(!containsFunction(el), `Elemento "${el.id}" contém uma função`);
  }
});

test("Lookup FRONT_ELEMENTS tem 16 entradas", () =>
  assertEq(Object.keys(WALLET_FRONT_ELEMENTS).length, 16, "FRONT_ELEMENTS size"));

test("Lookup BACK_ELEMENTS tem 9 entradas", () =>
  assertEq(Object.keys(WALLET_BACK_ELEMENTS).length, 9, "BACK_ELEMENTS size"));

// ── Suite 8: Tipos dos elementos BACK (conditional_text) ─────────────────────

test("back.validadeA é conditional_text com condition.field='categoria'", () => {
  const el = getEl<ConditionalTextElement>("back.validadeA");
  assertEq(el.kind, "conditional_text", "vA.kind");
  assertEq(el.condition.field, "categoria", "vA.condition.field");
});

// ── Suite 9: rendererHints declarados ─────────────────────────────────────────

test("front.photo rendererHint = 'photo'", () => {
  const el = getEl<ImageElement>("front.photo");
  assertEq(el.rendererHint, "photo", "photo.hint");
});

test("front.assinatura rendererHint = 'cleanSignature'", () => {
  const el = getEl<ImageElement>("front.assinatura");
  assertEq(el.rendererHint, "cleanSignature", "ass.hint");
});

test("front.espelho rendererHint = 'fallbackEspelhoRegistro'", () => {
  const el = getEl<TextElement>("front.espelho");
  assertEq(el.rendererHint, "fallbackEspelhoRegistro", "espelho.hint");
});

test("back.estadoExtenso rendererHint = 'estadoExtenso'", () => {
  const el = getEl<TextElement>("back.estadoExtenso");
  assertEq(el.rendererHint, "estadoExtenso", "estado.hint");
});

// ── Resultado final ───────────────────────────────────────────────────────────

const pass = results.filter(r => r.pass).length;
const fail = results.filter(r => !r.pass).length;

results
  .filter(r => !r.pass)
  .forEach(r => console.error(`  ✗ ${r.name}${r.detail ? `: ${r.detail}` : ""}`));

console.log(`\nResultado: ${pass} PASS  |  ${fail} FAIL`);
if (fail > 0) process.exit(1);
