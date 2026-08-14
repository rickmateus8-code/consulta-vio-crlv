/**
 * lib/engine/contracts/invariants.ts
 *
 * Validadores puros de invariantes estruturais da DocMaster Engine V1.
 * Sem dependências de DOM, React, banco de dados ou ambiente de execução.
 */

import type { CanvasDefinition } from '../types/primitives';
import type { ElementGeometry } from '../types/geometry';
import type { FormDefinition } from '../types/form';
import type { AssetSet } from '../types/assets';
import type { LayoutDefinition } from '../types/layout';
import type { RenderProfile } from '../types/renderProfile';
import type { DocumentDefinition } from '../types/document';

export function validateCanvasDefinition(canvas: CanvasDefinition): string[] {
  const errors: string[] = [];
  if (!canvas) {
    errors.push('CanvasDefinition is required');
    return errors;
  }
  if (!Number.isFinite(canvas.width) || canvas.width <= 0) {
    errors.push(`Canvas width must be a positive finite number, received ${canvas.width}`);
  }
  if (!Number.isFinite(canvas.height) || canvas.height <= 0) {
    errors.push(`Canvas height must be a positive finite number, received ${canvas.height}`);
  }
  if (!['px', 'pt', 'mm', 'in'].includes(canvas.unit)) {
    errors.push(`Invalid canvas unit: ${canvas.unit}`);
  }
  if (!['portrait', 'landscape', 'square', 'custom'].includes(canvas.orientation)) {
    errors.push(`Invalid canvas orientation: ${canvas.orientation}`);
  }
  if (canvas.dpi !== undefined && (!Number.isFinite(canvas.dpi) || canvas.dpi <= 0)) {
    errors.push(`Canvas dpi must be a positive finite number when defined, received ${canvas.dpi}`);
  }
  return errors;
}

export function validateElementGeometry(geo: ElementGeometry): string[] {
  const errors: string[] = [];
  if (!geo) {
    errors.push('ElementGeometry is required');
    return errors;
  }
  if (!Number.isFinite(geo.x)) errors.push(`Geometry x must be finite, received ${geo.x}`);
  if (!Number.isFinite(geo.y)) errors.push(`Geometry y must be finite, received ${geo.y}`);
  if (!Number.isFinite(geo.width) || geo.width < 0) {
    errors.push(`Geometry width must be a non-negative finite number, received ${geo.width}`);
  }
  if (!Number.isFinite(geo.height) || geo.height < 0) {
    errors.push(`Geometry height must be a non-negative finite number, received ${geo.height}`);
  }
  if (geo.rotation !== undefined && !Number.isFinite(geo.rotation)) {
    errors.push(`Geometry rotation must be finite when defined, received ${geo.rotation}`);
  }
  if (geo.zIndex !== undefined && !Number.isFinite(geo.zIndex)) {
    errors.push(`Geometry zIndex must be finite when defined, received ${geo.zIndex}`);
  }
  return errors;
}

export function validateFormDefinition(form: FormDefinition): string[] {
  const errors: string[] = [];
  if (!form) {
    errors.push('FormDefinition is required');
    return errors;
  }
  if (!form.id || form.id.trim() === '') errors.push('FormDefinition id cannot be empty');
  if (!form.name || form.name.trim() === '') errors.push('FormDefinition name cannot be empty');
  if (!Number.isFinite(form.version) || form.version < 1) errors.push('FormDefinition version must be >= 1');

  if (!Array.isArray(form.fields)) {
    errors.push('FormDefinition fields must be an array');
    return errors;
  }

  const seenKeys = new Set<string>();
  const seenIds = new Set<string>();

  for (let i = 0; i < form.fields.length; i++) {
    const f = form.fields[i];
    if (!f.id || f.id.trim() === '') errors.push(`Field [${i}] id cannot be empty`);
    else if (seenIds.has(f.id)) errors.push(`Duplicate field id: ${f.id}`);
    else seenIds.add(f.id);

    if (!f.key || f.key.trim() === '') errors.push(`Field [${i}] key cannot be empty`);
    else if (seenKeys.has(f.key)) errors.push(`Duplicate field key: ${f.key}`);
    else seenKeys.add(f.key);

    if (!f.label || f.label.trim() === '') errors.push(`Field [${f.key || i}] label cannot be empty`);
  }

  return errors;
}

export function validateAssetSet(assetSet: AssetSet): string[] {
  const errors: string[] = [];
  if (!assetSet) {
    errors.push('AssetSet is required');
    return errors;
  }
  if (!assetSet.id || assetSet.id.trim() === '') errors.push('AssetSet id cannot be empty');
  if (!assetSet.name || assetSet.name.trim() === '') errors.push('AssetSet name cannot be empty');

  if (!Array.isArray(assetSet.assets)) {
    errors.push('AssetSet assets must be an array');
    return errors;
  }

  const seenAssetIds = new Set<string>();
  for (let i = 0; i < assetSet.assets.length; i++) {
    const a = assetSet.assets[i];
    if (!a.id || a.id.trim() === '') errors.push(`Asset [${i}] id cannot be empty`);
    else if (seenAssetIds.has(a.id)) errors.push(`Duplicate asset id in AssetSet: ${a.id}`);
    else seenAssetIds.add(a.id);

    if (!a.storageRef || a.storageRef.trim() === '') errors.push(`Asset ${a.id || i} storageRef cannot be empty`);
  }

  return errors;
}

export function validateLayoutDefinition(
  layout: LayoutDefinition,
  form?: FormDefinition,
  assetSet?: AssetSet
): string[] {
  const errors: string[] = [];
  if (!layout) {
    errors.push('LayoutDefinition is required');
    return errors;
  }
  if (!layout.id || layout.id.trim() === '') errors.push('LayoutDefinition id cannot be empty');
  if (!layout.name || layout.name.trim() === '') errors.push('LayoutDefinition name cannot be empty');

  errors.push(...validateCanvasDefinition(layout.canvas));

  if (!Array.isArray(layout.elements)) {
    errors.push('LayoutDefinition elements must be an array');
    return errors;
  }

  if (layout.baseAssetId && assetSet) {
    const baseExists = assetSet.assets.some(a => a.id === layout.baseAssetId);
    if (!baseExists) {
      errors.push(`Layout baseAssetId '${layout.baseAssetId}' was not found in AssetSet '${assetSet.id}'`);
    }
  }

  const validFormKeys = form ? new Set(form.fields.map(f => f.key)) : null;
  const validAssetIds = assetSet ? new Set(assetSet.assets.map(a => a.id)) : null;
  const seenElementIds = new Set<string>();

  for (let i = 0; i < layout.elements.length; i++) {
    const el = layout.elements[i];
    if (!el.id || el.id.trim() === '') errors.push(`Element [${i}] id cannot be empty`);
    else if (seenElementIds.has(el.id)) errors.push(`Duplicate element id: ${el.id}`);
    else seenElementIds.add(el.id);

    errors.push(...validateElementGeometry(el.geometry));

    if (el.fieldBinding && validFormKeys) {
      if (!validFormKeys.has(el.fieldBinding)) {
        errors.push(`Element '${el.id}' binds to unknown form field key '${el.fieldBinding}'`);
      }
    }

    if (el.assetRefId && validAssetIds) {
      if (!validAssetIds.has(el.assetRefId)) {
        errors.push(`Element '${el.id}' references unknown asset id '${el.assetRefId}'`);
      }
    }
  }

  return errors;
}

export function validateRenderProfile(
  profile: RenderProfile,
  layouts: readonly LayoutDefinition[]
): string[] {
  const errors: string[] = [];
  if (!profile) {
    errors.push('RenderProfile is required');
    return errors;
  }
  if (!profile.id || profile.id.trim() === '') errors.push('RenderProfile id cannot be empty');
  if (!profile.name || profile.name.trim() === '') errors.push('RenderProfile name cannot be empty');
  if (!profile.layoutId || profile.layoutId.trim() === '') errors.push('RenderProfile layoutId cannot be empty');

  if (Array.isArray(layouts)) {
    const layoutExists = layouts.some(l => l.id === profile.layoutId);
    if (!layoutExists) {
      errors.push(`RenderProfile '${profile.id}' references unknown layoutId '${profile.layoutId}'`);
    }
  }

  return errors;
}

export function validateEngineGraph(params: {
  doc: DocumentDefinition;
  forms: readonly FormDefinition[];
  assetSets: readonly AssetSet[];
  layouts: readonly LayoutDefinition[];
}): { valid: boolean; errors: readonly string[] } {
  const errors: string[] = [];
  const { doc, forms, assetSets, layouts } = params;

  if (!doc) {
    return { valid: false, errors: ['DocumentDefinition is required'] };
  }

  if (!doc.id || doc.id.trim() === '') errors.push('DocumentDefinition id cannot be empty');
  if (!doc.slug || doc.slug.trim() === '') errors.push('DocumentDefinition slug cannot be empty');

  const form = forms.find(f => f.id === doc.formDefinitionId);
  if (!form) {
    errors.push(`DocumentDefinition references unknown formDefinitionId '${doc.formDefinitionId}'`);
  } else {
    errors.push(...validateFormDefinition(form));
  }

  let assetSet: AssetSet | undefined;
  if (doc.assetSetId) {
    assetSet = assetSets.find(a => a.id === doc.assetSetId);
    if (!assetSet) {
      errors.push(`DocumentDefinition references unknown assetSetId '${doc.assetSetId}'`);
    } else {
      errors.push(...validateAssetSet(assetSet));
    }
  }

  if (!Array.isArray(doc.renderProfiles) || doc.renderProfiles.length === 0) {
    errors.push('DocumentDefinition must have at least one RenderProfile');
  } else {
    const seenProfileIds = new Set<string>();
    for (const p of doc.renderProfiles) {
      if (seenProfileIds.has(p.id)) errors.push(`Duplicate RenderProfile id in DocumentDefinition: ${p.id}`);
      else seenProfileIds.add(p.id);

      errors.push(...validateRenderProfile(p, layouts));

      const layout = layouts.find(l => l.id === p.layoutId);
      if (layout) {
        errors.push(...validateLayoutDefinition(layout, form, assetSet));
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
