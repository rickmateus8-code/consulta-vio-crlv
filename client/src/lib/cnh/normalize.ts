/**
 * lib/cnh/normalize.ts
 *
 * Normalização canônica de múltiplos formatos de entrada para CNHRenderInput.
 *
 * REGRA DE PRECEDÊNCIA:
 *   Para cada campo canônico, a ordem de preferência é documentada explicitamente.
 *   Ela preserva a precedência que os renderers atuais já usam (auditada em 2026-08).
 *   Não muda valores — apenas escolhe qual fonte usar.
 *
 * FONTES DE ENTRADA CONHECIDAS:
 *   A) documents.data (JSON do D1) — campo "data" do registro
 *   B) CNHCria form state — campos do formulário de criação
 *   C) CNHValidationRecord (shared.tsx normalizeRecord) — já parcialmente normalizado
 *   D) CNHDocumentProps (CNHDocument.tsx) — props do renderer PRINT_A4
 *
 * Fase 2A — Phase 2 Unified Master Render
 */

import type { CNHRenderInput, CNHCanonicalData, CNHEmissionIdentity } from "./renderInput";

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Retorna o primeiro valor não-vazio da lista de candidatos. */
function first(...candidates: (string | null | undefined)[]): string {
  for (const v of candidates) {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

/** Normaliza datas: aceita DD/MM/YYYY, YYYY-MM-DD, YYYY/MM/DD → DD/MM/YYYY. */
function normalizeDate(v: string | undefined): string {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  if (/^\d{4}\/\d{2}\/\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("/");
    return `${d}/${m}/${y}`;
  }
  return s;
}

// ─── Alias Map documentado ────────────────────────────────────────────────────
//
// Para cada campo canônico: [primary, ...aliases] em ordem de precedência.
// Fonte: auditoria de aliases em CNHDocument.tsx (getVal), shared.tsx
// (normalizeRecord) e CNH3PartDocument.tsx — 2026-08-13.
//
// REGRA: se dois aliases estiverem presentes com valores diferentes,
// vence o que aparece PRIMEIRO nesta lista. Esta é a precedência atual do código.

const ALIAS_MAP = {
  nome:               ["nome", "nomeCompleto", "nome_completo"] as const,
  cpf:                ["cpf", "cpf_condutor", "cpfCnpj"] as const,
  rg:                 ["rg", "numero_rg", "doc_identidade", "docIdentidade"] as const,
  orgaoEmissor:       ["orgaoEmissor", "orgao_emissor"] as const,
  ufRG:               ["ufRG", "ufRg", "uf_rg"] as const,
  sexo:               ["sexo"] as const,
  nacionalidade:      ["nacionalidade", "nacionalidade_condutor"] as const,
  dataNascimento:     ["dataNascimento", "nascimento", "data_nascimento", "dataNasc"] as const,
  localNascimento:    ["localNascimento", "local_nascimento"] as const,
  ufNascimento:       ["ufNascimento", "uf_nascimento"] as const,
  nomePai:            ["nomePai", "filiacaoPai", "nome_pai"] as const,
  nomeMae:            ["nomeMae", "filiacaoMae", "nome_mae"] as const,
  categoria:          ["categoria", "categoria_cnh", "cat_hab", "cat"] as const,
  tipo:               ["tipo", "tipo_cnh"] as const,
  registro:           ["registro", "nRegistro", "numRegistro", "numero_registro", "registro_cnh"] as const,
  espelho:            ["espelho", "numeroFormulario"] as const,
  validade:           ["validade", "validadeCNH", "dataValidade", "validade_cnh", "validade_ate", "val"] as const,
  dataEmissao:        ["dataEmissao", "emissao", "data_emissao", "dtEmissao", "dataEmiss"] as const,
  primeiraHabilitacao:["primeiraHabilitacao", "primeiraHab", "primeira_habilitacao"] as const,
  localEmissao:       ["localEmissao", "local_emissao", "local"] as const,
  ufEmissao:          ["ufEmissao", "uf_emissao", "ufEmissor", "uf"] as const,
  acc:                ["acc", "acc_cnh"] as const,
  observacoes:        ["observacoes", "obs", "observacoes_cnh"] as const,
  assDigital1:        ["assDigital1"] as const,
  assDigital2:        ["assDigital2", "renach"] as const,
  fotoUrl:            ["fotoUrl", "foto"] as const,
  assinaturaUrl:      ["assinaturaUrl", "assinatura"] as const,
} as const;

type AliasMap = typeof ALIAS_MAP;

/** Extrai o valor de um campo do objeto raw seguindo os aliases em ordem. */
function resolveField(raw: Record<string, any>, key: keyof AliasMap): string {
  for (const alias of ALIAS_MAP[key]) {
    const v = raw[alias];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
}

// ─── Normalização do payload bruto ───────────────────────────────────────────

/**
 * Achata o payload JSON do D1, que pode ter até 3 níveis de aninhamento:
 *   { data: { tipo: "cnh", data: { nome: "..." } } }  ← formato antigo duplo
 *   { tipo: "cnh", data: { nome: "..." } }             ← formato moderno
 *   { nome: "..." }                                    ← já flat
 */
function flattenPayload(payload: any): Record<string, any> {
  if (!payload || typeof payload !== "object") return {};
  // Nível 1: se tem payload.data como objeto, usa como base
  const raw = (payload.data && typeof payload.data === "object") ? payload.data : payload;
  // Nível 2: duplo aninhamento (legado)
  let data: Record<string, any> = (raw.data && typeof raw.data === "object") ? raw.data : {};
  if (data.data && typeof data.data === "object") {
    data = { ...data, ...data.data };
  }
  return { ...raw, ...data };
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Normaliza qualquer representação de dados CNH (D1 row, form state, props,
 * validationRecord) para CNHRenderInput canônico.
 *
 * A função:
 *   1. Achata aninhamentos de JSON (flattenPayload)
 *   2. Resolve aliases na ordem de precedência documentada (ALIAS_MAP)
 *   3. Normaliza datas para DD/MM/YYYY
 *   4. NÃO altera valores — apenas seleciona e formata a fonte correta
 *   5. NÃO faz queries ao banco
 *   6. NÃO tem side effects
 *
 * @param raw  - Registro bruto: documents.data parsed, form state, ou CNHValidationRecord
 * @param meta - Metadados de identidade: id, codigo_validacao, created_at do row do D1
 *
 * @returns CNHRenderInput com dados canônicos e identidade preenchidos
 */
export function normalizeCNHRenderInput(
  raw: Record<string, any>,
  meta: {
    emissionId:   string;
    validationId?: string;
    createdAt?:   string;
  }
): CNHRenderInput {
  const flat = flattenPayload(raw);

  const identity: CNHEmissionIdentity = {
    emissionId:   meta.emissionId,
    validationId: meta.validationId ?? meta.emissionId, // para CNH: sempre igual
    createdAt:    meta.createdAt,
  };

  const data: CNHCanonicalData = {
    // Identificação do condutor
    nome:              resolveField(flat, "nome"),
    cpf:               resolveField(flat, "cpf"),

    // Documentos pessoais
    rg:                resolveField(flat, "rg"),
    orgaoEmissor:      resolveField(flat, "orgaoEmissor"),
    ufRG:              resolveField(flat, "ufRG").toUpperCase(),
    sexo:              resolveField(flat, "sexo").toUpperCase(),
    nacionalidade:     resolveField(flat, "nacionalidade").toUpperCase(),

    // Nascimento — datas normalizadas
    dataNascimento:    normalizeDate(resolveField(flat, "dataNascimento")),
    localNascimento:   resolveField(flat, "localNascimento"),
    ufNascimento:      resolveField(flat, "ufNascimento").toUpperCase(),

    // Filiação
    nomePai:           resolveField(flat, "nomePai"),
    nomeMae:           resolveField(flat, "nomeMae"),

    // Habilitação — datas normalizadas
    categoria:         resolveField(flat, "categoria").toUpperCase(),
    tipo:              resolveField(flat, "tipo"),
    registro:          resolveField(flat, "registro"),
    espelho:           resolveField(flat, "espelho"),
    validade:          normalizeDate(resolveField(flat, "validade")),
    dataEmissao:       normalizeDate(resolveField(flat, "dataEmissao")),
    primeiraHabilitacao: normalizeDate(resolveField(flat, "primeiraHabilitacao")),
    localEmissao:      resolveField(flat, "localEmissao"),
    ufEmissao:         resolveField(flat, "ufEmissao").toUpperCase(),
    acc:               resolveField(flat, "acc"),

    // Campos administrativos
    observacoes:       resolveField(flat, "observacoes"),
    assDigital1:       resolveField(flat, "assDigital1"),
    assDigital2:       resolveField(flat, "assDigital2"),

    // Imagens
    fotoUrl:           resolveField(flat, "fotoUrl"),
    assinaturaUrl:     resolveField(flat, "assinaturaUrl"),

    // Parâmetros de renderização de imagem
    fotoScale:         typeof flat.fotoScale === "number"   ? flat.fotoScale   : undefined,
    fotoOffsetX:       typeof flat.fotoOffsetX === "number" ? flat.fotoOffsetX : undefined,
    fotoOffsetY:       typeof flat.fotoOffsetY === "number" ? flat.fotoOffsetY : undefined,
    assScale:          typeof flat.assScale === "number"    ? flat.assScale    : undefined,
    assOffsetX:        typeof flat.assOffsetX === "number"  ? flat.assOffsetX  : undefined,
    assOffsetY:        typeof flat.assOffsetY === "number"  ? flat.assOffsetY  : undefined,

    // Aliases preservados para retrocompatibilidade (não duplicam dados)
    docIdentidade:     resolveField(flat, "rg"),   // mesmo valor de rg, para consumers que leem este campo
    nascimento:        normalizeDate(resolveField(flat, "dataNascimento")), // alias de dataNascimento
  };

  return { identity, data };
}

/**
 * Adapter: converte CNHDocumentProps (props do renderer PRINT_A4) em CNHRenderInput.
 *
 * Útil para paths onde o renderer já recebeu as props e precisa passar o
 * RenderInput para um consumer downstream (ex: logging, testes).
 *
 * NÃO chama normalizeCNHRenderInput para evitar dupla normalização.
 * Props já foram validadas/normalizadas pelo caller.
 */
export function cNHDocumentPropsToRenderInput(
  props: {
    nome: string; cpf: string; rg: string; orgaoEmissor: string; ufRG: string;
    sexo: string; nacionalidade: string; dataNascimento: string;
    localNascimento: string; ufNascimento: string; nomePai: string; nomeMae: string;
    categoria: string; tipo: string; registro: string; espelho: string;
    validade: string; dataEmissao: string; primeiraHabilitacao: string;
    localEmissao: string; ufEmissao: string; acc?: string; observacoes: string;
    assDigital1: string; assDigital2: string; fotoUrl: string; assinaturaUrl: string;
    fotoScale?: number; fotoOffsetX?: number; fotoOffsetY?: number;
    assScale?: number; assOffsetX?: number; assOffsetY?: number;
    codigoQR?: string;
  },
  emissionId: string
): CNHRenderInput {
  return {
    identity: {
      emissionId,
      validationId: emissionId,
    },
    data: {
      nome: props.nome, cpf: props.cpf,
      rg: props.rg, orgaoEmissor: props.orgaoEmissor, ufRG: props.ufRG,
      sexo: props.sexo, nacionalidade: props.nacionalidade,
      dataNascimento: props.dataNascimento,
      localNascimento: props.localNascimento, ufNascimento: props.ufNascimento,
      nomePai: props.nomePai, nomeMae: props.nomeMae,
      categoria: props.categoria, tipo: props.tipo, registro: props.registro,
      espelho: props.espelho, validade: props.validade,
      dataEmissao: props.dataEmissao,
      primeiraHabilitacao: props.primeiraHabilitacao,
      localEmissao: props.localEmissao, ufEmissao: props.ufEmissao,
      acc: props.acc ?? "",
      observacoes: props.observacoes,
      assDigital1: props.assDigital1, assDigital2: props.assDigital2,
      fotoUrl: props.fotoUrl, assinaturaUrl: props.assinaturaUrl,
      fotoScale: props.fotoScale, fotoOffsetX: props.fotoOffsetX, fotoOffsetY: props.fotoOffsetY,
      assScale: props.assScale, assOffsetX: props.assOffsetX, assOffsetY: props.assOffsetY,
      docIdentidade: props.rg,
      nascimento: props.dataNascimento,
    },
  };
}
