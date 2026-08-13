/**
 * Testes unitários — normalizeCNHRenderInput()
 *
 * Cobre:
 *  - emissão com UUID válido
 *  - validationId = emissionId para CNH
 *  - aliases antigos e atuais com precedência documentada
 *  - campos opcionais (foto, assinatura, offsets)
 *  - normalização de datas (DD/MM/YYYY, YYYY-MM-DD, YYYY/MM/DD)
 *  - categorias em uppercase
 *  - ausência de senha no output
 *  - determinismo: mesmo input → mesmo output
 *  - payload com aninhamento duplo (legado)
 *
 * Não usa dados pessoais reais.
 *
 * Execute: npx tsx tests/cnh/normalize.test.ts
 */

import { normalizeCNHRenderInput } from "../../client/src/lib/cnh/normalize.ts";
import type { CNHRenderInput } from "../../client/src/lib/cnh/renderInput.ts";

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

// ── Fixture base com todos os campos canônicos ────────────────────────────────

const EMISSION_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function baseFlat(): Record<string, any> {
  return {
    nome:              "JOAO DA SILVA",
    cpf:               "12345678901",
    rg:                "1234567",
    orgaoEmissor:      "SSP",
    ufRG:              "SP",
    sexo:              "m",
    nacionalidade:     "brasileira",
    dataNascimento:    "01/01/1990",
    localNascimento:   "SAO PAULO",
    ufNascimento:      "sp",
    nomePai:           "JOSE DA SILVA",
    nomeMae:           "MARIA DA SILVA",
    categoria:         "b",
    tipo:              "Definitiva",
    registro:          "12345678901",
    espelho:           "9876543210",
    validade:          "01/01/2030",
    dataEmissao:       "01/01/2020",
    primeiraHabilitacao: "01/01/2015",
    localEmissao:      "SAO PAULO",
    ufEmissao:         "sp",
    acc:               "D",
    observacoes:       "EAR",
    assDigital1:       "111111111",
    assDigital2:       "222222222",
    fotoUrl:           "data:image/jpeg;base64,FAKE",
    assinaturaUrl:     "data:image/png;base64,FAKE",
    fotoScale:         1.2,
    fotoOffsetX:       5,
    fotoOffsetY:       -3,
    assScale:          0.9,
    assOffsetX:        0,
    assOffsetY:        0,
  };
}

const META = { emissionId: EMISSION_UUID };

// ══════════════════════════════════════════════════════════════════════════════

suite("T01 — emissionId e validationId preenchidos", () => {
  const r = normalizeCNHRenderInput(baseFlat(), META);
  assertEq("emissionId = UUID", r.identity.emissionId, EMISSION_UUID);
  assertEq("validationId = emissionId (CNH)", r.identity.validationId, EMISSION_UUID);
  assert("createdAt undefined quando nao fornecido", r.identity.createdAt === undefined);
});

suite("T02 — createdAt propagado quando fornecido", () => {
  const r = normalizeCNHRenderInput(baseFlat(), { ...META, createdAt: "2024-01-15T10:00:00Z" });
  assertEq("createdAt", r.identity.createdAt, "2024-01-15T10:00:00Z");
});

suite("T03 — validationId customizavel (outros tipos de doc)", () => {
  const r = normalizeCNHRenderInput(baseFlat(), { emissionId: "aaa", validationId: "bbb" });
  assertEq("emissionId", r.identity.emissionId, "aaa");
  assertEq("validationId", r.identity.validationId, "bbb");
});

suite("T04 — campos canônicos basicos", () => {
  const r = normalizeCNHRenderInput(baseFlat(), META);
  assertEq("nome",         r.data.nome,        "JOAO DA SILVA");
  assertEq("cpf",          r.data.cpf,         "12345678901");
  assertEq("rg",           r.data.rg,          "1234567");
  assertEq("orgaoEmissor", r.data.orgaoEmissor,"SSP");
  assertEq("registro",     r.data.registro,    "12345678901");
  assertEq("espelho",      r.data.espelho,     "9876543210");
});

suite("T05 — uppercase obrigatorio: ufRG, sexo, nacionalidade, categoria, ufEmissao, ufNascimento", () => {
  const r = normalizeCNHRenderInput(baseFlat(), META);
  assertEq("ufRG uppercase",          r.data.ufRG,         "SP");
  assertEq("sexo uppercase",          r.data.sexo,         "M");
  assertEq("nacionalidade uppercase", r.data.nacionalidade,"BRASILEIRA");
  assertEq("categoria uppercase",     r.data.categoria,    "B");
  assertEq("ufEmissao uppercase",     r.data.ufEmissao,    "SP");
  assertEq("ufNascimento uppercase",  r.data.ufNascimento,  "SP");
});

suite("T06 — normalizacao de datas DD/MM/YYYY (sem alteracao)", () => {
  const r = normalizeCNHRenderInput(baseFlat(), META);
  assertEq("dataNascimento",    r.data.dataNascimento,    "01/01/1990");
  assertEq("validade",          r.data.validade,          "01/01/2030");
  assertEq("dataEmissao",       r.data.dataEmissao,       "01/01/2020");
  assertEq("primeiraHabilitacao", r.data.primeiraHabilitacao, "01/01/2015");
});

suite("T07 — normalizacao de datas YYYY-MM-DD -> DD/MM/YYYY", () => {
  const flat = { ...baseFlat(), dataNascimento: "1990-01-01", validade: "2030-12-31" };
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("dataNascimento convertida", r.data.dataNascimento, "01/01/1990");
  assertEq("validade convertida",       r.data.validade,       "31/12/2030");
});

suite("T08 — normalizacao de datas YYYY/MM/DD -> DD/MM/YYYY", () => {
  const flat = { ...baseFlat(), dataEmissao: "2020/03/15" };
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("dataEmissao convertida", r.data.dataEmissao, "15/03/2020");
});

suite("T09 — alias nascimento -> dataNascimento (precedencia: dataNascimento vence)", () => {
  const flat = { ...baseFlat(), dataNascimento: "01/01/1990", nascimento: "05/05/1985" };
  const r = normalizeCNHRenderInput(flat, META);
  // dataNascimento tem precedencia sobre nascimento (pos 0 vs pos 1 no ALIAS_MAP)
  assertEq("dataNascimento vence nascimento", r.data.dataNascimento, "01/01/1990");
});

suite("T10 — alias nascimento sem dataNascimento (fallback ativo)", () => {
  const flat = { ...baseFlat() };
  delete flat.dataNascimento;
  flat.nascimento = "05/05/1985";
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("nascimento como fallback", r.data.dataNascimento, "05/05/1985");
});

suite("T11 — alias docIdentidade -> rg (precedencia: rg vence)", () => {
  const flat = { ...baseFlat(), rg: "1234567", docIdentidade: "9999999" };
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("rg vence docIdentidade", r.data.rg, "1234567");
});

suite("T12 — alias docIdentidade como fallback de rg", () => {
  const flat = { ...baseFlat() };
  delete flat.rg;
  flat.docIdentidade = "9999999";
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("docIdentidade como fallback de rg", r.data.rg, "9999999");
});

suite("T13 — alias validade com multiplos candidatos (precedencia documentada)", () => {
  // validade > validadeCNH > dataValidade > validade_cnh > validade_ate > val
  const flat = { ...baseFlat() };
  delete flat.validade;
  flat.validadeCNH = "31/12/2028";
  flat.dataValidade = "01/01/2025";
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("validadeCNH vence dataValidade", r.data.validade, "31/12/2028");
});

suite("T14 — alias localEmissao com local como fallback", () => {
  const flat = { ...baseFlat() };
  delete flat.localEmissao;
  flat.local = "RIO DE JANEIRO";
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("local como fallback de localEmissao", r.data.localEmissao, "RIO DE JANEIRO");
});

suite("T15 — alias assDigital2 / renach (precedencia: assDigital2 vence)", () => {
  const flat = { ...baseFlat(), assDigital2: "222", renach: "333" };
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("assDigital2 vence renach", r.data.assDigital2, "222");
});

suite("T16 — alias fotoUrl / foto (precedencia: fotoUrl vence)", () => {
  const flat = { ...baseFlat(), fotoUrl: "data:image/jpeg;base64,FOTO_URL", foto: "data:image/jpeg;base64,FOTO" };
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("fotoUrl vence foto", r.data.fotoUrl, "data:image/jpeg;base64,FOTO_URL");
});

suite("T17 — offsets numericos propagados corretamente", () => {
  const r = normalizeCNHRenderInput(baseFlat(), META);
  assertEq("fotoScale",   r.data.fotoScale,   1.2);
  assertEq("fotoOffsetX", r.data.fotoOffsetX, 5);
  assertEq("fotoOffsetY", r.data.fotoOffsetY, -3);
  assertEq("assScale",    r.data.assScale,    0.9);
  assertEq("assOffsetX",  r.data.assOffsetX,  0);
  assertEq("assOffsetY",  r.data.assOffsetY,  0);
});

suite("T18 — offsets ausentes = undefined (nao zero falso)", () => {
  const flat = { ...baseFlat() };
  delete flat.fotoScale; delete flat.fotoOffsetX; delete flat.fotoOffsetY;
  delete flat.assScale; delete flat.assOffsetX; delete flat.assOffsetY;
  const r = normalizeCNHRenderInput(flat, META);
  assert("fotoScale undefined", r.data.fotoScale === undefined);
  assert("fotoOffsetX undefined", r.data.fotoOffsetX === undefined);
  assert("assScale undefined", r.data.assScale === undefined);
});

suite("T19 — SENHA NAO DEVE ESTAR no RenderInput", () => {
  const flat = { ...baseFlat(), senha: "secreta123", senhaApp: "app_pass", token: "jwt_abc" };
  const r = normalizeCNHRenderInput(flat, META);
  const output = JSON.stringify(r);
  assert("senha ausente no output",    !output.includes("secreta123"));
  assert("senhaApp ausente no output", !output.includes("app_pass"));
  assert("token ausente no output",    !output.includes("jwt_abc"));
  assert("sem campo senha no identity", !("senha"    in r.identity));
  assert("sem campo senha no data",     !("senha"    in r.data));
  assert("sem senhaApp no data",        !("senhaApp" in r.data));
});

suite("T20 — payload com aninhamento duplo (legado D1)", () => {
  const nested = {
    tipo: "cnh",
    data: {
      nome: "JOSE NESTED",
      cpf: "98765432100",
      data: {
        registro: "11111111111",
        categoria: "a",
      },
    },
  };
  const r = normalizeCNHRenderInput(nested, META);
  assertEq("nome do nivel 1", r.data.nome, "JOSE NESTED");
  assertEq("cpf do nivel 1",  r.data.cpf,  "98765432100");
  assertEq("registro do nivel 2", r.data.registro, "11111111111");
  assertEq("categoria uppercase", r.data.categoria, "A");
});

suite("T21 — normalizacao deterministica (idempotente)", () => {
  const flat = baseFlat();
  const r1 = normalizeCNHRenderInput(flat, META);
  const r2 = normalizeCNHRenderInput(flat, META);
  assertEq("nome idempotente",    r1.data.nome,     r2.data.nome);
  assertEq("validade idempotente",r1.data.validade, r2.data.validade);
  assertEq("cpf idempotente",     r1.data.cpf,      r2.data.cpf);
  assertEq("identity idempotente",r1.identity.emissionId, r2.identity.emissionId);
});

suite("T22 — campos opcionais ausentes retornam string vazia", () => {
  const flat: Record<string, any> = {
    nome: "JOAO", cpf: "00000000000",
    emissionId: EMISSION_UUID,
  };
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("rg vazio",           r.data.rg,           "");
  assertEq("orgaoEmissor vazio", r.data.orgaoEmissor,  "");
  assertEq("observacoes vazio",  r.data.observacoes,   "");
  assertEq("acc vazio",          r.data.acc,           "");
  assertEq("espelho vazio",      r.data.espelho,       "");
});

suite("T23 — alias ufRg (variante minusculo) -> ufRG", () => {
  const flat = { ...baseFlat() };
  delete flat.ufRG;
  flat.ufRg = "rj";
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("ufRg fallback uppercase", r.data.ufRG, "RJ");
});

suite("T24 — alias nome_completo -> nome", () => {
  const flat = { ...baseFlat() };
  delete flat.nome;
  flat.nome_completo = "PEDRO ALVES";
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("nome_completo como fallback", r.data.nome, "PEDRO ALVES");
});

suite("T25 — docIdentidade retrocompat: igual a rg no output", () => {
  const r = normalizeCNHRenderInput(baseFlat(), META);
  assertEq("docIdentidade = rg", r.data.docIdentidade, r.data.rg);
});

suite("T26 — nascimento retrocompat: igual a dataNascimento no output", () => {
  const r = normalizeCNHRenderInput(baseFlat(), META);
  assertEq("nascimento = dataNascimento", r.data.nascimento, r.data.dataNascimento);
});

suite("T27 — geometria AUSENTE no RenderInput.data", () => {
  const r = normalizeCNHRenderInput(baseFlat(), META);
  assert("sem layout no data",      !("layout"      in r.data));
  assert("sem layoutSource no data",!("layoutSource" in r.data));
  assert("sem geometry no data",    !("geometry"     in r.data));
});

// ══════════════════════════════════════════════════════════════════════════════
// BLOCO 2 — Auditoria de contrato: empty/null/undefined/whitespace + identidade
// ══════════════════════════════════════════════════════════════════════════════
//
// REGRA DE resolveField() (linhas 92-99 de normalize.ts):
//   v !== undefined && v !== null && String(v).trim() !== ""
//   → undefined     : SKIP (próximo alias)
//   → null          : SKIP (próximo alias)
//   → ""            : SKIP (próximo alias)
//   → "   " (spaces): SKIP (trim → "" → falsy)
//   → valor válido  : ACEITA, retorna String(v).trim()
//
// Este comportamento REPLICA a semântica dos renderers existentes:
//   CNHDocument.tsx getVal(): v !== undefined && v !== null && String(v).trim() !== ""
//   shared.tsx normalizeRecord(): usa || que ignora string vazia e null implicitamente
//
// Portanto: string vazia É tratada como ausente — igual ao comportamento atual.

suite("T28 — empty string no alias prioritario: fallback ativa", () => {
  const flat = { ...baseFlat(), dataNascimento: "", nascimento: "21/05/2006" };
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("dataNascimento='' → nascimento ativa", r.data.dataNascimento, "21/05/2006");
});

suite("T29 — null no alias prioritario: fallback ativa", () => {
  const flat = { ...baseFlat(), validade: null, validadeCNH: "31/12/2030" };
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("validade=null → validadeCNH ativa", r.data.validade, "31/12/2030");
});

suite("T30 — undefined no alias prioritario: fallback ativa", () => {
  const flat = { ...baseFlat() };
  delete flat.rg;
  flat.docIdentidade = "9998887";
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("rg=undefined → docIdentidade ativa", r.data.rg, "9998887");
});

suite("T31 — whitespace-only no alias prioritario: fallback ativa", () => {
  const flat = { ...baseFlat(), ufEmissao: "   ", uf: "RJ" };
  const r = normalizeCNHRenderInput(flat, META);
  // ufEmissao="   " → trim = "" → SKIP → uf="RJ" → "RJ".toUpperCase()
  assertEq("ufEmissao='   ' → uf ativa", r.data.ufEmissao, "RJ");
});

suite("T32 — whitespace-only em rg com docIdentidade como fallback", () => {
  const flat = { ...baseFlat(), rg: "  ", docIdentidade: "555" };
  const r = normalizeCNHRenderInput(flat, META);
  assertEq("rg='  ' → docIdentidade ativa", r.data.rg, "555");
});

suite("T33 — todos aliases ausentes: retorna string vazia (nao lanca erro)", () => {
  const flat: Record<string, any> = { nome: "TESTE" };
  let threw = false;
  try {
    const r = normalizeCNHRenderInput(flat, META);
    assertEq("dataNascimento = ''", r.data.dataNascimento, "");
    assertEq("ufEmissao = ''",      r.data.ufEmissao,      "");
    assertEq("validade = ''",       r.data.validade,       "");
    assertEq("rg = ''",             r.data.rg,             "");
  } catch { threw = true; }
  assert("nao lanca excecao", !threw);
});

// ── Identidade da emissão ─────────────────────────────────────────────────────
//
// A identidade (emissionId, validationId) vem EXCLUSIVAMENTE do parâmetro `meta`.
// Ela NÃO é lida do payload raw. Isso garante que:
//   1. Um payload corrompido não pode substituir silenciosamente o UUID da emissão.
//   2. O chamador é responsável por passar o id correto do row do D1.

suite("T34 — emissionId vem do meta, nao do payload", () => {
  const flat = { ...baseFlat(), id: "payload-uuid-FALSO", emissionId: "payload-emission-FALSO" };
  const r = normalizeCNHRenderInput(flat, { emissionId: "meta-uuid-CORRETO" });
  assertEq("emissionId = meta (nao payload)", r.identity.emissionId, "meta-uuid-CORRETO");
});

suite("T35 — validationId vem do meta, nao do payload", () => {
  const flat = { ...baseFlat(), codigo_validacao: "payload-codigo-FALSO", codigo_qr: "payload-qr-FALSO" };
  const r = normalizeCNHRenderInput(flat, {
    emissionId:   "uuid-correto",
    validationId: "validacao-correta",
  });
  assertEq("validationId = meta (nao payload)", r.identity.validationId, "validacao-correta");
});

suite("T36 — conflito: payload.id diferente de meta.emissionId", () => {
  // Simula row do D1 onde payload.data contém um id antigo (legado).
  // O meta.emissionId (vindo de documents.id) SEMPRE vence.
  const flat = { ...baseFlat(), id: "id-do-payload-LEGADO" };
  const r = normalizeCNHRenderInput(flat, { emissionId: "documents-id-CORRETO" });
  assertEq("emissionId = meta, nao flat.id", r.identity.emissionId, "documents-id-CORRETO");
  // O flat.id NAO vaza para data
  assert("flat.id nao esta em data", !("id" in r.data));
});

suite("T37 — validationId padrao = emissionId quando nao fornecido", () => {
  const r = normalizeCNHRenderInput(baseFlat(), { emissionId: "uuid-X" });
  assertEq("validationId padrao = emissionId", r.identity.validationId, "uuid-X");
});

suite("T38 — validationId diferente de emissionId (outros tipos de doc)", () => {
  // Para CNH são iguais, mas o contrato suporta tipos diferentes no futuro.
  const r = normalizeCNHRenderInput(baseFlat(), {
    emissionId:   "emission-AAA",
    validationId: "validation-BBB",
  });
  assertEq("emissionId",   r.identity.emissionId,   "emission-AAA");
  assertEq("validationId", r.identity.validationId, "validation-BBB");
  assert("sao diferentes", r.identity.emissionId !== r.identity.validationId);
});

// ── Offsets de imagem — classificação ────────────────────────────────────────
//
// CLASSIFICAÇÃO DELIBERADA: fotoScale/OffsetX/Y e assScale/OffsetX/Y
// são "ajustes de conteúdo/imagem persistidos na emissão", NÃO "geometria de render".
//
// RAZÃO: São salvos no documents.data pelo CNHCria no momento da emissão
// (junto com fotoUrl/assinaturaUrl). Representam como o usuário posicionou
// a foto/assinatura no editor interativo. Estão no snapshot da emissão,
// não no template de layout (CNHLayout). O renderer aplica esses offsets
// sobre as coordenadas base do CNHLayout, que são independentes.
//
// Portanto: pertencem ao CNHCanonicalData como "conteúdo", não a CNHLayout.

suite("T39 — offsets de imagem: presente apenas se number (nao string)", () => {
  // Simulação de payload corrompido com offset como string
  const flat = { ...baseFlat(), fotoScale: "1.5", fotoOffsetX: "0" };
  const r = normalizeCNHRenderInput(flat, META);
  // normalize.ts linha 200: typeof flat.fotoScale === "number" → string não passa
  assert("fotoScale string → undefined", r.data.fotoScale === undefined);
  assert("fotoOffsetX string → undefined", r.data.fotoOffsetX === undefined);
  // Os que são number continuam presentes (do baseFlat: fotoOffsetY=-3)
  assertEq("fotoOffsetY number = -3", r.data.fotoOffsetY, -3);
});

suite("T40 — nomeEstadoExtenso: ausente no output por padrao (derivado pelo renderer)", () => {
  const r = normalizeCNHRenderInput(baseFlat(), META);
  // nomeEstadoExtenso é opcional e NÃO calculado pela normalizacao.
  // O PRINT_A4 renderer deriva-o de ufEmissao via NOMES_ESTADOS.
  assert("nomeEstadoExtenso undefined no output canonico", r.data.nomeEstadoExtenso === undefined);
});

// ── Resultado ─────────────────────────────────────────────────────────────────

console.log("\n========================================");
console.log(`Resultado: ${passed} PASS  |  ${failed} FAIL`);
console.log(`Total: ${passed + failed} testes`);
if (failed > 0) process.exit(1);
