/**
 * lib/engine/types/resolved.ts
 *
 * Contratos do Resolved Render Model e Resultado de Resolução (Phase 3B.1).
 * Modelo snapshot puro, imutável e agnóstico de plataforma gerado pelo Resolver para renderização.
 *
 * INVARIANTES:
 *  - Distinção explícita entre sourceCanvas (Engine Space) e outputCanvas (Display/Export Space).
 *  - transform e outputCanvas SEMPRE materializados no ResolvedRenderPage (zero indefinição para o renderer).
 *  - Zero dependência de browser, DOM, Canvas API, React ou fetch.
 *  - Zero chaves específicas de CNH (sem fotoUrl, assinaturaUrl, registro, etc.).
 *  - Rotações expressas em graus decimais (degrees).
 */

import type { CanvasDefinition, ColorValue, FontSpec } from './primitives';
import type { CanvasTransform, ElementGeometry } from './geometry';
import type { Asset, AssetType } from './assets';

export interface ResolvedTextElement {
  readonly id: string;
  readonly type: 'TEXT';
  readonly geometry: ElementGeometry;
  readonly text: string;
  readonly style: {
    readonly font: FontSpec;
    readonly color: ColorValue;
    readonly align: 'left' | 'center' | 'right';
    readonly uppercase?: boolean;
    readonly wordWrap?: boolean;
    readonly letterSpacing?: string;
  };
  readonly zIndex: number;
}

export interface ResolvedAssetReference {
  readonly id: string;
  readonly type: AssetType;
  readonly storageRef: string;
  readonly mimeType: string;
  readonly dimensions?: {
    readonly width: number;
    readonly height: number;
  };
}

export interface ResolvedImageElement {
  readonly id: string;
  readonly type: 'IMAGE';
  readonly geometry: ElementGeometry;
  readonly asset: ResolvedAssetReference;
  readonly presentation: {
    readonly fit: 'contain' | 'cover' | 'fill' | 'none';
    readonly opacity: number;
  };
  readonly zIndex: number;
}

export interface ResolvedPhotoElement {
  readonly id: string;
  readonly type: 'PHOTO';
  readonly geometry: ElementGeometry;
  readonly mediaRef?: string;
  readonly scale?: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly zIndex: number;
}

export interface ResolvedSignatureElement {
  readonly id: string;
  readonly type: 'SIGNATURE';
  readonly geometry: ElementGeometry;
  readonly mediaRef?: string;
  readonly scale?: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly zIndex: number;
}

export interface ResolvedQRCodeElement {
  readonly id: string;
  readonly type: 'QR_CODE';
  readonly geometry: ElementGeometry;
  readonly content: string;
  readonly errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  readonly zIndex: number;
}

export interface ResolvedMRZElement {
  readonly id: string;
  readonly type: 'MRZ';
  readonly geometry: ElementGeometry;
  readonly lines: readonly string[];
  readonly font: FontSpec;
  readonly zIndex: number;
}

export interface ResolvedBarcodeElement {
  readonly id: string;
  readonly type: 'BARCODE';
  readonly geometry: ElementGeometry;
  readonly format: string;
  readonly value: string;
  readonly zIndex: number;
}

export interface ResolvedShapeElement {
  readonly id: string;
  readonly type: 'SHAPE';
  readonly geometry: ElementGeometry;
  readonly shapeType: 'RECTANGLE' | 'ELLIPSE';
  readonly fillColor?: ColorValue;
  readonly strokeColor?: ColorValue;
  readonly strokeWidth?: number;
  readonly cornerRadius?: number;
  readonly opacity: number;
  readonly zIndex: number;
}

export interface ResolvedLineElement {
  readonly id: string;
  readonly type: 'LINE';
  readonly geometry: ElementGeometry;
  readonly strokeColor: ColorValue;
  readonly strokeWidth: number;
  readonly opacity: number;
  readonly zIndex: number;
}

export interface ResolvedTableElement {
  readonly id: string;
  readonly type: 'TABLE';
  readonly geometry: ElementGeometry;
  readonly rows: number;
  readonly cols: number;
  readonly zIndex: number;
}

export type ResolvedElement =
  | ResolvedTextElement
  | ResolvedImageElement
  | ResolvedPhotoElement
  | ResolvedSignatureElement
  | ResolvedQRCodeElement
  | ResolvedMRZElement
  | ResolvedBarcodeElement
  | ResolvedShapeElement
  | ResolvedLineElement
  | ResolvedTableElement;

/**
 * Snapshot de uma página resolvida pronta para renderização.
 */
/**
 * Transformação global do Canvas 100% materializada no resolved model (todos os campos obrigatórios).
 */
export interface ResolvedCanvasTransform {
  readonly translateX: number;
  readonly translateY: number;
  readonly rotateDeg: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

/**
 * Snapshot de uma página resolvida pronta para renderização.
 */
export interface ResolvedRenderPage {
  /** Identificador estável da página de origem (PageDefinition.id). */
  readonly pageId: string;
  /** Índice determinístico da página no perfil (0-based). */
  readonly pageIndex: number;
  /** LayoutDefinition de origem em Source Space. */
  readonly layoutId: string;
  /** Canvas do Source Space (onde ElementGeometry é interpretada). */
  readonly sourceCanvas: CanvasDefinition;
  /** Canvas do Output Space (dimensões finais entregues ao renderizador). */
  readonly outputCanvas: CanvasDefinition;
  /** Transformação global estrita e materializada aplicada ao canvas (T x R x S). */
  readonly transform: ResolvedCanvasTransform;
  /** Asset de fundo base da página (se configurado no layout). */
  readonly baseAsset?: Asset;
  /** Elementos ordenados deterministamente por zIndex e sequência original. */
  readonly elements: readonly ResolvedElement[];
}

/**
 * Snapshot do documento resolvido pronto para renderização ou exportação.
 */
export interface ResolvedRenderDocument {
  readonly documentDefinitionId: string;
  readonly profileId: string;
  readonly pages: readonly ResolvedRenderPage[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

// ─── Diagnósticos e Resultado da Resolução ────────────────────────────────────

export type ResolutionDiagnosticLevel = 'warning' | 'error';

export interface ResolutionDiagnostic {
  readonly level: ResolutionDiagnosticLevel;
  readonly code: string;
  readonly message: string;
  readonly pageId?: string;
  readonly elementId?: string;
  readonly path?: string;
}

export interface ResolutionSuccess {
  readonly ok: true;
  readonly document: ResolvedRenderDocument;
  readonly diagnostics: readonly ResolutionDiagnostic[];
}

export interface ResolutionFailure {
  readonly ok: false;
  readonly diagnostics: readonly ResolutionDiagnostic[];
}

export type ResolutionResult = ResolutionSuccess | ResolutionFailure;
