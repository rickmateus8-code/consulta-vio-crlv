/**
 * lib/engine/resolvers/lineResolver.ts
 *
 * Resolvedor puro de elementos de linha (Phase 3B.3D-B).
 * Transforma ElementDefinition (tipo LINE) em ResolvedLineElement imutável e render-ready.
 */

import type { ElementDefinition } from '../types/elements';
import type { ElementGeometry } from '../types/geometry';
import type {
  ResolvedLineElement,
  ResolutionDiagnostic,
} from '../types/resolved';
import { createResolutionDiagnostic } from './types';

export interface LineResolutionResult {
  readonly element?: ResolvedLineElement;
  readonly diagnostics: readonly ResolutionDiagnostic[];
}

export function resolveLineElement(params: {
  readonly element: ElementDefinition;
  readonly pageId: string;
}): LineResolutionResult {
  const { element, pageId } = params;
  const diagnostics: ResolutionDiagnostic[] = [];

  // 1. LINE não utiliza fieldBinding, staticValue nem assetRefId
  if (element.fieldBinding !== undefined && element.fieldBinding.trim() !== '') {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_LINE_SOURCE',
        `Element '${element.id}' of type 'LINE' cannot use fieldBinding.`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  if (element.staticValue !== undefined) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_LINE_SOURCE',
        `Element '${element.id}' of type 'LINE' cannot use staticValue.`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  if (element.assetRefId !== undefined && element.assetRefId.trim() !== '') {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_LINE_SOURCE',
        `Element '${element.id}' of type 'LINE' cannot use assetRefId.`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  // 2. Validação da presença de lineConfig
  const config = element.lineConfig;
  if (!config) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_LINE_CONFIG',
        `Element '${element.id}' of type 'LINE' must declare lineConfig`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  // 3. Validação geométrica estrita da LINE (height === 0 e width > 0)
  if (element.geometry.height !== 0) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_LINE_CONFIG',
        `Element '${element.id}' of type 'LINE' must have geometry.height === 0 (received: ${element.geometry.height})`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  if (!Number.isFinite(element.geometry.width) || element.geometry.width <= 0) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_LINE_CONFIG',
        `Element '${element.id}' of type 'LINE' must have geometry.width > 0 (received: ${element.geometry.width})`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  // 4. Validação de strokeColor
  const { strokeColor, strokeWidth, opacity: rawOpacity } = config;
  if (!strokeColor || strokeColor.trim() === '') {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_LINE_CONFIG',
        `Element '${element.id}' of type 'LINE' must declare strokeColor`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  // 5. Validação de strokeWidth
  if (!Number.isFinite(strokeWidth) || strokeWidth <= 0) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_LINE_CONFIG',
        `Element '${element.id}' strokeWidth must be a finite number > 0 (received: ${strokeWidth})`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  // 6. Validação de Opacidade
  let opacity = 1.0;
  if (rawOpacity !== undefined) {
    if (!Number.isFinite(rawOpacity) || rawOpacity < 0 || rawOpacity > 1) {
      diagnostics.push(
        createResolutionDiagnostic(
          'error',
          'INVALID_LINE_CONFIG',
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
    height: 0,
    rotation: element.geometry.rotation,
    rotationOrigin: element.geometry.rotationOrigin,
    zIndex: element.geometry.zIndex,
    anchor: element.geometry.anchor,
  };

  const resolvedElement: ResolvedLineElement = {
    id: element.id,
    type: 'LINE',
    geometry,
    strokeColor,
    strokeWidth,
    opacity,
    zIndex: element.geometry.zIndex ?? 0,
  };

  return {
    element: resolvedElement,
    diagnostics,
  };
}
