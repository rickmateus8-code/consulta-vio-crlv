/**
 * tests/cnh/printAssets.test.ts
 *
 * Testes da resolução canônica e carregamento resiliente de assets do PRINT_A4 (Phase 2E.2).
 *
 * Cobre:
 *   1. CNH_BASE_TEMPLATE_SOURCES tem o asset canônico como primeira opção
 *   2. CNH_BASE_TEMPLATE_SOURCES mantém fallback legado _300 secundário
 *   3. loadFirstAvailableImage retorna 1ª fonte com sucesso sem consultar as demais
 *   4. loadFirstAvailableImage prossegue para 2ª fonte se 1ª falhar
 *   5. loadFirstAvailableImage retorna null se todas as fontes falharem sem lançar erro
 *
 * Fase 2E.2 — Phase 2 Unified Master Render
 */

import {
  CNH_BASE_TEMPLATE_SOURCES,
  loadFirstAvailableImage,
} from "../../client/src/lib/cnh/printAssets";

// ── Utilitários ────────────────────────────────────────────────────────────────

type TestResult = { name: string; pass: boolean; detail?: string };
const results: TestResult[] = [];

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
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

// ── Runner Principal ──────────────────────────────────────────────────────────

async function run() {
  await test("1. CNH_BASE_TEMPLATE_SOURCES tem o asset canônico como primeira opção", () => {
    assert(CNH_BASE_TEMPLATE_SOURCES.length >= 2, "deve ter pelo menos 2 fontes configuradas");
    assertEq(CNH_BASE_TEMPLATE_SOURCES[0], "/assets/cnh_base_template.png", "primeira fonte DEVE ser a canônica");
  });

  await test("2. CNH_BASE_TEMPLATE_SOURCES mantém fallback legado _300 secundário", () => {
    assert(CNH_BASE_TEMPLATE_SOURCES.includes("/assets/cnh_base_template_300.png"), "fallback _300 mantido");
    assert(CNH_BASE_TEMPLATE_SOURCES.indexOf("/assets/cnh_base_template_300.png") > 0, "_300 DEVE vir após canônica");
  });

  await test("3. loadFirstAvailableImage retorna 1ª fonte com sucesso sem consultar as demais", async () => {
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

  await test("4. loadFirstAvailableImage prossegue para 2ª fonte se 1ª falhar", async () => {
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

  await test("5. loadFirstAvailableImage retorna null se todas as fontes falharem sem lançar erro", async () => {
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
  console.log(`tests/cnh/printAssets.test.ts  —  Phase 2E.2`);
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
}

run();