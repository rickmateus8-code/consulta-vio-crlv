/**
 * lib/engine/resolvers/textResolver.ts
 *
 * Resolvedor puro de elementos de texto (Phase 3B.2).
 * Transforma ElementDefinition (tipo TEXT) em ResolvedTextElement imutável e render-ready.
 */

import type { ElementDefinition } from '../types/elements';
import type { FormDefinition } from '../types/form';
import type { CanonicalData } from '../types/data';
import type { ElementGeometry } from '../types/geometry';
import type { ResolvedTextElement, ResolutionDiagnostic } from '../types/resolved';
import { createResolutionDiagnostic } from './types';

export interface TextResolutionResult {
  readonly element?: ResolvedTextElement;
  readonly diagnostics: readonly ResolutionDiagnostic[];
}

export function resolveTextElement(params: {
  readonly element: ElementDefinition;
  readonly form: FormDefinition;
  readonly data: CanonicalData;
  readonly pageId: string;
}): TextResolutionResult {
  const { element, form, data, pageId } = params;
  const diagnostics: ResolutionDiagnostic[] = [];

  const hasBinding = element.fieldBinding !== undefined && element.fieldBinding.trim() !== '';
  const hasStatic = element.staticValue !== undefined;

  // 1. Verificação XOR de Fonte de Texto
  if ((hasBinding && hasStatic) || (!hasBinding && !hasStatic)) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_TEXT_SOURCE',
        `Element '${element.id}' must specify exactly one of fieldBinding or staticValue (XOR violation)`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  let resolvedText = '';

  if (hasStatic) {
    resolvedText = element.staticValue ?? '';
  } else if (hasBinding && element.fieldBinding) {
    const bindingKey = element.fieldBinding;

    const fieldDef = form.fields.find(f => f.key === bindingKey);
    if (!fieldDef) {
      diagnostics.push(
        createResolutionDiagnostic(
          'error',
          'MISSING_BINDING',
          `Element '${element.id}' references unknown form field key '${bindingKey}' in FormDefinition '${form.id}'`,
          { pageId, elementId: element.id, path: bindingKey }
        )
      );
      return { diagnostics };
    }

    const isRequired = !!fieldDef.required;
    const rawValue = data[bindingKey];

    if (rawValue === undefined || rawValue === null) {
      if (isRequired) {
        diagnostics.push(
          createResolutionDiagnostic(
            'error',
            'MISSING_REQUIRED_VALUE',
            `Required field '${bindingKey}' for element '${element.id}' is missing or null`,
            { pageId, elementId: element.id, path: bindingKey }
          )
        );
        return { diagnostics };
      } else {
        resolvedText = '';
      }
    } else if (typeof rawValue === 'string') {
      resolvedText = rawValue;
    } else if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
      resolvedText = String(rawValue);
    } else {
      diagnostics.push(
        createResolutionDiagnostic(
          'error',
          'INVALID_TEXT_VALUE',
          `Field '${bindingKey}' has invalid text value type '${typeof rawValue}'. Expected string, number, or boolean.`,
          { pageId, elementId: element.id, path: bindingKey }
        )
      );
      return { diagnostics };
    }
  }

  if (element.textConfig?.uppercase) {
    resolvedText = resolvedText.toUpperCase();
  }

  // 2. Criação do Snapshot Imutável de Geometria e Estilo
  const geometry: ElementGeometry = {
    x: element.geometry.x,
    y: element.geometry.y,
    width: element.geometry.width,
    height: element.geometry.height,
    rotation: element.geometry.rotation,
    rotationOrigin: element.geometry.rotationOrigin,
    zIndex: element.geometry.zIndex,
  };

  const font = element.textConfig?.font
    ? {
        family: element.textConfig.font.family,
        size: element.textConfig.font.size,
        weight: element.textConfig.font.weight,
        style: element.textConfig.font.style,
      }
    : { family: 'sans-serif', size: 12, weight: 'normal' as const };

  const style = {
    font,
    color: element.textConfig?.color ?? '#000000',
    align: element.textConfig?.align ?? 'left',
    uppercase: element.textConfig?.uppercase,
    wordWrap: element.textConfig?.wordWrap,
  };

  const resolvedElement: ResolvedTextElement = {
    id: element.id,
    type: 'TEXT',
    geometry,
    text: resolvedText,
    style,
    zIndex: element.geometry.zIndex ?? 0,
  };

  return {
    element: resolvedElement,
    diagnostics,
  };
}
