/**
 * Testes unitários — gerarMRZ()
 *
 * Cobre:
 *  - caso nominal com dados completos
 *  - datas no formato DD/MM/YYYY
 *  - datas no formato YYYY-MM-DD
 *  - data ausente → "000000"
 *  - nome com acentos e caracteres especiais
 *  - padding de registro (11 chars) e espelho (10 chars)
 *  - sexo ausente → "M"
 *  - nome único (sem sobrenome)
 *  - nome com múltiplos sobrenomes
 *  - estrutura das 3 linhas (comprimento e prefixo)
 *  - REGRESSÃO: output idêntico às implementações legacy
 *
 * Fixture: dados fictícios — sem documentos reais.
 *
 * Execute: npx tsx tests/cnh/mrz.test.ts
 */

import { gerarMRZ } from "../../client/src/lib/cnh/mrz.ts";

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

// ── Implementação legacy inline (para regressão) ──────────────────────────────
// Cópia literal da implementação antiga (CNHDocument.tsx / CNH3PartDocument.tsx).
// Usada para comparar output novo vs legado.

function gerarMRZLegacy(
  nome: string, registro: string, espelho: string,
  dataNascimento: string, sexo: string, validade: string
): string[] {
  const pad = (s: string, l: number) => (s || "UNKNOWN").toUpperCase().replace(/[^A-Z0-9]/g, "<").padEnd(l, "<");
  const fmtData = (d?: string) => {
    if (!d) return "000000";
    const p2 = d.split("/");
    if (p2.length === 3) return `${p2[2].slice(2)}${p2[1]}${p2[0]}`;
    const p3 = d.split("-");
    if (p3.length === 3) return `${p3[0].slice(2)}${p3[1]}${p3[2]}`;
    return "000000";
  };
  const r = (registro || "00000000000").replace(/\D/g, "").padEnd(11, "<").slice(0, 11);
  const e = (espelho  || "0000000000").replace(/\D/g, "").padEnd(10, "<").slice(0, 10);
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  let nomeFormatadoRaw = "";
  if (partes.length > 1) {
    const ultimoSobrenome = partes[partes.length - 1];
    const nomesRestantes  = partes.slice(0, partes.length - 1).join("<");
    nomeFormatadoRaw = `${ultimoSobrenome}<<${nomesRestantes}`;
  } else {
    nomeFormatadoRaw = partes[0] || "DESCONHECIDO";
  }
  const nomeFormatado = pad(nomeFormatadoRaw, 30).substring(0, 30);
  return [
    `I<BRA${r}<${e}<<<`,
    `${fmtData(dataNascimento)}0${sexo ? sexo.charAt(0).toUpperCase() : "M"}${fmtData(validade)}5BRA<<<<<<<<<<<<`,
    nomeFormatado,
  ];
}

// ══════════════════════════════════════════════════════════════════════════════

suite("M01 — estrutura: retorna array de 3 linhas", () => {
  const r = gerarMRZ({ nome: "JOAO SILVA", registro: "01234567891", espelho: "0123456789", dataNascimento: "05/03/1990", sexo: "M", validade: "01/01/2030" });
  assertEq("length = 3", r.length, 3);
  assert("linha[0] nao vazia", r[0].length > 0);
  assert("linha[1] nao vazia", r[1].length > 0);
  assert("linha[2] nao vazia", r[2].length > 0);
});

suite("M02 — linha 1: prefixo I<BRA + registro + espelho", () => {
  const r = gerarMRZ({ nome: "JOAO SILVA", registro: "01234567891", espelho: "0123456789", dataNascimento: "05/03/1990", sexo: "M", validade: "01/01/2030" });
  assert("linha[0] começa com I<BRA", r[0].startsWith("I<BRA"));
  assert("linha[0] contem registro", r[0].includes("01234567891"));
  assert("linha[0] contem espelho",  r[0].includes("0123456789"));
});

suite("M03 — linha 2: formato YYMMDD para data de nascimento DD/MM/YYYY", () => {
  // "05/03/1990" → ano="1990" → slice(2)="90", mes="03", dia="05" → "900305"
  const r = gerarMRZ({ nome: "JOAO SILVA", registro: "01234567891", espelho: "0123456789", dataNascimento: "05/03/1990", sexo: "M", validade: "01/01/2030" });
  assert("linha[1] começa com 900305", r[1].startsWith("900305"));
});

suite("M04 — linha 2: formato YYMMDD para data YYYY-MM-DD", () => {
  // "1990-03-05" → p3[0]="1990" → slice(2)="90", p3[1]="03", p3[2]="05" → "900305"
  const r = gerarMRZ({ nome: "JOAO SILVA", registro: "01234567891", espelho: "0123456789", dataNascimento: "1990-03-05", sexo: "M", validade: "2030-01-01" });
  assert("linha[1] começa com 900305 (YYYY-MM-DD)", r[1].startsWith("900305"));
});

suite("M05 — linha 2: data ausente → 000000", () => {
  const r = gerarMRZ({ nome: "JOAO SILVA", registro: "01234567891", espelho: "0123456789" });
  assert("linha[1] começa com 000000 (sem dataNascimento)", r[1].startsWith("000000"));
});

suite("M06 — linha 2: validade ausente → 000000", () => {
  const r = gerarMRZ({ nome: "JOAO SILVA", registro: "01234567891", espelho: "0123456789", dataNascimento: "05/03/1990", sexo: "M" });
  // linha[1]: "900305"+"0"+"M"+"000000"+"5BRA<<<<<<<<<<<<
  assert("validade ausente = 000000 no meio da linha", r[1].includes("0M0000005BRA"));
});

suite("M07 — linha 2: sexo ausente → M por padrão", () => {
  const r = gerarMRZ({ nome: "JOAO SILVA", registro: "01234567891", espelho: "0123456789", dataNascimento: "05/03/1990" });
  // posição 7 da linha 2: "900305" (6) + "0" (1) = pos 7 → 'M'
  assertEq("sexo ausente = M", r[1].charAt(7), "M");
});

suite("M08 — linha 2: sexo feminino F", () => {
  const r = gerarMRZ({ nome: "MARIA SILVA", registro: "01234567891", espelho: "0123456789", dataNascimento: "01/01/2000", sexo: "f" });
  assertEq("sexo=f → F (uppercase)", r[1].charAt(7), "F");
});

suite("M09 — linha 3: nome com dois nomes (sobrenome<<resto)", () => {
  // "JOAO SILVA" → último sobrenome = "SILVA", resto = "JOAO"
  // → "SILVA<<JOAO" → uppercase → padding com "<"
  const r = gerarMRZ({ nome: "JOAO SILVA", registro: "01234567891", espelho: "0123456789" });
  assert("linha[2] começa com SILVA<<JOAO", r[2].startsWith("SILVA<<JOAO"));
  assertEq("linha[2] tem 30 chars", r[2].length, 30);
});

suite("M10 — linha 3: nome com múltiplos nomes", () => {
  // "JOAO PEDRO DA SILVA" → último = "SILVA", resto = "JOAO<PEDRO<DA"
  const r = gerarMRZ({ nome: "JOAO PEDRO DA SILVA", registro: "01234567891", espelho: "0123456789" });
  assert("começa com SILVA<<JOAO<PEDRO<DA", r[2].startsWith("SILVA<<JOAO<PEDRO<DA"));
  assertEq("30 chars", r[2].length, 30);
});

suite("M11 — linha 3: nome único (sem sobrenome)", () => {
  const r = gerarMRZ({ nome: "JOAO", registro: "01234567891", espelho: "0123456789" });
  assert("nome unico sem << no inicio", r[2].startsWith("JOAO"));
  assertEq("30 chars", r[2].length, 30);
});

suite("M12 — linha 3: nome vazio → DESCONHECIDO", () => {
  const r = gerarMRZ({ nome: "", registro: "01234567891", espelho: "0123456789" });
  assert("nome vazio → DESCONHECIDO", r[2].startsWith("DESCONHECIDO"));
});

suite("M13 — linha 3: acentos e cedilha substituídos por <", () => {
  // "JOÃO DA SILVA" → acento em "JOÃO" → "JO<<O" não → pad() faz toUpperCase().replace(/[^A-Z0-9]/g, "<")
  const r = gerarMRZ({ nome: "JOÃO DA SILVA", registro: "01234567891", espelho: "0123456789" });
  // "SILVA" é sobrenome, "JOAO" (sem acento após replace) → mas o acento fica como "<"
  // pad() converte: J-O-Ã-O → J O < O → "JO<O"
  assert("linha[2] nao contem acento Ã", !r[2].includes("Ã"));
  assertEq("30 chars mesmo com acentos", r[2].length, 30);
});

suite("M14 — registro: padding com < para menos de 11 dígitos", () => {
  const r = gerarMRZ({ nome: "TESTE", registro: "12345", espelho: "0123456789" });
  // "12345" → remove não-dígitos → "12345" → padEnd(11,"<") → "12345<<<<<<"
  assert("registro padded em linha[0]", r[0].includes("12345<<<<<<"));
});

suite("M15 — registro: truncado para 11 chars se maior", () => {
  const r = gerarMRZ({ nome: "TESTE", registro: "123456789012345", espelho: "0123456789" });
  // slice(0,11) → "12345678901"
  assert("registro truncado a 11", r[0].includes("12345678901"));
});

suite("M16 — espelho: padding com < para menos de 10 dígitos", () => {
  const r = gerarMRZ({ nome: "TESTE", registro: "01234567891", espelho: "123" });
  // "123" → padEnd(10,"<") → "123<<<<<<<"
  assert("espelho padded em linha[0]", r[0].includes("123<<<<<<<"));
});

suite("M17 — registro ausente: default 00000000000", () => {
  const r = gerarMRZ({ nome: "TESTE", registro: "", espelho: "0123456789" });
  assert("linha[0] contem 00000000000", r[0].includes("00000000000"));
});

suite("M18 — espelho ausente: default 0000000000", () => {
  const r = gerarMRZ({ nome: "TESTE", registro: "01234567891", espelho: "" });
  assert("linha[0] contem 0000000000<", r[0].includes("0000000000<"));
});

// ── REGRESSÃO: comparação nova função vs legacy ────────────────────────────────

suite("M19 — REGRESSÃO: output idêntico ao legacy — caso nominal", () => {
  const input = { nome: "RICK MATEUS ARRUDA DE FIGUEIREDO", registro: "01234567891", espelho: "0123456789", dataNascimento: "05/03/2003", sexo: "M", validade: "15/09/2026" };
  const novo   = gerarMRZ(input);
  const legado = gerarMRZLegacy(input.nome, input.registro, input.espelho, input.dataNascimento, input.sexo, input.validade);
  assertEq("linha[0] identica", novo[0], legado[0]);
  assertEq("linha[1] identica", novo[1], legado[1]);
  assertEq("linha[2] identica", novo[2], legado[2]);
});

suite("M20 — REGRESSÃO: output idêntico ao legacy — data YYYY-MM-DD", () => {
  const input = { nome: "MARIA JOSE DA SILVA", registro: "98765432101", espelho: "9876543210", dataNascimento: "1985-07-22", sexo: "F", validade: "2028-12-31" };
  const novo   = gerarMRZ(input);
  const legado = gerarMRZLegacy(input.nome, input.registro, input.espelho, input.dataNascimento, input.sexo, input.validade);
  assertEq("linha[0] identica", novo[0], legado[0]);
  assertEq("linha[1] identica", novo[1], legado[1]);
  assertEq("linha[2] identica", novo[2], legado[2]);
});

suite("M21 — REGRESSÃO: output idêntico ao legacy — dados ausentes", () => {
  const novo   = gerarMRZ({ nome: "", registro: "", espelho: "" });
  const legado = gerarMRZLegacy("", "", "", "", "", "");
  assertEq("linha[0] identica (dados ausentes)", novo[0], legado[0]);
  assertEq("linha[1] identica (dados ausentes)", novo[1], legado[1]);
  assertEq("linha[2] identica (dados ausentes)", novo[2], legado[2]);
});

suite("M22 — REGRESSÃO: nome com acento legacy vs novo", () => {
  const input = { nome: "PEDRO ÁLVARES CABRAL", registro: "11122233344", espelho: "1122334455", dataNascimento: "01/04/1968", sexo: "M", validade: "01/04/2030" };
  const novo   = gerarMRZ(input);
  const legado = gerarMRZLegacy(input.nome, input.registro, input.espelho, input.dataNascimento, input.sexo, input.validade);
  assertEq("linha[0] identica", novo[0], legado[0]);
  assertEq("linha[1] identica", novo[1], legado[1]);
  assertEq("linha[2] identica", novo[2], legado[2]);
});

suite("M23 — linha 2: sufixo fixo 5BRA<<<<<<<<<<<<", () => {
  const r = gerarMRZ({ nome: "TESTE", registro: "01234567891", espelho: "0123456789", dataNascimento: "01/01/2000", sexo: "M", validade: "01/01/2030" });
  assert("linha[1] termina com 5BRA<<<<<<<<<<<<", r[1].endsWith("5BRA<<<<<<<<<<<<"));
});

// ── Resultado ─────────────────────────────────────────────────────────────────

console.log("\n========================================");
console.log(`Resultado: ${passed} PASS  |  ${failed} FAIL`);
console.log(`Total: ${passed + failed} testes`);
if (failed > 0) process.exit(1);
