/**
 * CNH DIGITAL VIO LAYOUT CONFIGURATION
 * Single Source of Truth (SSOT) para coordenadas e renderização forense 1:1 da CNH (/cnhcria).
 * Permite ajuste arrastável no Studio Engine e sincronia instantânea.
 */

export interface CNHFieldPosition {
  x: number;
  y: number;
  fontSize: number;
  color?: string;
  maxWidth?: number;
  letterSpacing?: string;
}

export const CNH_DEFAULT_LAYOUT = {
  shiftX: 22,
  
  fields: {
    nome: { x: 304, y: 463, fontSize: 21, color: "#000000", maxWidth: 600, letterSpacing: "1px" },
    primeiraHabilitacao: { x: 969, y: 463, fontSize: 21, color: "#000000", maxWidth: 130 },
    nascimento: { x: 599, y: 523, fontSize: 20, color: "#000000", maxWidth: 335 },
    docIdentidade: { x: 599, y: 644, fontSize: 20, color: "#000000", maxWidth: 335 },
    dataEmissao: { x: 599, y: 583, fontSize: 20, color: "#000000", maxWidth: 180 },
    validade: { x: 786, y: 583, fontSize: 20, color: "#c0392b", maxWidth: 160 },
    acc: { x: 1074, y: 572, fontSize: 46.5, color: "#000000", maxWidth: 60 },
    cpf: { x: 599, y: 704, fontSize: 20, color: "#000000", maxWidth: 215 },
    registro: { x: 805, y: 704, fontSize: 20, color: "#c0392b", maxWidth: 175 },
    categoria: { x: 1007, y: 704, fontSize: 21.5, color: "#c0392b", maxWidth: 80 },
    nacionalidade: { x: 599, y: 764, fontSize: 20, color: "#000000", maxWidth: 405 },
    nomePai: { x: 599, y: 832, fontSize: 19, color: "#000000", maxWidth: 415 },
    nomeMae: { x: 599, y: 904, fontSize: 19, color: "#000000", maxWidth: 415 },
    observacoes: { x: 299, y: 1334, fontSize: 19.9, color: "#000000", maxWidth: 740 },
    localEmissao: { x: 295, y: 1579, fontSize: 20, color: "#000000", maxWidth: 500 },
    nomeEstadoExtenso: { x: 600, y: 1668, fontSize: 43.9, color: "#000000" },
    assDigital1: { x: 965, y: 1559, fontSize: 18.2, color: "#222222" },
    assDigital2: { x: 915, y: 1584, fontSize: 18.2, color: "#222222" },
    espelho: { x: 208, y: 952, fontSize: 40, color: "#000000" },
    qrCode: { x: 1350, y: 1430, size: 860 }
  }
};

// Carrega layout salvo no localStorage (se configurado via Studio visualmente)
export function getActiveCNHLayout() {
  try {
    const saved = localStorage.getItem("docmaster_cnh_layout_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...CNH_DEFAULT_LAYOUT, fields: { ...CNH_DEFAULT_LAYOUT.fields, ...parsed.fields } };
    }
  } catch {}
  return CNH_DEFAULT_LAYOUT;
}

export function saveActiveCNHLayout(layoutConfig: any) {
  try {
    localStorage.setItem("docmaster_cnh_layout_config", JSON.stringify(layoutConfig));
  } catch {}
}

// ─── Geometry Bridge — CNHLayout ──────────────────────────────────────────────
// Tipo estruturado para a Geometry Bridge Fase 1.
// Coordenadas no espaço do Canvas 2481×3508 (prontas para drawCNHToCanvas).

export interface CNHFieldLayout {
  /** Coordenada X no canvas 2481×3508. Para textAlign="center": já é a âncora central. */
  x: number;
  /** Coordenada Y no canvas 2481×3508. */
  y: number;
  /** maxWidth do campo (ctx.fillText maxWidth). */
  w: number;
  /** Altura do box em canvas (informativo). */
  h: number;
  /** fontSize no canvas (px). */
  fontSize: number;
  /** Alinhamento do texto. */
  textAlign: "left" | "center" | "right";
}

export interface CNHLogoLayout {
  /** Coordenada X do clip rect no canvas. */
  x: number;
  /** Coordenada Y do clip rect no canvas. */
  y: number;
  /** Largura do clip rect no canvas. */
  w: number;
  /** Altura do clip rect no canvas. */
  h: number;
}

export interface CNHQRLayout {
  /** Coordenada X do QR no canvas. */
  x: number;
  /** Coordenada Y do QR no canvas. */
  y: number;
  /** Tamanho (largura = altura) do QR no canvas. */
  size: number;
}

export interface CNHLayout {
  // Campos de texto
  nome: CNHFieldLayout;
  primeiraHabilitacao: CNHFieldLayout;
  nascimento: CNHFieldLayout;
  dataEmissao: CNHFieldLayout;
  validade: CNHFieldLayout;
  acc: CNHFieldLayout;
  docIdentidade: CNHFieldLayout;
  cpf: CNHFieldLayout;
  registro: CNHFieldLayout;
  categoria: CNHFieldLayout;
  nacionalidade: CNHFieldLayout;
  nomePai: CNHFieldLayout;
  nomeMae: CNHFieldLayout;
  observacoes: CNHFieldLayout;
  localEmissao: CNHFieldLayout;
  nomeEstadoExtenso: CNHFieldLayout;
  assDigital1: CNHFieldLayout;
  assDigital2: CNHFieldLayout;
  // Imagens
  foto: CNHLogoLayout;
  assinatura: CNHLogoLayout;
  // QR Code
  qr: CNHQRLayout;
}

/**
 * Fallback hardcoded da Geometry Bridge Fase 1.
 * Espelha EXATAMENTE os literais atuais de drawCNHToCanvas() em CNHDocument.tsx.
 * SHIFT_X=22 já incorporado em todos os valores de x (campo.x + 22 = canvas_x).
 *
 * Esta função é a fonte de verdade do fallback — nunca apagar antes do D1 estar validado.
 */
export function getHardcodedLayout(): CNHLayout {
  // SHIFT_X = 22, incorporado abaixo como nos literais de CNHDocument.tsx
  return {
    nome:               { x: 304+22, y: 463,  w: 600,  h: 28,  fontSize: 21,   textAlign: "left" },
    primeiraHabilitacao:{ x: 969+22, y: 463,  w: 130,  h: 28,  fontSize: 21,   textAlign: "left" },
    nascimento:         { x: 599+22, y: 523,  w: 335,  h: 25,  fontSize: 20,   textAlign: "left" },
    dataEmissao:        { x: 599+22, y: 583,  w: 180,  h: 25,  fontSize: 20,   textAlign: "left" },
    validade:           { x: 786+22, y: 583,  w: 160,  h: 25,  fontSize: 20,   textAlign: "left" },
    acc:                { x:1074+22, y: 572,  w: 60,   h: 58,  fontSize: 46.5, textAlign: "left" },
    docIdentidade:      { x: 599+22, y: 644,  w: 335,  h: 25,  fontSize: 20,   textAlign: "left" },
    cpf:                { x: 599+22, y: 704,  w: 215,  h: 25,  fontSize: 20,   textAlign: "left" },
    registro:           { x: 805+22, y: 704,  w: 175,  h: 25,  fontSize: 20,   textAlign: "left" },
    categoria:          { x:1007+22, y: 704,  w: 80,   h: 30,  fontSize: 21.5, textAlign: "left" },
    nacionalidade:      { x: 599+22, y: 764,  w: 405,  h: 25,  fontSize: 20,   textAlign: "left" },
    nomePai:            { x: 599+22, y: 832,  w: 415,  h: 24,  fontSize: 19,   textAlign: "left" },
    nomeMae:            { x: 599+22, y: 904,  w: 415,  h: 24,  fontSize: 19,   textAlign: "left" },
    observacoes:        { x: 299+22, y:1334,  w: 740,  h: 60,  fontSize: 19.9, textAlign: "left" },
    localEmissao:       { x: 295+22, y:1579,  w: 500,  h: 25,  fontSize: 20,   textAlign: "left" },
    // nomeEstadoExtenso: textAlign=center, âncora em x=600+22 (ctx.textAlign="center" → fillText(texto, 622, 1668))
    nomeEstadoExtenso:  { x: 600+22, y:1668,  w: 0,    h: 54,  fontSize: 43.9, textAlign: "center" },
    // assDigital1: textAlign=center, âncora em x=965+22
    assDigital1:        { x: 965+22, y:1559,  w: 0,    h: 23,  fontSize: 18.2, textAlign: "center" },
    assDigital2:        { x: 915+22, y:1584,  w: 0,    h: 23,  fontSize: 18.2, textAlign: "left" },
    // Imagens (clip rects hardcoded)
    foto:     { x: 292+22, y: 558, w: 263, h: 322 },
    assinatura:{ x: 311+22, y: 893, w: 236, h: 68  },
    // QR
    qr: { x: 1350+22, y: 370, size: 860 },
  };
}
