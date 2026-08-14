/**
 * lib/engine/resolvers/documentResolver.ts
 *
 * Resolvedor Genérico Puro de Documentos e Páginas (Phase 3B.2).
 * Transforma definições de documento, layout e dados canônicos em um ResolvedRenderDocument snapshot.
 *
 * PROPRIEDADES:
 *  - 100% puro: sem I/O, DOM, React, Canvas API, fetch, Cloudflare ou D1.
 *  - Determinístico: mesma entrada gera exatamente a mesma saída.
 *  - Não-mutante: nenhum array ou objeto de entrada é alterado.
 *  - Snapshot: mutações posteriores nos inputs não afetam o resultado já resolvido.
 */

import type { Asset, AssetSet } from '../types/assets';
import type {
  ResolvedRenderDocument,
  ResolvedRenderPage,
  ResolvedCanvasTransform,
  ResolvedElement,
  ResolutionDiagnostic,
  ResolutionResult,
} from '../types/resolved';
import type { ResolveDocumentInput } from './types';
import {
  createResolutionDiagnostic,
  hasResolutionErrors,
  createResolutionSuccess,
  createResolutionFailure,
} from './types';
import { resolveTextElement } from './textResolver';

export function resolveDocument(input: ResolveDocumentInput): ResolutionResult {
  const diagnostics: ResolutionDiagnostic[] = [];

  // 1. Seleção Estrita de Profile
  const profile = input.doc.renderProfiles.find(p => p.id === input.profileId);
  if (!profile) {
    return createResolutionFailure([
      createResolutionDiagnostic(
        'error',
        'PROFILE_NOT_FOUND',
        `RenderProfile '${input.profileId}' was not found in document '${input.doc.id}'`
      ),
    ]);
  }

  // 2. Resolução Estrita do FormDefinition do Documento
  const form = input.forms.find(f => f.id === input.doc.formDefinitionId);
  if (!form) {
    return createResolutionFailure([
      createResolutionDiagnostic(
        'error',
        'FORM_NOT_FOUND',
        `FormDefinition '${input.doc.formDefinitionId}' referenced by document '${input.doc.id}' was not found in input.forms`
      ),
    ]);
  }

  // 3. Resolução Estrita do AssetSet do Documento (se declarado)
  let assetSet: AssetSet | undefined;
  if (input.doc.assetSetId) {
    assetSet = input.assetSets.find(a => a.id === input.doc.assetSetId);
    if (!assetSet) {
      return createResolutionFailure([
        createResolutionDiagnostic(
          'error',
          'ASSET_SET_NOT_FOUND',
          `AssetSet '${input.doc.assetSetId}' referenced by document '${input.doc.id}' was not found in input.assetSets`
        ),
      ]);
    }
  }

  const resolvedPages: ResolvedRenderPage[] = [];

  // 4. Materialização Determinística das Páginas
  for (let pageIndex = 0; pageIndex < profile.pages.length; pageIndex++) {
    const pageDef = profile.pages[pageIndex];

    const layout = input.layouts.find(l => l.id === pageDef.layoutId);
    if (!layout) {
      diagnostics.push(
        createResolutionDiagnostic(
          'error',
          'LAYOUT_NOT_FOUND',
          `LayoutDefinition '${pageDef.layoutId}' referenced by page '${pageDef.id}' was not found`,
          { pageId: pageDef.id }
        )
      );
      continue;
    }

    // Source Canvas (sempre derivado da LayoutDefinition)
    const sourceCanvas = { ...layout.canvas };

    // Output Canvas (materializado: explícito ou fallback para sourceCanvas)
    const outputCanvas = pageDef.outputCanvas ? { ...pageDef.outputCanvas } : { ...layout.canvas };

    // Canvas Transform (materializado: explícito ou identity default)
    const transform: ResolvedCanvasTransform = pageDef.transform
      ? {
          translateX: pageDef.transform.translateX ?? 0,
          translateY: pageDef.transform.translateY ?? 0,
          rotateDeg: pageDef.transform.rotateDeg ?? 0,
          scaleX: pageDef.transform.scaleX ?? 1,
          scaleY: pageDef.transform.scaleY ?? 1,
        }
      : {
          translateX: 0,
          translateY: 0,
          rotateDeg: 0,
          scaleX: 1,
          scaleY: 1,
        };

    // Lookup Lógico de Base Asset com Escopo Estrito no AssetSet do Documento
    let baseAsset: Asset | undefined;
    if (layout.baseAssetId) {
      if (!assetSet) {
        diagnostics.push(
          createResolutionDiagnostic(
            'error',
            'BASE_ASSET_NOT_FOUND',
            `Layout '${layout.id}' references baseAssetId '${layout.baseAssetId}' but document '${input.doc.id}' does not declare an assetSetId`,
            { pageId: pageDef.id }
          )
        );
      } else {
        const found = assetSet.assets.find(a => a.id === layout.baseAssetId);
        if (!found) {
          diagnostics.push(
            createResolutionDiagnostic(
              'error',
              'BASE_ASSET_NOT_FOUND',
              `Layout '${layout.id}' references baseAssetId '${layout.baseAssetId}' which was not found in scoped AssetSet '${assetSet.id}'`,
              { pageId: pageDef.id }
            )
          );
        } else {
          baseAsset = {
            id: found.id,
            name: found.name,
            type: found.type,
            mimeType: found.mimeType,
            storageRef: found.storageRef,
            dimensions: found.dimensions
              ? { width: found.dimensions.width, height: found.dimensions.height }
              : undefined,
          };
        }
      }
    }

    // Resolução de Elementos Suportados e Z-Order
    const indexedElements: Array<{ el: ResolvedElement; originalIndex: number }> = [];

    for (let elIdx = 0; elIdx < layout.elements.length; elIdx++) {
      const el = layout.elements[elIdx];

      // Elementos com visibility === false são filtrados ANTES de verificar suporte
      if (el.visibility === false) {
        continue;
      }

      if (el.type === 'TEXT') {
        const textRes = resolveTextElement({
          element: el,
          form,
          data: input.data,
          pageId: pageDef.id,
        });

        diagnostics.push(...textRes.diagnostics);

        if (textRes.element) {
          indexedElements.push({
            el: textRes.element,
            originalIndex: elIdx,
          });
        }
      } else {
        diagnostics.push(
          createResolutionDiagnostic(
            'error',
            'UNSUPPORTED_ELEMENT_TYPE',
            `Element '${el.id}' has unsupported type '${el.type}' in generic resolver (supported: TEXT)`,
            { pageId: pageDef.id, elementId: el.id }
          )
        );
      }
    }

    // Ordenação determinística: zIndex ASC com desempate por originalIndex ASC
    indexedElements.sort((a, b) => {
      const zDiff = a.el.zIndex - b.el.zIndex;
      if (zDiff !== 0) return zDiff;
      return a.originalIndex - b.originalIndex;
    });

    const pageElements = indexedElements.map(item => item.el);

    resolvedPages.push({
      pageId: pageDef.id,
      pageIndex,
      layoutId: layout.id,
      sourceCanvas,
      outputCanvas,
      transform,
      baseAsset,
      elements: pageElements,
    });
  }

  // 5. Verificação de Falhas Fatais
  if (hasResolutionErrors(diagnostics)) {
    return createResolutionFailure(diagnostics);
  }

  const resolvedDoc: ResolvedRenderDocument = {
    documentDefinitionId: input.doc.id,
    profileId: profile.id,
    pages: resolvedPages,
  };

  return createResolutionSuccess(resolvedDoc, diagnostics);
}
