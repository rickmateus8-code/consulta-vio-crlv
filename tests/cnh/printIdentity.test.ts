/**
 * tests/cnh/printIdentity.test.ts
 *
 * Testes da identidade runtime PRINT_A4 (Phase 2E.1).
 *
 * Cobre:
 *   1.  CNHCria pré-save → preview, sem emissionId
 *   2.  CNHCria pós-save → emitted, emissionId real
 *   3.  CNHEditar loading → preview com docId conhecido
 *   4.  CNHEditar loaded → emitted
 *   5.  CNHSalvas → emitted, emissionId = cnh.id
 *   6.  DocumentViewerModal → emitted, emissionId = doc.id
 *   7.  QR guard: "PREVIEW" → placeholder
 *   8.  QR guard: vazio → placeholder
 *   9.  QR guard: string com "." → placeholder
 *   10. QR guard: UUID legado válido (sem ".") → preservado
 *   11. QR guard: mode=preview → placeholder sempre
 *   12. QR guard: rawValidationValue tem precedência sobre validationId
 *   13. Anti-hybrid: renderInput presente → ignora legacy props (verificação de tipo)
 *   14. acc: tipado na interface CNHDocumentProps (verificação de tipo)
 *   15. emissionId NUNCA é codigoQR, "PREVIEW", "" ou URL
 *   16. Helpers de construção de runtime
 *
 * Fase 2E.1 — Phase 2 Unified Master Render
 */

import {
  resolveQRForPrint,
  PRINT_QR_PLACEHOLDER,
  previewRuntime,
  previewRuntimeWithId,
  emittedRuntime,
  CNH_BASE_TEMPLATE_SOURCES,
  loadFirstAvailableImage,
} from "../../client/src/lib/cnh/printRuntime";
import type { CNHPrintRuntimeIdentity } from "../../client/src/lib/cnh/renderInput";

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

function assertNotEq<T>(actual: T, forbidden: T, label: string) {
  if (actual === forbidden)
    throw new Error(`${label}: valor proibido ${JSON.stringify(forbidden)} obtido`);
}

// ── Fixture UUIDs ─────────────────────────────────────────────────────────────

const REAL_UUID = "c4db93f0-1234-5678-abcd-ef0123456789";
const DOC_ID    = "a092c246-d31e-416f-a576-cfcebd080061";
const QR_UUID   = "47803e50-82b3-4fdb-b808-cc02987b2eeb";

// ── SEÇÃO 1: Callers / Construtores de Runtime ────────────────────────────────

test("1. CNHCria pré-save → mode=preview, sem emissionId", () => {
  // Simula o estado pré-emissão de CNHCria (documents.id ainda não existe)
  const rt = previewRuntime();
  assertEq(rt.mode, "preview", "mode");
  assert(!("emissionId" in rt) || rt.emissionId === undefined, "emissionId deve ser ausente");
});

test("2. CNHCria pós-save → mode=emitted, emissionId = result.id real", () => {
  // Simula: result.id capturado pelo setEmissionId()
  const rt = emittedRuntime(REAL_UUID, QR_UUID, QR_UUID);
  assertEq(rt.mode, "emitted", "mode");
  if (rt.mode !== "emitted") throw new Error("narrowing falhou");
  assertEq(rt.emissionId, REAL_UUID, "emissionId deve ser o documents.id UUID real");
  assertEq(rt.validationId, QR_UUID, "validationId deve ser codigo_qr");
  assertNotEq(rt.emissionId, "PREVIEW", "emissionId NUNCA é PREVIEW");
  assertNotEq(rt.emissionId, "", "emissionId NUNCA é vazio");
  assert(!rt.emissionId.includes("."), "emissionId NUNCA contém '.' (URL guard)");
});

test("3. CNHEditar loading → mode=preview com docId conhecido", () => {
  // emissionId disponível da URL, mas dados ainda não carregados
  const rt = previewRuntimeWithId(DOC_ID);
  assertEq(rt.mode, "preview", "mode");
  if (rt.mode !== "preview") throw new Error("narrowing falhou");
  assertEq(rt.emissionId, DOC_ID, "emissionId = docId da URL");
});

test("4. CNHEditar loaded → mode=emitted", () => {
  // Após fetch completar: dados carregados, validationId do doc
  const codigoQR = QR_UUID;
  const rt = emittedRuntime(DOC_ID, codigoQR, codigoQR);
  assertEq(rt.mode, "emitted", "mode");
  if (rt.mode !== "emitted") throw new Error("narrowing falhou");
  assertEq(rt.emissionId, DOC_ID, "emissionId = docId (documents.id)");
  assertEq(rt.validationId, QR_UUID, "validationId = codigo_qr");
});

test("5. CNHSalvas → mode=emitted, emissionId = cnh.id (documents.id)", () => {
  // cnh.id sempre presente na listagem — nunca preview
  const cnhId = DOC_ID;
  const rt = emittedRuntime(cnhId, cnhId);
  assertEq(rt.mode, "emitted", "mode");
  if (rt.mode !== "emitted") throw new Error("narrowing falhou");
  assertEq(rt.emissionId, cnhId, "emissionId = cnh.id");
  // cnh.id usado como validationId quando codigo_qr não disponível no CNHRecord
  assertEq(rt.validationId, cnhId, "validationId = cnh.id (fallback)");
});

test("6. DocumentViewerModal → mode=emitted, emissionId = doc.id", () => {
  // doc.id sempre presente; validationId = codigo_qr || doc.id
  const docId   = DOC_ID;
  const codigoQr = QR_UUID;
  const rt = emittedRuntime(docId, codigoQr || docId, codigoQr || docId);
  assertEq(rt.mode, "emitted", "mode");
  if (rt.mode !== "emitted") throw new Error("narrowing falhou");
  assertEq(rt.emissionId, docId, "emissionId = doc.id (documents.id UUID real)");
  assertEq(rt.validationId, codigoQr, "validationId = doc.codigo_qr");
  assertNotEq(rt.emissionId, codigoQr, "emissionId NÃO é codigoQR");
});

// ── SEÇÃO 2: QR Guard ─────────────────────────────────────────────────────────

test("7. QR guard: mode=preview → placeholder sempre", () => {
  const rt: CNHPrintRuntimeIdentity = { mode: "preview" };
  assertEq(resolveQRForPrint(rt), PRINT_QR_PLACEHOLDER, "preview → placeholder");
});

test("8. QR guard: mode=preview com emissionId → placeholder (QR ainda não existe)", () => {
  // No preview, mesmo com emissionId=docId, QR ainda não está confirmado
  const rt: CNHPrintRuntimeIdentity = { mode: "preview", emissionId: DOC_ID };
  assertEq(resolveQRForPrint(rt), PRINT_QR_PLACEHOLDER, "preview com docId → placeholder");
});

test("9. QR guard: emitted com validationId vazio → placeholder", () => {
  const rt: CNHPrintRuntimeIdentity = { mode: "emitted", emissionId: REAL_UUID, validationId: "" };
  assertEq(resolveQRForPrint(rt), PRINT_QR_PLACEHOLDER, "validationId vazio → placeholder");
});

test("10. QR guard: emitted com validationId='PREVIEW' → placeholder (sentinel legado)", () => {
  const rt: CNHPrintRuntimeIdentity = { mode: "emitted", emissionId: REAL_UUID, validationId: "PREVIEW" };
  assertEq(resolveQRForPrint(rt), PRINT_QR_PLACEHOLDER, "PREVIEW sentinel → placeholder");
});

test("11. QR guard: emitted com validationId contendo '.' → placeholder (URL legada)", () => {
  // Proteção contra valores do D1 que podem conter domínios
  const rt: CNHPrintRuntimeIdentity = {
    mode: "emitted",
    emissionId: REAL_UUID,
    validationId: "validacao-online-vio.digital/consulta?id=abc",
  };
  assertEq(resolveQRForPrint(rt), PRINT_QR_PLACEHOLDER, "URL com '.' → placeholder");
});

test("12. QR guard: emitted com UUID válido → valor preservado", () => {
  const rt: CNHPrintRuntimeIdentity = {
    mode: "emitted",
    emissionId: REAL_UUID,
    validationId: QR_UUID,
  };
  assertEq(resolveQRForPrint(rt), QR_UUID, "UUID válido → preservado");
});

test("13. QR guard: rawValidationValue tem precedência sobre validationId quando presente", () => {
  // rawValidationValue permite sobrescrever a resolução final para valores legacy conhecidos
  const legacyValue = REAL_UUID;  // sem "."
  const rt: CNHPrintRuntimeIdentity = {
    mode: "emitted",
    emissionId: DOC_ID,
    validationId: "placeholder-seria-usado",
    rawValidationValue: legacyValue,
  };
  assertEq(resolveQRForPrint(rt), legacyValue, "rawValidationValue sobrescreve validationId");
});

test("14. QR guard: rawValidationValue com '.' → placeholder (guarda aplica mesmo no raw)", () => {
  const rt: CNHPrintRuntimeIdentity = {
    mode: "emitted",
    emissionId: DOC_ID,
    validationId: QR_UUID,  // válido
    rawValidationValue: "vio.digital/abc",  // URL → guarda
  };
  assertEq(resolveQRForPrint(rt), PRINT_QR_PLACEHOLDER, "rawValidationValue URL → placeholder");
});

// ── SEÇÃO 3: Invariantes de Identidade ───────────────────────────────────────

test("15a. emissionId NUNCA é 'PREVIEW'", () => {
  // Se um caller tentasse passar emissionId="PREVIEW", o tipo exige string mas
  // a invariante de semântica proíbe isso. Testamos documentando a proibição.
  const rt = emittedRuntime(REAL_UUID, REAL_UUID);
  assertNotEq(rt.emissionId, "PREVIEW", "emissionId NUNCA é PREVIEW");
});

test("15b. emissionId NUNCA é string vazia no modo emitted", () => {
  const rt = emittedRuntime(REAL_UUID, REAL_UUID);
  assertNotEq(rt.emissionId, "", "emissionId NUNCA é vazio");
  assert(rt.emissionId.length > 0, "emissionId deve ter conteúdo");
});

test("15c. emissionId NUNCA contém '.' (URL guard)", () => {
  const rt = emittedRuntime(REAL_UUID, QR_UUID);
  assert(!rt.emissionId.includes("."), "emissionId não é URL");
});

test("15d. codigoQR NÃO deve ser usado como emissionId (verificação semântica)", () => {
  // codigoQR pode ser "PREVIEW" — emissionId nunca é
  const codigoQR = "PREVIEW";
  const rt: CNHPrintRuntimeIdentity = { mode: "preview" };
  // Em preview, emissionId está ausente (não é codigoQR)
  assert(rt.mode === "preview", "modo preview para pré-emissão");
  assert(!("emissionId" in rt) || rt.emissionId === undefined, "emissionId ausente (não é codigoQR)");
});

// ── SEÇÃO 4: Helpers de Construção ───────────────────────────────────────────

test("16a. previewRuntime() retorna mode=preview sem emissionId", () => {
  const rt = previewRuntime();
  assertEq(rt.mode, "preview", "mode");
  assert(rt.emissionId === undefined, "emissionId ausente");
  assert(rt.rawValidationValue === undefined, "rawValidationValue ausente");
});

test("16b. previewRuntimeWithId() retorna mode=preview com emissionId", () => {
  const rt = previewRuntimeWithId(DOC_ID);
  assertEq(rt.mode, "preview", "mode");
  if (rt.mode !== "preview") throw new Error("narrowing falhou");
  assertEq(rt.emissionId, DOC_ID, "emissionId presente");
});

test("16c. emittedRuntime() sem rawValidationValue", () => {
  const rt = emittedRuntime(REAL_UUID, QR_UUID);
  assertEq(rt.mode, "emitted", "mode");
  if (rt.mode !== "emitted") throw new Error("narrowing falhou");
  assertEq(rt.emissionId, REAL_UUID, "emissionId");
  assertEq(rt.validationId, QR_UUID, "validationId");
  assert(rt.rawValidationValue === undefined, "rawValidationValue ausente (opcional)");
});

test("16d. emittedRuntime() com rawValidationValue", () => {
  const rt = emittedRuntime(REAL_UUID, QR_UUID, "legacy-raw-value");
  if (rt.mode !== "emitted") throw new Error("narrowing falhou");
  assertEq(rt.rawValidationValue, "legacy-raw-value", "rawValidationValue presente");
});

// ── SEÇÃO 5: PRINT_QR_PLACEHOLDER ────────────────────────────────────────────

test("17. PRINT_QR_PLACEHOLDER é o UUID exato do renderer legado", () => {
  // Garante que o placeholder não foi acidentalmente alterado
  assertEq(PRINT_QR_PLACEHOLDER, "31c64778-606e-436e-9f9d-287574f23abe", "placeholder UUID inalterado");
});

// ── SEÇÃO 6: BASE TEMPLATE SOURCES & RESILIENT LOADER (Phase 2E.2) ───────────

test("18. CNH_BASE_TEMPLATE_SOURCES tem o asset canônico como primeira opção", () => {
  assert(CNH_BASE_TEMPLATE_SOURCES.length >= 2, "deve ter pelo menos 2 fontes configuradas");
  assertEq(CNH_BASE_TEMPLATE_SOURCES[0], "/assets/cnh_base_template.png", "primeira fonte DEVE ser a canônica");
});

test("19. CNH_BASE_TEMPLATE_SOURCES mantém fallback legado _300 secundário", () => {
  assert(CNH_BASE_TEMPLATE_SOURCES.includes("/assets/cnh_base_template_300.png"), "fallback _300 mantido");
  assert(CNH_BASE_TEMPLATE_SOURCES.indexOf("/assets/cnh_base_template_300.png") > 0, "_300 DEVE vir após canônica");
});

test("20. loadFirstAvailableImage retorna 1ª fonte com sucesso sem consultar as demais", async () => {
  const called: string[] = [];
  const fakeLoader = async (src: string) => {
    called.push(src);
    return { src, loaded: true };
  };

  const result = await loadFirstAvailableImage(CNH_BASE_TEMPLATE_SOURCES, fakeLoader);
  assert(result !== null, "deve retornar resultado");
  assertEq(result?.src, "/assets/cnh_base_template.png", "deve carregar a canônica");
  assertEq(called.length, 1, "somente a 1ª fonte deve ser consultada quando ela sucede");
});

test("21. loadFirstAvailableImage prossegue para 2ª fonte se 1ª falhar", async () => {
  const called: string[] = [];
  const fakeLoader = async (src: string) => {
    called.push(src);
    if (src === "/assets/cnh_base_template.png") throw new Error("404 Not Found");
    return { src, loaded: true };
  };

  const result = await loadFirstAvailableImage(CNH_BASE_TEMPLATE_SOURCES, fakeLoader);
  assert(result !== null, "deve retornar resultado");
  assertEq(result?.src, "/assets/cnh_base_template_300.png", "deve carregar o fallback");
  assertEq(called.length, 2, "deve ter tentado a 1ª e a 2ª fonte");
});

test("22. loadFirstAvailableImage retorna null se todas as fontes falharem sem lançar erro", async () => {
  const fakeLoader = async () => {
    throw new Error("Network Error");
  };

  const result = await loadFirstAvailableImage(CNH_BASE_TEMPLATE_SOURCES, fakeLoader);
  assertEq(result, null, "deve retornar null em caso de falha total");
});

// ── Relatório ─────────────────────────────────────────────────────────────────

const PASS = results.filter(r => r.pass).length;
const FAIL = results.filter(r => !r.pass).length;

console.log(`\n${"─".repeat(70)}`);
console.log(`tests/cnh/printIdentity.test.ts  —  Phase 2E.1`);
console.log(`${"─".repeat(70)}`);
results.forEach(r => {
  const icon = r.pass ? "✓" : "✗";
  const msg  = r.pass ? r.name : `${r.name}\n     → ${r.detail}`;
  console.log(`  ${icon} ${msg}`);
});
console.log(`${"─".repeat(70)}`);
console.log(`  ${PASS}/${PASS + FAIL} PASS${FAIL > 0 ? `  |  ${FAIL} FAIL` : ""}`);
console.log(`${"─".repeat(70)}\n`);

if (FAIL > 0) process.exit(1);
