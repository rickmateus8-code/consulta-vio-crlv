/**
 * Testes unitários — getCNHValidationUrl()
 *
 * Cobre:
 *  - URL canônica com UUID simples
 *  - URL canônica com UUID real no formato RFC-4122
 *  - encodeURIComponent: verifica que UUIDs normais NÃO são alterados
 *  - determinismo (idempotência)
 *  - estrutura da URL: domínio, path, parâmetro
 *  - ausência de outros parâmetros (CPF, senha, etc.)
 *
 * Fixture: IDs e UUIDs fictícios — sem documentos reais.
 *
 * Execute: npx tsx tests/cnh/validation.test.ts
 */

import { getCNHValidationUrl, CNH_VALIDATION_DOMAIN } from "../../client/src/lib/cnh/validation.ts";

// ── Mini runner ───────────────────────────────────────────────────────────────

let passed = 0; let failed = 0;

function assert(label: string, condition: boolean): void {
  if (condition) { console.log(`  PASS  ${label}`); passed++; }
  else           { console.error(`  FAIL  ${label}`); failed++; }
}
function suite(name: string, fn: () => void): void {
  console.log(`\n--- ${name}`);
  fn();
}
function assertEq<T>(label: string, actual: T, expected: T): void {
  const ok = actual === expected;
  if (ok) { console.log(`  PASS  ${label}`); passed++; }
  else     { console.error(`  FAIL  ${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`); failed++; }
}

// ── URL canônica esperada ─────────────────────────────────────────────────────
const BASE = "https://validacao-online-vio.digital";
const CANONICAL_PATH = "/consulta/?id=";

// ── Fixture: UUID fictício ────────────────────────────────────────────────────
const FAKE_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// ══════════════════════════════════════════════════════════════════════════════

suite("V01 — caso simples: id='ABC'", () => {
  const url = getCNHValidationUrl("ABC");
  assertEq("url exata", url, `${BASE}${CANONICAL_PATH}ABC`);
});

suite("V02 — UUID fictício RFC-4122", () => {
  const url = getCNHValidationUrl(FAKE_UUID);
  assertEq("url exata com UUID", url, `${BASE}${CANONICAL_PATH}${FAKE_UUID}`);
});

suite("V03 — estrutura da URL: domínio correto", () => {
  const url = getCNHValidationUrl(FAKE_UUID);
  assert("começa com https://validacao-online-vio.digital", url.startsWith("https://validacao-online-vio.digital"));
});

suite("V04 — estrutura da URL: path /consulta/ presente", () => {
  const url = getCNHValidationUrl(FAKE_UUID);
  assert("contém /consulta/", url.includes("/consulta/"));
});

suite("V05 — estrutura da URL: parâmetro ?id=", () => {
  const url = getCNHValidationUrl(FAKE_UUID);
  assert("contém ?id=", url.includes("?id="));
});

suite("V06 — UUID normal não é alterado pelo encodeURIComponent", () => {
  // UUIDs RFC-4122 contém apenas: [0-9a-f] e hífens — nenhum char especial
  // encodeURIComponent NÃO altera esses caracteres
  const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const url = getCNHValidationUrl(uuid);
  assert("UUID aparece intacto na URL", url.endsWith(uuid));
});

suite("V07 — encodeURIComponent aplicado: char especial '?' é codificado", () => {
  // Confirma que encodeURIComponent está sendo aplicado para inputs com chars especiais
  const id = "abc?foo=bar";
  const url = getCNHValidationUrl(id);
  // "abc?foo=bar" → encodeURIComponent → "abc%3Ffoo%3Dbar"
  assert("? codificado como %3F", url.includes("abc%3Ffoo%3Dbar"));
  assert("? original nao presente na query string como literal", !url.includes("abc?foo=bar"));
});

suite("V08 — determinismo: mesmo input sempre mesmo output", () => {
  const url1 = getCNHValidationUrl(FAKE_UUID);
  const url2 = getCNHValidationUrl(FAKE_UUID);
  const url3 = getCNHValidationUrl(FAKE_UUID);
  assertEq("url1 = url2", url1, url2);
  assertEq("url2 = url3", url2, url3);
});

suite("V09 — domínio canônico NÃO é 'validacao-digital-vio.online' (nome errado legado)", () => {
  const url = getCNHValidationUrl(FAKE_UUID);
  assert("nao usa dominio incorreto",       !url.includes("validacao-digital-vio.online"));
  assert("nao usa dominio sem consulta",    !url.includes("validacao-online-vio.digital/?id="));
  assert("usa dominio correto com /consulta/", url.includes("validacao-online-vio.digital/consulta/"));
});

suite("V10 — URL não contém CPF, senha ou outros parâmetros", () => {
  const url = getCNHValidationUrl(FAKE_UUID);
  assert("sem cpf na url",    !url.includes("cpf="));
  assert("sem senha na url",  !url.includes("senha="));
  assert("sem token na url",  !url.includes("token="));
  assert("sem email na url",  !url.includes("email="));
});

suite("V11 — URL replicada: idêntica à construção manual anterior nos renderers", () => {
  // Construção anterior (CNHDocument.tsx):
  //   const cnhValidationBase = "https://validacao-online-vio.digital";
  //   const qrUrl = `${cnhValidationBase}/consulta/?id=${encodeURIComponent(codigoQrFinal)}`;
  const id = FAKE_UUID;
  const legacyUrl = `https://validacao-online-vio.digital/consulta/?id=${encodeURIComponent(id)}`;
  const newUrl    = getCNHValidationUrl(id);
  assertEq("nova url = url legada", newUrl, legacyUrl);
});

suite("V12 — CNH_VALIDATION_DOMAIN exportado corretamente", () => {
  assertEq("CNH_VALIDATION_DOMAIN", CNH_VALIDATION_DOMAIN, "https://validacao-online-vio.digital");
});

suite("V13 — inputs de ids com diferentes formatos fictícios", () => {
  const inputs = [
    "abc",
    "31c64778-606e-436e-9f9d-287574f23abe",  // UUID fictício do fallback hardcoded
    "TEST-ID-001",
    "00000000-0000-0000-0000-000000000000",
  ];
  for (const id of inputs) {
    const url = getCNHValidationUrl(id);
    assert(`começa com base: ${id.slice(0, 8)}`, url.startsWith(BASE));
    assert(`contém /consulta/: ${id.slice(0, 8)}`, url.includes("/consulta/?id="));
  }
});

suite("V14 — URL com id do fallback hardcoded (UUID usado nos renderers)", () => {
  // O fallback UUID hardcoded no CNHDocument.tsx e CNH3PartDocument.tsx é esse:
  const fallbackId = "31c64778-606e-436e-9f9d-287574f23abe";
  const url = getCNHValidationUrl(fallbackId);
  assertEq(
    "url do fallback correto",
    url,
    `https://validacao-online-vio.digital/consulta/?id=31c64778-606e-436e-9f9d-287574f23abe`
  );
});

// ── Resultado ─────────────────────────────────────────────────────────────────

console.log("\n========================================");
console.log(`Resultado: ${passed} PASS  |  ${failed} FAIL`);
console.log(`Total: ${passed + failed} testes`);
if (failed > 0) process.exit(1);
