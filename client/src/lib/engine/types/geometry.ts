/**
 * lib/engine/types/geometry.ts
 *
 * Modelo de geometria e métricas espaciais da Engine V1.
 * Representa coordenadas documentais reais em Engine Space neutro.
 */

export type TextAnchor = 'TOP_LEFT' | 'BASELINE_LEFT';

export interface ElementGeometry {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
  readonly zIndex?: number;
  readonly anchor?: TextAnchor;
}

/**
 * Métricas tipográficas resolvidas pelo renderizador no momento do render.
 * NÃO são fontes de verdade gravadas no modelo de design; são derivadas em tempo de execução.
 */
export interface TextMetrics {
  readonly ascent: number;
  readonly descent: number;
  readonly measuredWidth: number;
  readonly measuredHeight: number;
  readonly baselineOffset: number;
}

/**
 * Estado transitório de sessão do editor Studio (Interaction Chrome).
 * NÃO pertence à geometria do documento e NUNCA é persistido no DocumentDefinition/Layout.
 */
export interface EditorSessionState {
  readonly selectedElementId?: string | null;
  readonly hoveredElementId?: string | null;
  readonly activeHandle?: string | null;
  readonly isDragging?: boolean;
  readonly isResizing?: boolean;
  readonly guides?: readonly unknown[];
}
