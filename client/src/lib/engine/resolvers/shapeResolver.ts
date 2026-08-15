/**
 * lib/engine/resolvers/shapeResolver.ts
 *
 * Resolvedor puro de elementos de forma geométrica (Phase 3B.3C).
 * Transforma ElementDefinition (tipo SHAPE) em ResolvedShapeElement imutável e render-ready.
 */

import type { ElementDefinition } from '../types/elements';
import type { ElementGeometry } from '../types/geometry';
import type {
  ResolvedShapeElement,
  ResolutionDiagnostic,
} from '../types/resolved';
import { createResolutionDiagnostic } from './types';

export interface ShapeResolutionResult {
  readonly element?: ResolvedShapeElement;
  readonly diagnostics: readonly ResolutionDiagnostic[];
}

export function resolveShapeElement(params: {
  readonly element: ElementDefinition;
  readonly pageId: string;
}): ShapeResolutionResult {
  const { element, pageId } = params;
  const diagnostics: ResolutionDiagnostic[] = [];

  // 1. SHAPE não utiliza fieldBinding, staticValue nem assetRefId
  if (element.fieldBinding !== undefined && element.fieldBinding.trim() !== '') {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_SHAPE_SOURCE',
        `Element '${element.id}' of type 'SHAPE' cannot use fieldBinding.`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  if (element.staticValue !== undefined) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_SHAPE_SOURCE',
        `Element '${element.id}' of type 'SHAPE' cannot use staticValue.`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  if (element.assetRefId !== undefined && element.assetRefId.trim() !== '') {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_SHAPE_SOURCE',
        `Element '${element.id}' of type 'SHAPE' cannot use assetRefId.`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  // 2. Validação da presença e tipo de ShapeConfig
  const config = element.shapeConfig;
  if (!config) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_SHAPE_CONFIG',
        `Element '${element.id}' of type 'SHAPE' must declare shapeConfig`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  if (!['RECTANGLE', 'ELLIPSE'].includes(config.shapeType)) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_SHAPE_CONFIG',
        `Element '${element.id}' has invalid shapeType '${config.shapeType}' (expected 'RECTANGLE' or 'ELLIPSE')`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  // 3. Validação de Pintura (fillColor / strokeColor)
  const { fillColor, strokeColor, strokeWidth, cornerRadius, opacity: rawOpacity } = config;
  if (fillColor === undefined && strokeColor === undefined) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_SHAPE_CONFIG',
        `Element '${element.id}' must declare at least fillColor or strokeColor`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  // 4. Consistência de Stroke
  if (strokeColor !== undefined) {
    if (strokeWidth === undefined) {
      diagnostics.push(
        createResolutionDiagnostic(
          'error',
          'INVALID_SHAPE_CONFIG',
          `Element '${element.id}' has strokeColor but missing strokeWidth`,
          { pageId, elementId: element.id }
        )
      );
      return { diagnostics };
    }
    if (!Number.isFinite(strokeWidth) || strokeWidth <= 0) {
      diagnostics.push(
        createResolutionDiagnostic(
          'error',
          'INVALID_SHAPE_CONFIG',
          `Element '${element.id}' strokeWidth must be a finite number > 0 (received: ${strokeWidth})`,
          { pageId, elementId: element.id }
        )
      );
      return { diagnostics };
    }
  } else {
    if (strokeWidth !== undefined && strokeWidth > 0) {
      diagnostics.push(
        createResolutionDiagnostic(
          'error',
          'INVALID_SHAPE_CONFIG',
          `Element '${element.id}' has strokeWidth without strokeColor`,
          { pageId, elementId: element.id }
        )
      );
      return { diagnostics };
    }
  }

  // 5. Validação de Corner Radius (apenas RECTANGLE)
  if (cornerRadius !== undefined) {
    if (config.shapeType === 'ELLIPSE') {
      diagnostics.push(
        createResolutionDiagnostic(
          'error',
          'INVALID_SHAPE_CONFIG',
          `Element '${element.id}' of shapeType 'ELLIPSE' cannot declare cornerRadius`,
          { pageId, elementId: element.id }
        )
      );
      return { diagnostics };
    }
    if (!Number.isFinite(cornerRadius) || cornerRadius < 0) {
      diagnostics.push(
        createResolutionDiagnostic(
          'error',
          'INVALID_SHAPE_CONFIG',
          `Element '${element.id}' cornerRadius must be a finite number >= 0 (received: ${cornerRadius})`,
          { pageId, elementId: element.id }
        )
      );
      return { diagnostics };
    }
  }

  // 6. Validação de Opacidade
  let opacity = 1.0;
  if (rawOpacity !== undefined) {
    if (!Number.isFinite(rawOpacity) || rawOpacity < 0 || rawOpacity > 1) {
      diagnostics.push(
        createResolutionDiagnostic(
          'error',
          'INVALID_SHAPE_CONFIG',
          `Element '${element.id}' opacity must be a finite number between 0 and 1 (received: ${rawOpacity})`,
          { pageId, elementId: element.id }
        )
      );
      return { diagnostics };
    }
    opacity = rawOpacity;
  }

  // 7. Construção do Snapshot Imutável
  const geometry: ElementGeometry = {
    x: element.geometry.x,
    y: element.geometry.y,
    width: element.geometry.width,
    height: element.geometry.height,
    rotation: element.geometry.rotation,
    rotationOrigin: element.geometry.rotationOrigin,
    zIndex: element.geometry.zIndex,
    anchor: element.geometry.anchor,
  };

  const resolvedElement: ResolvedShapeElement = {
    id: element.id,
    type: 'SHAPE',
    geometry,
    shapeType: config.shapeType,
    fillColor,
    strokeColor,
    strokeWidth,
    cornerRadius: config.shapeType === 'RECTANGLE' ? cornerRadius : undefined,
    opacity,
    zIndex: element.geometry.zIndex ?? 0,
  };

  return {
    element: resolvedElement,
    diagnostics,
  };
}
