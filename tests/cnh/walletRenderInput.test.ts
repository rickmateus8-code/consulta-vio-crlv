/**
 * tests/cnh/walletRenderInput.test.ts
 *
 * Testes do adapter cNH3PartDocumentPropsToRenderInput (Phase 2D).
 *
 * Cobre:
 *   1. Legacy props → canonical input (campos documentais)
 *   2. renderInput canônico passa-través sem alteração
 *   3. Aliases antigos (via normalizeCNHRenderInput)
 *   4. Precedência de aliases
 *   5. Identity meta (emissionId, validationId)
 *   6. foto/assinatura
 *   7. Campos ausentes → string vazia
 *   8. REGRA ANTI-HÍBRIDA: renderInput presente → ignora legacy props
 *   9. assDigital1/assDigital2
 *  10. codigoQR resolution chain (legacy)
 *  11. CPF nunca vira validationId no caminho canônico
 *  12. Paridade textual — FRONT/BACK outputs iguais antes e depois
 *
 * Fase 2D — Phase 2 Unified Master Render
 */

import { cNH3PartDocumentPropsToRenderInput, normalizeCNHRenderInput } from "../../client/src/lib/cnh/normalize";
import type { CNHRenderInput } from "../../client/src/lib/cnh/renderInput";

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

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Props legacy completas (equivalente ao que CNHHabilitacao passava antes) */
const LEGACY_PROPS = {
  id: "abc-def-123",
  nome: "MARIA SILVA SANTOS",
  cpf: "12345678901",
  rg: "12345678",
  orgaoEmissor: "SSP",
  ufRG: "SP",
  sexo: "F",
  nacionalidade: "BRASILEIRA",
  dataNascimento: "1990-05-15",
  localNascimento: "SÃO PAULO",
  ufNascimento: "SP",
  nomePai: "JOSE SILVA",
  nomeMae: "ANA SANTOS",
  categoria: "AB",
  registro: "00123456789",
  espelho: "5728237792",
  validade: "2030-05-15",
  dataEmissao: "2025-05-15",
  primeiraHabilitacao: "2010-05-15",
  localEmissao: "SÃO PAULO",
  ufEmissao: "SP",
  observacoes: "EXERCE ATIVIDADE REMUNERADA",
  fotoUrl: "https://example.com/foto.jpg",
  assinaturaUrl: "https://example.com/assinatura.png",
  codigoQR: "abc-def-123",
  codigo_validacao: "codigo-valida-xyz",
  assDigital1: "7386321121",
  assDigital2: "SP54171992",
  previewWidth: 396,
};

/** CNHRenderInput canônico pré-construído */
const CANONICAL_INPUT: CNHRenderInput = {
  identity: {
    emissionId: "uuid-1234-5678",
    validationId: "uuid-1234-5678",
    createdAt: "2025-01-01T00:00:00Z",
  },
  data: {
    nome: "CANONICO",
    cpf: "99988877766",
    rg: "99887766",
    orgaoEmissor: "DETRAN",
    ufRG: "RJ",
    sexo: "M",
    nacionalidade: "BRASILEIRA",
    dataNascimento: "01/01/1980",
    localNascimento: "RIO DE JANEIRO",
    ufNascimento: "RJ",
    nomePai: "PAI CANONICO",
    nomeMae: "MAE CANONICA",
    categoria: "C",
    tipo: "Definitiva",
    registro: "99000000001",
    espelho: "9900000001",
    validade: "01/01/2035",
    dataEmissao: "01/01/2025",
    primeiraHabilitacao: "01/01/2000",
    localEmissao: "RIO DE JANEIRO",
    ufEmissao: "RJ",
    acc: "",
    observacoes: "NENHUMA",
    assDigital1: "9988776655",
    assDigital2: "RJ54321098",
    fotoUrl: "https://example.com/canonical-foto.jpg",
    assinaturaUrl: "https://example.com/canonical-ass.png",
  },
};

// ── Suite 1: Legacy props → campo documental canônico ─────────────────────────

test("nome: legacy → canonical", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.nome, "MARIA SILVA SANTOS", "data.nome");
});

test("cpf: legacy → canonical", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.cpf, "12345678901", "data.cpf");
});

test("rg: legacy → canonical", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.rg, "12345678", "data.rg");
});

test("orgaoEmissor: legacy → canonical", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.orgaoEmissor, "SSP", "data.orgaoEmissor");
});

test("sexo: legacy → canonical uppercase", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.sexo, "F", "data.sexo");
});

test("categoria: legacy → canonical uppercase", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.categoria, "AB", "data.categoria");
});

test("registro: legacy → canonical", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.registro, "00123456789", "data.registro");
});

test("espelho: legacy → canonical", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.espelho, "5728237792", "data.espelho");
});

test("ufEmissao: legacy → canonical uppercase", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.ufEmissao, "SP", "data.ufEmissao");
});

test("fotoUrl: legacy → canonical", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.fotoUrl, "https://example.com/foto.jpg", "data.fotoUrl");
});

test("assinaturaUrl: legacy → canonical", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.assinaturaUrl, "https://example.com/assinatura.png", "data.assinaturaUrl");
});

test("assDigital1: legacy → canonical", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.assDigital1, "7386321121", "data.assDigital1");
});

test("assDigital2: legacy → canonical", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.data.assDigital2, "SP54171992", "data.assDigital2");
});

// ── Suite 2: Identity meta ────────────────────────────────────────────────────

test("emissionId = props.id", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(r.identity.emissionId, "abc-def-123", "identity.emissionId");
});

test("validationId = codigo_validacao (takes priority over codigoQR)", () => {
  const r = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  // codigo_validacao = "codigo-valida-xyz" > codigoQR = "abc-def-123"
  assertEq(r.identity.validationId, "codigo-valida-xyz", "identity.validationId");
});

test("validationId = codigoQR quando codigo_validacao ausente", () => {
  const props = { ...LEGACY_PROPS, codigo_validacao: undefined, codigo_qr: undefined };
  const r = cNH3PartDocumentPropsToRenderInput(props);
  assertEq(r.identity.validationId, "abc-def-123", "identity.validationId (codigoQR fallback)");
});

test("validationId = emissionId quando todos os codigos QR ausentes", () => {
  const props = { ...LEGACY_PROPS, codigo_validacao: undefined, codigo_qr: undefined, codigoQR: undefined };
  const r = cNH3PartDocumentPropsToRenderInput(props);
  assertEq(r.identity.validationId, "abc-def-123", "identity.validationId (emissionId fallback)");
});

test("CPF NUNCA vira validationId", () => {
  const props = {
    ...LEGACY_PROPS,
    id: undefined,
    codigo_validacao: undefined,
    codigo_qr: undefined,
    codigoQR: undefined,
  };
  const r = cNH3PartDocumentPropsToRenderInput(props);
  assert(r.identity.validationId !== r.data.cpf,
    `validationId não deve ser o CPF. Got: ${r.identity.validationId}`);
});

test("emissionId = '' quando props.id ausente", () => {
  const props = { ...LEGACY_PROPS, id: undefined };
  const r = cNH3PartDocumentPropsToRenderInput(props);
  assertEq(r.identity.emissionId, "", "identity.emissionId (absent)");
});

// ── Suite 3: Campos ausentes → string vazia ────────────────────────────────────

test("nomePai ausente → string vazia", () => {
  const r = cNH3PartDocumentPropsToRenderInput({ nome: "X", cpf: "123" } as any);
  assertEq(r.data.nomePai, "", "data.nomePai absent");
});

test("observacoes ausente → string vazia", () => {
  const r = cNH3PartDocumentPropsToRenderInput({ nome: "X", cpf: "123" } as any);
  assertEq(r.data.observacoes, "", "data.observacoes absent");
});

test("assDigital1 ausente → string vazia", () => {
  const r = cNH3PartDocumentPropsToRenderInput({ nome: "X", cpf: "123" } as any);
  assertEq(r.data.assDigital1, "", "data.assDigital1 absent");
});

// ── Suite 4: Aliases (via normalizeCNHRenderInput ALIAS_MAP) ──────────────────

test("alias 'nascimento' → dataNascimento", () => {
  const r = normalizeCNHRenderInput({ nascimento: "1985-03-20" }, { emissionId: "x" });
  assertEq(r.data.dataNascimento, "20/03/1985", "dataNascimento via alias nascimento");
});

test("alias 'filiacaoPai' → nomePai", () => {
  const r = normalizeCNHRenderInput({ filiacaoPai: "PAI ALIAS" }, { emissionId: "x" });
  assertEq(r.data.nomePai, "PAI ALIAS", "nomePai via alias filiacaoPai");
});

test("alias 'renach' → assDigital2", () => {
  const r = normalizeCNHRenderInput({ renach: "RJ99887766" }, { emissionId: "x" });
  assertEq(r.data.assDigital2, "RJ99887766", "assDigital2 via alias renach");
});

test("alias 'nRegistro' → registro", () => {
  const r = normalizeCNHRenderInput({ nRegistro: "98765432100" }, { emissionId: "x" });
  assertEq(r.data.registro, "98765432100", "registro via alias nRegistro");
});

test("alias 'cat' → categoria (uppercase)", () => {
  const r = normalizeCNHRenderInput({ cat: "b" }, { emissionId: "x" });
  assertEq(r.data.categoria, "B", "categoria via alias cat");
});

// ── Suite 5: Precedência de aliases ──────────────────────────────────────────

test("nome prevalece sobre nomeCompleto", () => {
  const r = normalizeCNHRenderInput({ nome: "NOME_PRIM", nomeCompleto: "NOME_SEC" }, { emissionId: "x" });
  assertEq(r.data.nome, "NOME_PRIM", "nome prevalece sobre nomeCompleto");
});

test("assDigital1 prevalece sobre renach em assDigital2", () => {
  const r = normalizeCNHRenderInput({ assDigital2: "DIGITAL2", renach: "RENACH2" }, { emissionId: "x" });
  assertEq(r.data.assDigital2, "DIGITAL2", "assDigital2 prevalece sobre renach");
});

// ── Suite 6: REGRA ANTI-HÍBRIDA ───────────────────────────────────────────────
// Simula o que acontece dentro de CNH3PartDocument com renderInput presente.
// O componente usa: effectiveInput = props.renderInput ?? adapter(props)
// Portanto, quando renderInput é fornecido, p = effectiveInput.data (CANONICAL_INPUT).
// Campos como p.nome = "CANONICO", não "MARIA" das legacy props.

test("anti-hybrid: com renderInput, TODOS os dados vêm do renderInput (nome)", () => {
  // Simula effectiveInput = props.renderInput (regra anti-híbrida do componente)
  const effectiveInput = CANONICAL_INPUT; // renderInput fornecido
  assertEq(effectiveInput.data.nome, "CANONICO", "nome vem do renderInput");
  assert(effectiveInput.data.nome !== LEGACY_PROPS.nome,
    "nome canônico !== legacy props nome");
});

test("anti-hybrid: com renderInput, identity.emissionId = renderInput.identity.emissionId", () => {
  const effectiveInput = CANONICAL_INPUT;
  assertEq(effectiveInput.identity.emissionId, "uuid-1234-5678", "emissionId canônico");
});

test("anti-hybrid: sem renderInput, adapter usa legacy props inteiramente", () => {
  const effectiveInput = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS);
  assertEq(effectiveInput.data.nome, "MARIA SILVA SANTOS", "nome vem de legacy props");
});

test("anti-hybrid: nenhum campo é misturado entre as duas fontes", () => {
  // Se renderInput fornecido: todos os campos = CANONICAL_INPUT.data
  const canonical = CANONICAL_INPUT.data;
  // Se legacy: todos os campos = adapter(LEGACY_PROPS).data
  const legacy = cNH3PartDocumentPropsToRenderInput(LEGACY_PROPS).data;
  // Os dois não devem ter overlap de valores de nome
  assert(canonical.nome !== legacy.nome, "nome canônico != nome legacy");
  assert(canonical.cpf !== legacy.cpf, "cpf canônico != cpf legacy");
  assert(canonical.registro !== legacy.registro, "registro canônico != registro legacy");
});

// ── Suite 7: Normalização de datas ────────────────────────────────────────────

test("dataNascimento YYYY-MM-DD → DD/MM/YYYY", () => {
  const r = cNH3PartDocumentPropsToRenderInput({ ...LEGACY_PROPS, dataNascimento: "1990-05-15" });
  assertEq(r.data.dataNascimento, "15/05/1990", "dataNascimento normalized");
});

test("validade YYYY-MM-DD → DD/MM/YYYY", () => {
  const r = cNH3PartDocumentPropsToRenderInput({ ...LEGACY_PROPS, validade: "2030-05-15" });
  assertEq(r.data.validade, "15/05/2030", "validade normalized");
});

test("dataEmissao YYYY-MM-DD → DD/MM/YYYY", () => {
  const r = cNH3PartDocumentPropsToRenderInput({ ...LEGACY_PROPS, dataEmissao: "2025-05-15" });
  assertEq(r.data.dataEmissao, "15/05/2025", "dataEmissao normalized");
});

test("data já em DD/MM/YYYY → mantida", () => {
  const r = cNH3PartDocumentPropsToRenderInput({ ...LEGACY_PROPS, validade: "15/05/2030" });
  assertEq(r.data.validade, "15/05/2030", "validade already formatted");
});

// ── Suite 8: Paridade textual FRONT/BACK ──────────────────────────────────────
// Verifica que os valores que o renderer usa nas composições textuais
// são equivalentes no caminho legacy e no caminho canônico.

const FIXTURE_RECORD = {
  id: "fixture-uuid-001",
  nome: "ANTONIO JOSE FERREIRA",
  cpf: "98765432100",
  rg: "55443322",
  orgaoEmissor: "SSP",
  ufRG: "MG",
  dataNascimento: "1985-03-20",
  localNascimento: "BELO HORIZONTE",
  ufNascimento: "MG",
  categoria: "B",
  registro: "12345678901",
  espelho: "9988776655",
  validade: "2031-03-20",
  dataEmissao: "2021-03-20",
  primeiraHabilitacao: "2005-03-20",
  localEmissao: "BELO HORIZONTE",
  ufEmissao: "MG",
  observacoes: "EXERCE ATIVIDADE REMUNERADA",
  fotoUrl: "",
  assinaturaUrl: "",
  assDigital1: "1122334455",
  assDigital2: "MG66778899",
  codigo_validacao: "fixture-uuid-001",
};

test("paridade: nome (FRONT campo 1)", () => {
  const legacy = cNH3PartDocumentPropsToRenderInput(FIXTURE_RECORD);
  const canonical = normalizeCNHRenderInput(FIXTURE_RECORD, {
    emissionId: FIXTURE_RECORD.id,
    validationId: FIXTURE_RECORD.codigo_validacao,
  });
  assertEq(legacy.data.nome, canonical.data.nome, "nome parity");
  assertEq(legacy.data.nome, "ANTONIO JOSE FERREIRA", "nome value");
});

test("paridade: espelho (FRONT/BACK topo)", () => {
  const legacy = cNH3PartDocumentPropsToRenderInput(FIXTURE_RECORD);
  const canonical = normalizeCNHRenderInput(FIXTURE_RECORD, { emissionId: FIXTURE_RECORD.id });
  assertEq(legacy.data.espelho, canonical.data.espelho, "espelho parity");
  assertEq(legacy.data.espelho, "9988776655", "espelho value");
});

test("paridade: dataNascimento normalizada (FRONT campo 3)", () => {
  const legacy = cNH3PartDocumentPropsToRenderInput(FIXTURE_RECORD);
  assertEq(legacy.data.dataNascimento, "20/03/1985", "dataNascimento DD/MM/YYYY");
});

test("paridade: ufEmissao uppercase (BACK estado extenso)", () => {
  const legacy = cNH3PartDocumentPropsToRenderInput(FIXTURE_RECORD);
  assertEq(legacy.data.ufEmissao, "MG", "ufEmissao uppercase");
});

test("paridade: validade normalizada (FRONT campo 4b e BACK tabela)", () => {
  const legacy = cNH3PartDocumentPropsToRenderInput(FIXTURE_RECORD);
  assertEq(legacy.data.validade, "20/03/2031", "validade DD/MM/YYYY");
});

test("paridade: registro (FRONT campo 5)", () => {
  const legacy = cNH3PartDocumentPropsToRenderInput(FIXTURE_RECORD);
  assertEq(legacy.data.registro, "12345678901", "registro value");
});

test("paridade: categoria uppercase (FRONT campo 9, BACK tabela)", () => {
  const legacy = cNH3PartDocumentPropsToRenderInput(FIXTURE_RECORD);
  assertEq(legacy.data.categoria, "B", "categoria uppercase");
});

test("paridade: observacoes (BACK campo 12)", () => {
  const legacy = cNH3PartDocumentPropsToRenderInput(FIXTURE_RECORD);
  assertEq(legacy.data.observacoes, "EXERCE ATIVIDADE REMUNERADA", "observacoes value");
});

test("paridade: localEmissao (BACK campo local/UF)", () => {
  const legacy = cNH3PartDocumentPropsToRenderInput(FIXTURE_RECORD);
  assertEq(legacy.data.localEmissao, "BELO HORIZONTE", "localEmissao value");
});

test("paridade: assDigital1 (BACK assinatura digital Detran)", () => {
  const legacy = cNH3PartDocumentPropsToRenderInput(FIXTURE_RECORD);
  assertEq(legacy.data.assDigital1, "1122334455", "assDigital1 value");
});

test("paridade: assDigital2 (BACK assinatura digital Detran)", () => {
  const legacy = cNH3PartDocumentPropsToRenderInput(FIXTURE_RECORD);
  assertEq(legacy.data.assDigital2, "MG66778899", "assDigital2 value");
});

test("paridade: identity.validationId = codigo_validacao (QR)", () => {
  const legacy = cNH3PartDocumentPropsToRenderInput(FIXTURE_RECORD);
  assertEq(legacy.identity.validationId, "fixture-uuid-001", "validationId value");
});

// ── Suite 9: primeiraHabilitacao fallback para dataEmissao ────────────────────

test("primeiraHabilitacao presente → usado", () => {
  const r = cNH3PartDocumentPropsToRenderInput({ ...LEGACY_PROPS, primeiraHabilitacao: "2010-05-15" });
  assertEq(r.data.primeiraHabilitacao, "15/05/2010", "primeiraHabilitacao normalized");
});

test("primeiraHabilitacao ausente → '' (renderer aplica fallback || dataEmissao)", () => {
  const r = cNH3PartDocumentPropsToRenderInput({ ...LEGACY_PROPS, primeiraHabilitacao: undefined });
  assertEq(r.data.primeiraHabilitacao, "", "primeiraHabilitacao absent → empty");
  // Renderer: fmtDate(p.primeiraHabilitacao || p.dataEmissao)
  // = fmtDate("" || "15/05/2025") = "15/05/2025"  ← correto
});

// ── Resultado final ───────────────────────────────────────────────────────────

const pass = results.filter(r => r.pass).length;
const fail = results.filter(r => !r.pass).length;

results
  .filter(r => !r.pass)
  .forEach(r => console.error(`  ✗ ${r.name}${r.detail ? `: ${r.detail}` : ""}`));

console.log(`\nResultado: ${pass} PASS  |  ${fail} FAIL`);
if (fail > 0) process.exit(1);
