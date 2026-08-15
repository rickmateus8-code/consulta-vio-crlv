/**
 * tests/engine/resolvers/shapeResolver.test.ts
 *
 * Suíte de testes unitários para a resolução estática pura de SHAPE (Phase 3B.3C).
 * Cobre RECTANGLE, ELLIPSE, fill, stroke, strokeWidth, cornerRadius, opacity,
 * z-order unificado (TEXT + IMAGE + SHAPE), imutabilidade estrita de snapshot e determinismo.
 */

import type {
  DocumentDefinition,
  LayoutDefinition,
  FormDefinition,
  AssetSet,
  CanonicalData,
  ResolvedShapeElement,
  ResolvedImageElement,
  ResolvedTextElement,
} from '../../../client/src/lib/engine';
import {
  resolveDocument,
  resolveShapeElement,
} from '../../../client/src/lib/engine';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log('  ✓ ' + msg);
  } else {
    console.error('  ✗ FAIL: ' + msg);
    throw new Error('Assertion failed: ' + msg);
  }
}

console.log('=== RUNNING ENGINE V1 SHAPE RESOLVER TEST SUITE ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────
const formDef: FormDefinition = {
  id: 'form_doc_v1',
  name: 'Formulário do Documento',
  version: 1,
  fields: [
    { id: 'f_nome', key: 'nome_titular', label: 'Nome', type: 'TEXT', required: true },
  ],
};

const assetSetDoc: AssetSet = {
  id: 'asset_set_main',
  name: 'Asset Set Principal',
  version: 1,
  assets: [
    {
      id: 'logo_brasao',
      name: 'Brasão Nacional',
      type: 'logo',
      mimeType: 'image/png',
      storageRef: 'r2://brasao.png',
    },
    {
      id: 'fundo_folha',
      name: 'Fundo Base',
      type: 'background_base',
      mimeType: 'image/png',
      storageRef: 'r2://fundo.png',
    },
  ],
};

const canonicalData: CanonicalData = {
  nome_titular: 'CARLOS ALBERTO SILVA',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Basic Shape Types & Paint Variations
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Basic Shape Types & Paint Variations ---');

// 1. Valid RECTANGLE fill only
const resRecFill = resolveShapeElement({
  element: {
    id: 'el_rect_fill',
    type: 'SHAPE',
    geometry: { x: 10.5, y: 20.25, width: 200, height: 100, rotation: 45 },
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#005CA9' },
  },
  pageId: 'page_1',
});
assert(resRecFill.diagnostics.length === 0, '1. Valid RECTANGLE fill only has 0 diagnostics');
assert(resRecFill.element?.type === 'SHAPE', '1. Element type is SHAPE');
assert(resRecFill.element?.shapeType === 'RECTANGLE', '1. ShapeType is RECTANGLE');
assert(resRecFill.element?.fillColor === '#005CA9', '1. fillColor #005CA9 preserved');
assert(resRecFill.element?.opacity === 1, '10. Default opacity resolves to 1');
assert(resRecFill.element?.geometry.x === 10.5 && resRecFill.element?.geometry.rotation === 45, '24 & 25. Decimals and rotation preserved');

// 2. Valid RECTANGLE stroke only
const resRecStroke = resolveShapeElement({
  element: {
    id: 'el_rect_stroke',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 100, height: 100 },
    shapeConfig: { shapeType: 'RECTANGLE', strokeColor: '#FF0000', strokeWidth: 2.5 },
  },
  pageId: 'page_1',
});
assert(resRecStroke.diagnostics.length === 0, '2. Valid RECTANGLE stroke only has 0 diagnostics');
assert(resRecStroke.element?.strokeColor === '#FF0000' && resRecStroke.element?.strokeWidth === 2.5, '2. strokeColor and strokeWidth preserved');
assert(resRecStroke.element?.fillColor === undefined, '2. fillColor is undefined');

// 3. Valid RECTANGLE fill + stroke
const resRecBoth = resolveShapeElement({
  element: {
    id: 'el_rect_both',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 100, height: 100 },
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#EEEEEE', strokeColor: '#333333', strokeWidth: 1 },
  },
  pageId: 'page_1',
});
assert(resRecBoth.diagnostics.length === 0, '3. Valid RECTANGLE fill + stroke has 0 diagnostics');
assert(resRecBoth.element?.fillColor === '#EEEEEE' && resRecBoth.element?.strokeColor === '#333333', '3. Both fillColor and strokeColor preserved');

// 4. Valid ELLIPSE fill
const resEllFill = resolveShapeElement({
  element: {
    id: 'el_ell_fill',
    type: 'SHAPE',
    geometry: { x: 50, y: 50, width: 80, height: 80 },
    shapeConfig: { shapeType: 'ELLIPSE', fillColor: '#059669' },
  },
  pageId: 'page_1',
});
assert(resEllFill.diagnostics.length === 0, '4. Valid ELLIPSE fill has 0 diagnostics');
assert(resEllFill.element?.shapeType === 'ELLIPSE' && resEllFill.element?.fillColor === '#059669', '4. ELLIPSE fillColor preserved');

// 5. Valid ELLIPSE stroke
const resEllStroke = resolveShapeElement({
  element: {
    id: 'el_ell_stroke',
    type: 'SHAPE',
    geometry: { x: 50, y: 50, width: 80, height: 80 },
    shapeConfig: { shapeType: 'ELLIPSE', strokeColor: '#000000', strokeWidth: 3 },
  },
  pageId: 'page_1',
});
assert(resEllStroke.diagnostics.length === 0, '5. Valid ELLIPSE stroke has 0 diagnostics');
assert(resEllStroke.element?.shapeType === 'ELLIPSE' && resEllStroke.element?.strokeWidth === 3, '5. ELLIPSE strokeWidth preserved');

// ─────────────────────────────────────────────────────────────────────────────
// 2. Source Restrictions & Type Validations
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Source Restrictions & Type Validations ---');

// 6. Unknown shapeType rejected
const resBadType = resolveShapeElement({
  element: {
    id: 'el_bad_type',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'POLYGON' as unknown as 'RECTANGLE', fillColor: '#000' },
  },
  pageId: 'page_1',
});
assert(resBadType.diagnostics.some(d => d.code === 'INVALID_SHAPE_CONFIG'), '6. Unknown shapeType rejected with INVALID_SHAPE_CONFIG');

// 7. fieldBinding rejected
const resFieldBinding = resolveShapeElement({
  element: {
    id: 'el_bad_binding',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    fieldBinding: 'nome_titular',
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#000' },
  },
  pageId: 'page_1',
});
assert(resFieldBinding.diagnostics.some(d => d.code === 'INVALID_SHAPE_SOURCE'), '7. fieldBinding rejected with INVALID_SHAPE_SOURCE');

// 8. staticValue rejected
const resStaticVal = resolveShapeElement({
  element: {
    id: 'el_bad_static',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    staticValue: 'Texto no shape',
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#000' },
  },
  pageId: 'page_1',
});
assert(resStaticVal.diagnostics.some(d => d.code === 'INVALID_SHAPE_SOURCE'), '8. staticValue rejected with INVALID_SHAPE_SOURCE');

// 9. assetRefId rejected
const resAssetRef = resolveShapeElement({
  element: {
    id: 'el_bad_asset',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    assetRefId: 'logo_brasao',
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#000' },
  },
  pageId: 'page_1',
});
assert(resAssetRef.diagnostics.some(d => d.code === 'INVALID_SHAPE_SOURCE'), '9. assetRefId rejected with INVALID_SHAPE_SOURCE');

// No paint declared
const resNoPaint = resolveShapeElement({
  element: {
    id: 'el_no_paint',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE' },
  },
  pageId: 'page_1',
});
assert(resNoPaint.diagnostics.some(d => d.code === 'INVALID_SHAPE_CONFIG'), 'No paint declared rejected with INVALID_SHAPE_CONFIG');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Opacity Validations
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Opacity Validations ---');

// 11. Opacity 0 valid
const resOp0 = resolveShapeElement({
  element: {
    id: 'el_op0',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#000', opacity: 0 },
  },
  pageId: 'page_1',
});
assert(resOp0.element?.opacity === 0, '11. Opacity 0 is valid and materialized');

// 12. Opacity 1 valid
const resOp1 = resolveShapeElement({
  element: {
    id: 'el_op1',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#000', opacity: 1 },
  },
  pageId: 'page_1',
});
assert(resOp1.element?.opacity === 1, '12. Opacity 1 is valid and materialized');

// 13. Opacity decimal valid (0.75)
const resOpDec = resolveShapeElement({
  element: {
    id: 'el_op_dec',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#000', opacity: 0.75 },
  },
  pageId: 'page_1',
});
assert(resOpDec.element?.opacity === 0.75, '13. Opacity decimal 0.75 is valid');

// 14. Opacity < 0 rejected
const resOpNeg = resolveShapeElement({
  element: {
    id: 'el_op_neg',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#000', opacity: -0.1 },
  },
  pageId: 'page_1',
});
assert(resOpNeg.diagnostics.some(d => d.code === 'INVALID_SHAPE_CONFIG'), '14. Opacity < 0 rejected');

// 15. Opacity > 1 rejected
const resOpOver = resolveShapeElement({
  element: {
    id: 'el_op_over',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#000', opacity: 1.05 },
  },
  pageId: 'page_1',
});
assert(resOpOver.diagnostics.some(d => d.code === 'INVALID_SHAPE_CONFIG'), '15. Opacity > 1 rejected');

// 16. Opacity NaN rejected
const resOpNaN = resolveShapeElement({
  element: {
    id: 'el_op_nan',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#000', opacity: NaN },
  },
  pageId: 'page_1',
});
assert(resOpNaN.diagnostics.some(d => d.code === 'INVALID_SHAPE_CONFIG'), '16. Opacity NaN rejected');

// 17. Opacity Infinity rejected
const resOpInf = resolveShapeElement({
  element: {
    id: 'el_op_inf',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#000', opacity: Infinity },
  },
  pageId: 'page_1',
});
assert(resOpInf.diagnostics.some(d => d.code === 'INVALID_SHAPE_CONFIG'), '17. Opacity Infinity rejected');

// ─────────────────────────────────────────────────────────────────────────────
// 4. Stroke & CornerRadius Validations
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Stroke & CornerRadius Validations ---');

// 18. Negative strokeWidth rejected
const resNegStroke = resolveShapeElement({
  element: {
    id: 'el_neg_stroke',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE', strokeColor: '#000', strokeWidth: -1 },
  },
  pageId: 'page_1',
});
assert(resNegStroke.diagnostics.some(d => d.code === 'INVALID_SHAPE_CONFIG'), '18. Negative strokeWidth rejected');

// 19. Stroke config inconsistent (strokeColor present without strokeWidth)
const resStrokeNoWidth = resolveShapeElement({
  element: {
    id: 'el_stroke_no_width',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE', strokeColor: '#000' },
  },
  pageId: 'page_1',
});
assert(resStrokeNoWidth.diagnostics.some(d => d.code === 'INVALID_SHAPE_CONFIG'), '19. strokeColor without strokeWidth rejected');

// 19b. Stroke config inconsistent (strokeWidth present without strokeColor)
const resWidthNoStroke = resolveShapeElement({
  element: {
    id: 'el_width_no_color',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#FFF', strokeWidth: 2 },
  },
  pageId: 'page_1',
});
assert(resWidthNoStroke.diagnostics.some(d => d.code === 'INVALID_SHAPE_CONFIG'), '19b. strokeWidth without strokeColor rejected');

// 20. CornerRadius valid on RECTANGLE
const resCornerOk = resolveShapeElement({
  element: {
    id: 'el_corner_ok',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#000', cornerRadius: 8 },
  },
  pageId: 'page_1',
});
assert(resCornerOk.diagnostics.length === 0, '20. cornerRadius valid on RECTANGLE (0 diagnostics)');
assert(resCornerOk.element?.cornerRadius === 8, '20. cornerRadius 8 preserved');

// 21. Negative cornerRadius rejected
const resCornerNeg = resolveShapeElement({
  element: {
    id: 'el_corner_neg',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#000', cornerRadius: -5 },
  },
  pageId: 'page_1',
});
assert(resCornerNeg.diagnostics.some(d => d.code === 'INVALID_SHAPE_CONFIG'), '21. Negative cornerRadius rejected');

// 22. CornerRadius on ELLIPSE rejected
const resCornerEllipse = resolveShapeElement({
  element: {
    id: 'el_corner_ell',
    type: 'SHAPE',
    geometry: { x: 0, y: 0, width: 10, height: 10 },
    shapeConfig: { shapeType: 'ELLIPSE', fillColor: '#000', cornerRadius: 5 },
  },
  pageId: 'page_1',
});
assert(resCornerEllipse.diagnostics.some(d => d.code === 'INVALID_SHAPE_CONFIG'), '22. cornerRadius on ELLIPSE rejected');

// ─────────────────────────────────────────────────────────────────────────────
// 5. Document Integration, Visibility & Z-Order
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Document Integration, Visibility & Z-Order ---');

// 23. Hidden invalid shape ignored
const layoutHiddenShape: LayoutDefinition = {
  id: 'layout_hidden_shape',
  name: 'Layout Hidden Shape',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_txt_ok', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10 }, staticValue: 'OK' },
    {
      id: 'el_hid_bad_shape',
      type: 'SHAPE',
      geometry: { x: 0, y: 0, width: 10, height: 10 },
      visibility: false,
      shapeConfig: { shapeType: 'ELLIPSE', fillColor: '#000', cornerRadius: 50 },
    },
  ],
};
const docHiddenShape: DocumentDefinition = {
  id: 'doc_hid_shape',
  slug: 'doc-hid-shape',
  name: 'Doc Hidden Shape',
  version: 1,
  formDefinitionId: 'form_doc_v1',
  assetSetId: 'asset_set_main',
  renderProfiles: [{ id: 'p_hs', name: 'P', pages: [{ id: 'phs', layoutId: 'layout_hidden_shape' }], purpose: 'print', outputKind: 'pdf' }],
};
const resDocHidden = resolveDocument({
  doc: docHiddenShape,
  profileId: 'p_hs',
  layouts: [layoutHiddenShape],
  forms: [formDef],
  assetSets: [assetSetDoc],
  data: canonicalData,
});
assert(resDocHidden.ok === true, '23. Hidden invalid shape is ignored without resolution failure');
if (resDocHidden.ok) {
  assert(resDocHidden.document.pages[0].elements.length === 1, '23. Only visible element was included');
}

// 28 & 29. TEXT + IMAGE + SHAPE Unified Z-Order
const layoutTriMix: LayoutDefinition = {
  id: 'layout_tri_mix',
  name: 'Layout Tri Mix',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  baseAssetId: 'fundo_folha',
  elements: [
    { id: 'el_txt_top', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 10 }, staticValue: 'Top Text' },
    { id: 'el_shape_mid1', type: 'SHAPE', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 5 }, shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#CCC' } },
    { id: 'el_img_mid2', type: 'IMAGE', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 5 }, assetRefId: 'logo_brasao', imageConfig: { fit: 'contain' } },
    { id: 'el_shape_bot', type: 'SHAPE', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 1 }, shapeConfig: { shapeType: 'ELLIPSE', fillColor: '#000' } },
  ],
};
const docTriMix: DocumentDefinition = {
  id: 'doc_tri_mix',
  slug: 'doc-tri-mix',
  name: 'Doc Tri Mix',
  version: 1,
  formDefinitionId: 'form_doc_v1',
  assetSetId: 'asset_set_main',
  renderProfiles: [{ id: 'p_tri', name: 'P Tri', pages: [{ id: 'ptri', layoutId: 'layout_tri_mix' }], purpose: 'print', outputKind: 'pdf' }],
};
const resTriMix = resolveDocument({
  doc: docTriMix,
  profileId: 'p_tri',
  layouts: [layoutTriMix],
  forms: [formDef],
  assetSets: [assetSetDoc],
  data: canonicalData,
});
assert(resTriMix.ok === true, '28 & 29. TEXT + IMAGE + SHAPE resolution succeeds');
if (resTriMix.ok) {
  const els = resTriMix.document.pages[0].elements;
  assert(els[0].id === 'el_shape_bot', '28. Menor zIndex (1) fica em primeiro lugar (SHAPE)');
  assert(els[1].id === 'el_shape_mid1', '29. Mesmos zIndex (5) preservam ordem original: SHAPE antes de IMAGE');
  assert(els[2].id === 'el_img_mid2', '29. IMAGE em terceiro');
  assert(els[3].id === 'el_txt_top', '28. Maior zIndex (10) fica por último (TEXT)');

  // 31 & 32. Existing IMAGE and TEXT behaviors unchanged
  const imgEl = els[2] as ResolvedImageElement;
  assert(imgEl.type === 'IMAGE' && imgEl.asset.id === 'logo_brasao', '31. Existing IMAGE behavior unchanged');
  const txtEl = els[3] as ResolvedTextElement;
  assert(txtEl.type === 'TEXT' && txtEl.text === 'Top Text', '32. Existing TEXT behavior unchanged');
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Snapshot Independence & Determinism
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Snapshot Independence & Determinism ---');

const mutShapeGeom = { x: 10, y: 20, width: 100, height: 100 };
const mutShapeConfig = { shapeType: 'RECTANGLE' as const, fillColor: '#112233', strokeColor: '#445566', strokeWidth: 2, cornerRadius: 4, opacity: 0.9 };
const mutLayoutShape: LayoutDefinition = {
  id: 'layout_mut_shape',
  name: 'Layout Mut Shape',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_mut_shape', type: 'SHAPE', geometry: mutShapeGeom, shapeConfig: mutShapeConfig },
  ],
};
const mutDocShape: DocumentDefinition = {
  id: 'doc_mut_shape',
  slug: 'doc-mut-shape',
  name: 'Doc Mut Shape',
  version: 1,
  formDefinitionId: 'form_doc_v1',
  assetSetId: 'asset_set_main',
  renderProfiles: [{ id: 'p_mut_s', name: 'P Mut S', pages: [{ id: 'pms', layoutId: 'layout_mut_shape' }], purpose: 'print', outputKind: 'pdf' }],
};

const resSnapShape = resolveDocument({
  doc: mutDocShape,
  profileId: 'p_mut_s',
  layouts: [mutLayoutShape],
  forms: [formDef],
  assetSets: [assetSetDoc],
  data: canonicalData,
});

assert(resSnapShape.ok === true, 'Snapshot resolution succeeds');
if (resSnapShape.ok) {
  const elSnap = resSnapShape.document.pages[0].elements[0] as ResolvedShapeElement;

  // Mutate inputs AFTER resolution
  mutShapeGeom.x = 9999;
  mutShapeConfig.fillColor = '#FFFFFF';
  mutShapeConfig.strokeWidth = 99;
  mutShapeConfig.cornerRadius = 50;
  mutShapeConfig.opacity = 0.1;

  assert(elSnap.geometry.x === 10, '27. Resolved geometry.x permanece 10 após mutação posterior (9999)');
  assert(elSnap.fillColor === '#112233', '26. Resolved fillColor permanece #112233 após mutação posterior');
  assert(elSnap.strokeWidth === 2, '26. Resolved strokeWidth permanece 2 após mutação posterior');
  assert(elSnap.cornerRadius === 4, '26. Resolved cornerRadius permanece 4 após mutação posterior');
  assert(elSnap.opacity === 0.9, '26. Resolved opacity permanece 0.9 após mutação posterior');
}

// 30. Repeat resolution deterministic
const resRun1 = resolveDocument({ doc: docTriMix, profileId: 'p_tri', layouts: [layoutTriMix], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
const resRun2 = resolveDocument({ doc: docTriMix, profileId: 'p_tri', layouts: [layoutTriMix], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(JSON.stringify(resRun1) === JSON.stringify(resRun2), '30. Repeat resolution is 100% deterministic (deepEqual)');

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n========================================');
console.log('Resultado: ' + passedTests + ' PASS  |  0 FAIL');
console.log('Total: ' + totalTests + ' testes do Shape Resolver (Phase 3B.3C)');
console.log('========================================\n');
