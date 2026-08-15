/**
 * lib/engine/resolvers/imageResolver.ts
 *
 * Resolvedor puro de elementos de imagem estática (Phase 3B.3B).
 * Transforma ElementDefinition (tipo IMAGE) em ResolvedImageElement imutável e render-ready.
 */

import type { AssetSet, AssetType } from '../types/assets';
import type { ElementDefinition } from '../types/elements';
import type { ElementGeometry } from '../types/geometry';
import type {
  ResolvedImageElement,
  ResolvedAssetReference,
  ResolutionDiagnostic,
} from '../types/resolved';
import { createResolutionDiagnostic } from './types';

export interface ImageResolutionResult {
  readonly element?: ResolvedImageElement;
  readonly diagnostics: readonly ResolutionDiagnostic[];
}

const COMPATIBLE_IMAGE_ASSET_TYPES = new Set<AssetType>([
  'logo',
  'seal',
  'watermark',
  'overlay',
  'static_image',
]);

export function resolveImageElement(params: {
  readonly element: ElementDefinition;
  readonly assetSet?: AssetSet;
  readonly pageId: string;
}): ImageResolutionResult {
  const { element, assetSet, pageId } = params;
  const diagnostics: ResolutionDiagnostic[] = [];

  // 1. Validação de assetRefId
  if (!element.assetRefId || element.assetRefId.trim() === '') {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'MISSING_ELEMENT_ASSET_REF',
        `Element '${element.id}' of type 'IMAGE' must specify a valid assetRefId`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  // 2. Proibição de Fontes de Dados Dinâmicas para IMAGE Estática
  if (element.fieldBinding !== undefined && element.fieldBinding.trim() !== '') {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_IMAGE_SOURCE',
        `Element '${element.id}' of type 'IMAGE' cannot use fieldBinding. Static IMAGE must reference an asset via assetRefId.`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  if (element.staticValue !== undefined) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_IMAGE_SOURCE',
        `Element '${element.id}' of type 'IMAGE' cannot use staticValue.`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  // 3. Lookup do Asset no Escopo Estrito do AssetSet
  if (!assetSet) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'ASSET_SET_NOT_FOUND',
        `No AssetSet available to resolve assetRefId '${element.assetRefId}' for element '${element.id}'`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  const asset = assetSet.assets.find(a => a.id === element.assetRefId);
  if (!asset) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'ELEMENT_ASSET_NOT_FOUND',
        `Asset '${element.assetRefId}' referenced by element '${element.id}' was not found in AssetSet '${assetSet.id}'`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  // 4. Compatibilidade de Tipo de Asset
  if (!COMPATIBLE_IMAGE_ASSET_TYPES.has(asset.type)) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_ELEMENT_ASSET_TYPE',
        `Asset '${asset.id}' has incompatible type '${asset.type}' for IMAGE element. Allowed types: logo, seal, watermark, overlay, static_image.`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  // 5. Validação de ImageConfig e Fit Explícito
  const config = element.imageConfig;
  if (!config || !config.fit || !['contain', 'cover', 'fill', 'none'].includes(config.fit)) {
    diagnostics.push(
      createResolutionDiagnostic(
        'error',
        'INVALID_IMAGE_CONFIG',
        `Element '${element.id}' must declare explicit imageConfig.fit ('contain' | 'cover' | 'fill' | 'none')`,
        { pageId, elementId: element.id }
      )
    );
    return { diagnostics };
  }

  let opacity = 1.0;
  if (config.opacity !== undefined) {
    if (!Number.isFinite(config.opacity) || config.opacity < 0 || config.opacity > 1) {
      diagnostics.push(
        createResolutionDiagnostic(
          'error',
          'INVALID_IMAGE_CONFIG',
          `Element '${element.id}' imageConfig.opacity must be a finite number between 0 and 1 (received: ${config.opacity})`,
          { pageId, elementId: element.id }
        )
      );
      return { diagnostics };
    }
    opacity = config.opacity;
  }

  // 6. Construção do Snapshot Imutável
  const geometry: ElementGeometry = {
    x: element.geometry.x,
    y: element.geometry.y,
    width: element.geometry.width,
    height: element.geometry.height,
    rotation: element.geometry.rotation,
    rotationOrigin: element.geometry.rotationOrigin,
    zIndex: element.geometry.zIndex,
  };

  const resolvedAsset: ResolvedAssetReference = {
    id: asset.id,
    type: asset.type,
    storageRef: asset.storageRef,
    mimeType: asset.mimeType,
    dimensions: asset.dimensions
      ? { width: asset.dimensions.width, height: asset.dimensions.height }
      : undefined,
  };

  const presentation = {
    fit: config.fit,
    opacity,
  };

  const resolvedElement: ResolvedImageElement = {
    id: element.id,
    type: 'IMAGE',
    geometry,
    asset: resolvedAsset,
    presentation,
    zIndex: element.geometry.zIndex ?? 0,
  };

  return {
    element: resolvedElement,
    diagnostics,
  };
}
