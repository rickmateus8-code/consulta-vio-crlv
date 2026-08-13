/**
 * lib/cnh/walletGeometry.ts
 *
 * Layout declarativo da Carteira Digital CNH (slides 1-4 de CNH3PartDocument).
 *
 * FASE 2C — Externalização behavior-preserving.
 * Todos os valores são copiados literalmente do código original auditado em 2026-08-13.
 *
 * CONTRATO:
 *   - Arquivo 100% declarativo: SEM funções, callbacks ou transforms embutidos.
 *   - Cada elemento visual possui id único.
 *   - "Onde e como desenhar" está aqui; "Como normalizar o dado" permanece no renderer.
 *   - NÃO mover pixels: output antes == output depois.
 *
 * Débito técnico registrado:
 *   - normalizeRecord em shared.tsx depende implicitamente de ...merged para preservar id.
 *   - O fallback getCNHValidationUrl(cpf) em CNHHabilitacao.tsx é legado defensivo
 *     inalcançável no fluxo válido (record.id = documents.id UUID sempre presente).
 *
 * Fase 2C — Phase 2 Unified Master Render
 */

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type FontWeight = "bold" | "normal";
export type TextAlign  = "left" | "center" | "right";

/**
 * Hint declarativo para o renderer identificar lógica especial de composição.
 * NÃO é uma função — é uma string constante interpretada pelo renderer.
 */
export type RendererHint =
  | "photoFrame"              // rect branco como moldura da foto
  | "photo"                   // drawImage com clip na moldura
  | "cleanSignature"          // drawCleanSignature com pixel processing
  | "fallbackEspelhoRegistro" // espelho || registro, fallback default
  | "estadoExtenso"           // ufEmissao → ESTADOS_POR_EXTENSO lookup
  | "formatCPF"               // CPF 000.000.000-00
  | "compositeNascimento"     // dataNascimento + localNascimento + ufNascimento
  | "compositeDocId"          // rg + orgaoEmissor + ufRG|ufEmissao
  | "compositeLocalUF"        // localEmissao + ufEmissao
  | "compositeAssDetran"      // assDigital1 + assDigital2|renach+uf
  | "primeiraHabFallback";    // primeiraHabilitacao || dataEmissao

export interface FontSpec {
  readonly family: string;
  readonly size:   number;
  readonly weight: FontWeight;
}

export interface ConditionDeclarative {
  readonly field:    string;
  readonly operator: "contains";
  readonly value:    string;
}

// ── Interfaces dos elementos ───────────────────────────────────────────────────

export interface TextElement {
  readonly id:           string;
  readonly kind:         "text";
  readonly dataField:    string;
  readonly x:            number;
  readonly y:            number;
  readonly font:         FontSpec;
  readonly color:        string;
  readonly align:        TextAlign;
  readonly rendererHint?: RendererHint;
}

export interface CompositeTextElement {
  readonly id:         string;
  readonly kind:       "composite_text";
  readonly dataFields: readonly string[];
  readonly joiner:     string;
  readonly x:          number;
  readonly y:          number;
  readonly font:       FontSpec;
  readonly color:      string;
  readonly align:      TextAlign;
  readonly rendererHint?: RendererHint;
}

export interface ImageElement {
  readonly id:        string;
  readonly kind:      "image";
  readonly dataField: string;
  readonly x:         number;
  readonly y:         number;
  readonly width:     number;
  readonly height:    number;
  readonly clip?:     { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly rendererHint: RendererHint;
}

export interface RectElement {
  readonly id:     string;
  readonly kind:   "rect";
  readonly x:      number;
  readonly y:      number;
  readonly width:  number;
  readonly height: number;
  readonly color:  string;
  readonly rendererHint?: RendererHint;
}

export interface ConditionalTextElement {
  readonly id:          string;
  readonly kind:        "conditional_text";
  readonly dataField:   string;
  readonly condition:   ConditionDeclarative;
  readonly x:           number;
  readonly y:           number;
  readonly font:        FontSpec;
  readonly color:       string;
  readonly align:       TextAlign;
}

export type WalletElement =
  | TextElement
  | CompositeTextElement
  | ImageElement
  | RectElement
  | ConditionalTextElement;

export type WalletProfileId =
  | "WALLET_FRONT"
  | "WALLET_BACK"
  | "WALLET_MRZ"
  | "VALIDATION_QR";

export interface CanvasTransform {
  readonly translateX: number;
  readonly translateY: number;
  readonly rotateRad:  number;
}

export interface WalletProfileLayout {
  readonly profileId:       WalletProfileId;
  /** Offscreen (source) canvas — onde os elementos são desenhados antes da rotação */
  readonly sourceWidth:     number;
  readonly sourceHeight:    number;
  /** Output (destino) canvas — tamanho final visível ao usuário */
  readonly outputWidth:     number;
  readonly outputHeight:    number;
  /** Transformação aplicada ao offscreen para produzir o output */
  readonly outputTransform: CanvasTransform;
  /** Caminho do background JPG do template */
  readonly background:      string;
  readonly elements:        readonly WalletElement[];
}

// ── Constantes de fonte (SSOT — exatamente como no código original) ────────────

const TIMES_24:   FontSpec = { family: "Times New Roman, serif",        size: 24, weight: "bold" };
const RAWLINE_19: FontSpec = { family: "Rawline, Arial, sans-serif",     size: 19, weight: "bold" };
const RAWLINE_17: FontSpec = { family: "Rawline, Arial, sans-serif",     size: 17, weight: "bold" };
const RAWLINE_18: FontSpec = { family: "Rawline, Arial, sans-serif",     size: 18, weight: "bold" };
const RAWLINE_15: FontSpec = { family: "Rawline, Arial, sans-serif",     size: 15, weight: "bold" };
const RAWLINE_32: FontSpec = { family: "Rawline, Arial, sans-serif",     size: 32, weight: "bold" };
const RAWLINE_12: FontSpec = { family: "Rawline, Arial, sans-serif",     size: 12, weight: "bold" };

// ── Constantes de cor ─────────────────────────────────────────────────────────

const BLACK      = "#000000";
const RED_SEC    = "#c0392b";  // vermelho de segurança oficial
const WHITE      = "#ffffff";

// ── Transform comum (slides 1, 2, 3) ─────────────────────────────────────────
// Fonte canvas: 963×680 (landscape); saída: 680×963 (portrait)
// translate(0, 963) → rotate(-π/2)

const WALLET_PORTRAIT_TRANSFORM: CanvasTransform = {
  translateX: 0,
  translateY: 963,
  rotateRad:  -Math.PI / 2,
};

// ══════════════════════════════════════════════════════════════════════════════
// WALLET_FRONT — Slide 1: Frente / Parte Superior
// Source canvas: 963×680  |  Output: 680×963 (portrait após rotação)
// Background: /img/cnh-templates/parte_superior.jpg
// ══════════════════════════════════════════════════════════════════════════════

export const WALLET_FRONT_LAYOUT: WalletProfileLayout = {
  profileId:       "WALLET_FRONT",
  sourceWidth:     963,
  sourceHeight:    680,
  outputWidth:     680,
  outputHeight:    963,
  outputTransform: WALLET_PORTRAIT_TRANSFORM,
  background:      "/img/cnh-templates/parte_superior.jpg",
  elements: [
    // ── Moldura e foto 3×4 ──────────────────────────────────────────────────
    {
      id:           "front.photoFrame",
      kind:         "rect",
      x:            177,
      y:            192,
      width:        250,
      height:       335,
      color:        WHITE,
      rendererHint: "photoFrame",
    } satisfies RectElement,
    {
      id:           "front.photo",
      kind:         "image",
      dataField:    "fotoUrl",
      x:            177,
      y:            192,
      width:        250,
      height:       335,
      clip:         { x: 177, y: 192, width: 250, height: 335 },
      rendererHint: "photo",
    } satisfies ImageElement,
    // ── Assinatura do condutor ───────────────────────────────────────────────
    {
      id:           "front.assinatura",
      kind:         "image",
      dataField:    "assinaturaUrl",
      x:            187,
      y:            580,
      width:        230,
      height:       54,
      rendererHint: "cleanSignature",
    } satisfies ImageElement,
    // ── Espelho / Formulário (topo esquerdo) ─────────────────────────────────
    {
      id:           "front.espelho",
      kind:         "text",
      dataField:    "espelho",
      x:            80,
      y:            110,
      font:         TIMES_24,
      color:        BLACK,
      align:        "left",
      rendererHint: "fallbackEspelhoRegistro",
    } satisfies TextElement,
    // ── Campos de texto (bold 19px Rawline) ──────────────────────────────────
    {
      id:        "front.nome",
      kind:      "text",
      dataField: "nome",
      x:         400,
      y:         215,
      font:      RAWLINE_19,
      color:     BLACK,
      align:     "left",
    } satisfies TextElement,
    {
      id:           "front.primeiraHabilitacao",
      kind:         "text",
      dataField:    "primeiraHabilitacao",
      x:            820,
      y:            215,
      font:         RAWLINE_19,
      color:        BLACK,
      align:        "left",
      rendererHint: "primeiraHabFallback",
    } satisfies TextElement,
    {
      id:           "front.nascimento",
      kind:         "composite_text",
      dataFields:   ["dataNascimento", "localNascimento", "ufNascimento"],
      joiner:       " - ",
      x:            460,
      y:            280,
      font:         RAWLINE_19,
      color:        BLACK,
      align:        "left",
      rendererHint: "compositeNascimento",
    } satisfies CompositeTextElement,
    {
      id:        "front.dataEmissao",
      kind:      "text",
      dataField: "dataEmissao",
      x:         460,
      y:         345,
      font:      RAWLINE_19,
      color:     BLACK,
      align:     "left",
    } satisfies TextElement,
    {
      id:        "front.validade",
      kind:      "text",
      dataField: "validade",
      x:         630,
      y:         345,
      font:      RAWLINE_19,
      color:     RED_SEC,
      align:     "left",
    } satisfies TextElement,
    {
      id:           "front.docIdentidade",
      kind:         "composite_text",
      dataFields:   ["rg", "orgaoEmissor", "ufRG"],
      joiner:       " ",
      x:            460,
      y:            410,
      font:         RAWLINE_19,
      color:        BLACK,
      align:        "left",
      rendererHint: "compositeDocId",
    } satisfies CompositeTextElement,
    {
      id:           "front.cpf",
      kind:         "text",
      dataField:    "cpf",
      x:            460,
      y:            475,
      font:         RAWLINE_19,
      color:        BLACK,
      align:        "left",
      rendererHint: "formatCPF",
    } satisfies TextElement,
    {
      id:        "front.registro",
      kind:      "text",
      dataField: "registro",
      x:         660,
      y:         475,
      font:      RAWLINE_19,
      color:     RED_SEC,
      align:     "left",
    } satisfies TextElement,
    {
      id:        "front.categoria",
      kind:      "text",
      dataField: "categoria",
      x:         860,
      y:         475,
      font:      RAWLINE_19,
      color:     RED_SEC,
      align:     "left",
    } satisfies TextElement,
    {
      id:        "front.nacionalidade",
      kind:      "text",
      dataField: "nacionalidade",
      x:         460,
      y:         538,
      font:      RAWLINE_19,
      color:     BLACK,
      align:     "left",
    } satisfies TextElement,
    // ── Filiação (bold 17px Rawline) ─────────────────────────────────────────
    {
      id:        "front.nomeMae",
      kind:      "text",
      dataField: "nomeMae",
      x:         460,
      y:         595,
      font:      RAWLINE_17,
      color:     BLACK,
      align:     "left",
    } satisfies TextElement,
    {
      id:        "front.nomePai",
      kind:      "text",
      dataField: "nomePai",
      x:         460,
      y:         625,
      font:      RAWLINE_17,
      color:     BLACK,
      align:     "left",
    } satisfies TextElement,
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// WALLET_BACK — Slide 2: Verso / Parte Inferior
// Source canvas: 963×680  |  Output: 680×963 (portrait após rotação)
// Background: /img/cnh-templates/parte_inferior.jpg
// ══════════════════════════════════════════════════════════════════════════════

export const WALLET_BACK_LAYOUT: WalletProfileLayout = {
  profileId:       "WALLET_BACK",
  sourceWidth:     963,
  sourceHeight:    680,
  outputWidth:     680,
  outputHeight:    963,
  outputTransform: WALLET_PORTRAIT_TRANSFORM,
  background:      "/img/cnh-templates/parte_inferior.jpg",
  elements: [
    // ── Espelho / Formulário (topo esquerdo) ─────────────────────────────────
    {
      id:           "back.espelho",
      kind:         "text",
      dataField:    "espelho",
      x:            80,
      y:            110,
      font:         TIMES_24,
      color:        BLACK,
      align:        "left",
      rendererHint: "fallbackEspelhoRegistro",
    } satisfies TextElement,
    // ── Nome do Estado por Extenso ───────────────────────────────────────────
    {
      id:           "back.estadoExtenso",
      kind:         "text",
      dataField:    "ufEmissao",
      x:            80,
      y:            400,
      font:         RAWLINE_32,
      color:        BLACK,
      align:        "left",
      rendererHint: "estadoExtenso",
    } satisfies TextElement,
    // ── Datas da Tabela de Categorias (vermelho, condicional) ─────────────────
    {
      id:        "back.validadeA",
      kind:      "conditional_text",
      dataField: "validade",
      condition: { field: "categoria", operator: "contains", value: "A" },
      x:         855,
      y:         232,
      font:      RAWLINE_15,
      color:     RED_SEC,
      align:     "left",
    } satisfies ConditionalTextElement,
    {
      id:        "back.validadeB",
      kind:      "conditional_text",
      dataField: "validade",
      condition: { field: "categoria", operator: "contains", value: "B" },
      x:         855,
      y:         296,
      font:      RAWLINE_15,
      color:     RED_SEC,
      align:     "left",
    } satisfies ConditionalTextElement,
    {
      id:        "back.validadeC",
      kind:      "conditional_text",
      dataField: "validade",
      condition: { field: "categoria", operator: "contains", value: "C" },
      x:         855,
      y:         360,
      font:      RAWLINE_15,
      color:     RED_SEC,
      align:     "left",
    } satisfies ConditionalTextElement,
    {
      id:        "back.validadeD",
      kind:      "conditional_text",
      dataField: "validade",
      condition: { field: "categoria", operator: "contains", value: "D" },
      x:         855,
      y:         590,
      font:      RAWLINE_15,
      color:     RED_SEC,
      align:     "left",
    } satisfies ConditionalTextElement,
    // ── Campo 12: Observações ────────────────────────────────────────────────
    {
      id:        "back.observacoes",
      kind:      "text",
      dataField: "observacoes",
      x:         180,
      y:         220,
      font:      RAWLINE_18,
      color:     BLACK,
      align:     "left",
    } satisfies TextElement,
    // ── Local e UF de Emissão ────────────────────────────────────────────────
    {
      id:           "back.localEmissao",
      kind:         "composite_text",
      dataFields:   ["localEmissao", "ufEmissao"],
      joiner:       ", ",
      x:            180,
      y:            595,
      font:         RAWLINE_18,
      color:        BLACK,
      align:        "left",
      rendererHint: "compositeLocalUF",
    } satisfies CompositeTextElement,
    // ── Assinatura Digital do Detran ─────────────────────────────────────────
    {
      id:           "back.assDigital",
      kind:         "composite_text",
      dataFields:   ["assDigital1", "assDigital2"],
      joiner:       " ",
      x:            330,
      y:            635,
      font:         RAWLINE_12,
      color:        BLACK,
      align:        "left",
      rendererHint: "compositeAssDetran",
    } satisfies CompositeTextElement,
  ],
};

// ── Lookups pré-computados para acesso direto pelo renderer ───────────────────
// Calculados na inicialização do módulo (não são callbacks).

export const WALLET_FRONT_ELEMENTS = Object.fromEntries(
  WALLET_FRONT_LAYOUT.elements.map(el => [el.id, el])
) as Record<string, WalletElement>;

export const WALLET_BACK_ELEMENTS = Object.fromEntries(
  WALLET_BACK_LAYOUT.elements.map(el => [el.id, el])
) as Record<string, WalletElement>;
