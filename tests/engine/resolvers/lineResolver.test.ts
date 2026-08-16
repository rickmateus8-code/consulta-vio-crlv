/**
 * tests/engine/resolvers/lineResolver.test.ts
 *
 * Suíte de testes unitários para a resolução estática pura de LINE (Phase 3B.3D-B).
 * Cobre modelo geométrico horizontal local + rotação, height === 0 estrito, strokeWidth, strokeColor,
 * opacity, z-order unificado (TEXT + IMAGE + SHAPE + LINE), imutabilidade estrita de snapshot e determinismo.
 */

import type {
  DocumentDefinition,
  LayoutDefinition,
  FormDefinition,
  AssetSet,
  CanonicalData,
  ResolvedLineElement,
  ResolvedShapeElement,
  ResolvedImageElement,
  ResolvedTextElement,
} from '../../../client/src/lib/engine';
import {
  resolveDocument,
  resolveLineElement,
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

console.log('=== RUNNING ENGINE V1 LINE RESOLVER TEST SUITE ===\n');

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
  nome_titular: 'MARIA DA SILVA',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Basic Geometry, Rotations & Local Coordinates
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Basic Geometry, Rotations & Local Coordinates ---');

// 1. Horizontal LINE rotation 0
const resHoriz = resolveLineElement({
  element: {
    id: 'el_line_h',
    type: 'LINE',
    geometry: { x: 50.25, y: 100.5, width: 300.75, height: 0, rotation: 0 },
    lineConfig: { strokeColor: '#000000', strokeWidth: 1.5 },
  },
  pageId: 'page_1',
});
assert(resHoriz.diagnostics.length === 0, '1. Horizontal LINE rotation 0 has 0 diagnostics');
assert(resHoriz.element?.type === 'LINE', '1. Element type is LINE');
assert(resHoriz.element?.geometry.width === 300.75, '1 & 5. width > 0 valid and preserved as length');
assert(resHoriz.element?.geometry.height === 0, '8. height === 0 valid and preserved');
assert(resHoriz.element?.geometry.x === 50.25 && resHoriz.element?.geometry.y === 100.5, '33. Decimal x/y/width preserved');
assert(resHoriz.element?.strokeColor === '#000000' && resHoriz.element?.strokeWidth === 1.5, '14 & 15. strokeColor and strokeWidth > 0 valid');
assert(resHoriz.element?.opacity === 1, '20. Default opacity resolves to 1');

// 2. Vertical LINE rotation 90
const resVert = resolveLineElement({
  element: {
    id: 'el_line_v',
    type: 'LINE',
    geometry: { x: 100, y: 200, width: 150, height: 0, rotation: 90, rotationOrigin: 'TOP_LEFT' },
    lineConfig: { strokeColor: '#FF0000', strokeWidth: 2 },
  },
  pageId: 'page_1',
});
assert(resVert.diagnostics.length === 0, '2. Vertical LINE rotation 90 has 0 diagnostics');
assert(resVert.element?.geometry.rotation === 90, '2. rotation 90 preserved');
assert(resVert.element?.geometry.rotationOrigin === 'TOP_LEFT', '11. rotationOrigin TOP_LEFT preserved');

// 3. Diagonal LINE rotation 45
const resDiag = resolveLineElement({
  element: {
    id: 'el_line_d',
    type: 'LINE',
    geometry: { x: 10, y: 20, width: 200, height: 0, rotation: 45, rotationOrigin: 'CENTER' },
    lineConfig: { strokeColor: '#005CA9', strokeWidth: 1 },
  },
  pageId: 'page_1',
});
assert(resDiag.diagnostics.length === 0, '3. Diagonal LINE rotation 45 has 0 diagnostics');
assert(resDiag.element?.geometry.rotation === 45, '3. rotation 45 preserved');
assert(resDiag.element?.geometry.rotationOrigin === 'CENTER', '12. rotationOrigin CENTER preserved');
assert(resDiag.element?.geometry.x === 10 && resDiag.element?.geometry.y === 20, '13. x/y semantics do not change based on rotationOrigin');

// 4. Arbitrary decimal rotation
const resDecRot = resolveLineElement({
  element: {
    id: 'el_line_dec_rot',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0, rotation: 33.75 },
    lineConfig: { strokeColor: '#333333', strokeWidth: 1 },
  },
  pageId: 'page_1',
});
assert(resDecRot.diagnostics.length === 0, '4. Arbitrary decimal rotation has 0 diagnostics');
assert(resDecRot.element?.geometry.rotation === 33.75, '4 & 34. rotation decimal 33.75 preserved');

// ─────────────────────────────────────────────────────────────────────────────
// 2. Geometry Width & Height Invariant Validations
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Geometry Width & Height Invariant Validations ---');

// 6. width = 0 rejected
const resWidth0 = resolveLineElement({
  element: {
    id: 'el_w0',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 0, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: 1 },
  },
  pageId: 'page_1',
});
assert(resWidth0.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '6. width = 0 rejected with INVALID_LINE_CONFIG');

// 7. negative width rejected
const resWidthNeg = resolveLineElement({
  element: {
    id: 'el_w_neg',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: -10, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: 1 },
  },
  pageId: 'page_1',
});
assert(resWidthNeg.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '7. negative width rejected with INVALID_LINE_CONFIG');

// 9. height > 0 rejected
const resHeightPos = resolveLineElement({
  element: {
    id: 'el_h_pos',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 5 },
    lineConfig: { strokeColor: '#000', strokeWidth: 1 },
  },
  pageId: 'page_1',
});
assert(resHeightPos.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '9. height > 0 rejected with INVALID_LINE_CONFIG');

// 10. negative height rejected
const resHeightNeg = resolveLineElement({
  element: {
    id: 'el_h_neg',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: -1 },
    lineConfig: { strokeColor: '#000', strokeWidth: 1 },
  },
  pageId: 'page_1',
});
assert(resHeightNeg.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '10. negative height rejected with INVALID_LINE_CONFIG');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Stroke & Opacity Validations
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Stroke & Opacity Validations ---');

// 14. strokeColor required (empty rejected)
const resEmptyColor = resolveLineElement({
  element: {
    id: 'el_empty_color',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    lineConfig: { strokeColor: '', strokeWidth: 1 },
  },
  pageId: 'page_1',
});
assert(resEmptyColor.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '14. empty strokeColor rejected');

// 16. strokeWidth 0 rejected
const resStroke0 = resolveLineElement({
  element: {
    id: 'el_sw0',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: 0 },
  },
  pageId: 'page_1',
});
assert(resStroke0.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '16. strokeWidth 0 rejected');

// 17. negative strokeWidth rejected
const resStrokeNeg = resolveLineElement({
  element: {
    id: 'el_sw_neg',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: -2 },
  },
  pageId: 'page_1',
});
assert(resStrokeNeg.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '17. negative strokeWidth rejected');

// 18. NaN strokeWidth rejected
const resStrokeNaN = resolveLineElement({
  element: {
    id: 'el_sw_nan',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: NaN },
  },
  pageId: 'page_1',
});
assert(resStrokeNaN.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '18. NaN strokeWidth rejected');

// 19. Infinity strokeWidth rejected
const resStrokeInf = resolveLineElement({
  element: {
    id: 'el_sw_inf',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: Infinity },
  },
  pageId: 'page_1',
});
assert(resStrokeInf.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '19. Infinity strokeWidth rejected');

// 21. Opacity 0 valid
const resOp0 = resolveLineElement({
  element: {
    id: 'el_op0',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: 1, opacity: 0 },
  },
  pageId: 'page_1',
});
assert(resOp0.element?.opacity === 0, '21. Opacity 0 is valid');

// 22. Opacity 1 valid
const resOp1 = resolveLineElement({
  element: {
    id: 'el_op1',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: 1, opacity: 1 },
  },
  pageId: 'page_1',
});
assert(resOp1.element?.opacity === 1, '22. Opacity 1 is valid');

// 23. Opacity decimal valid (0.65)
const resOpDec = resolveLineElement({
  element: {
    id: 'el_op_dec',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: 1, opacity: 0.65 },
  },
  pageId: 'page_1',
});
assert(resOpDec.element?.opacity === 0.65, '23. Opacity decimal 0.65 is valid');

// 24. Opacity < 0 rejected
const resOpNeg = resolveLineElement({
  element: {
    id: 'el_op_neg',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: 1, opacity: -0.1 },
  },
  pageId: 'page_1',
});
assert(resOpNeg.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '24. Opacity < 0 rejected');

// 25. Opacity > 1 rejected
const resOpOver = resolveLineElement({
  element: {
    id: 'el_op_over',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: 1, opacity: 1.1 },
  },
  pageId: 'page_1',
});
assert(resOpOver.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '25. Opacity > 1 rejected');

// 26. NaN opacity rejected
const resOpNaN = resolveLineElement({
  element: {
    id: 'el_op_nan',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: 1, opacity: NaN },
  },
  pageId: 'page_1',
});
assert(resOpNaN.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '26. NaN opacity rejected');

// 27. Infinity opacity rejected
const resOpInf = resolveLineElement({
  element: {
    id: 'el_op_inf',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    lineConfig: { strokeColor: '#000', strokeWidth: 1, opacity: Infinity },
  },
  pageId: 'page_1',
});
assert(resOpInf.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '27. Infinity opacity rejected');

// ─────────────────────────────────────────────────────────────────────────────
// 4. Source Restrictions & Config Presence
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Source Restrictions & Config Presence ---');

// 28. fieldBinding rejected
const resFieldBinding = resolveLineElement({
  element: {
    id: 'el_bad_bind',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    fieldBinding: 'nome_titular',
    lineConfig: { strokeColor: '#000', strokeWidth: 1 },
  },
  pageId: 'page_1',
});
assert(resFieldBinding.diagnostics.some(d => d.code === 'INVALID_LINE_SOURCE'), '28. fieldBinding rejected with INVALID_LINE_SOURCE');

// 29. staticValue rejected
const resStaticVal = resolveLineElement({
  element: {
    id: 'el_bad_static',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    staticValue: 'Texto',
    lineConfig: { strokeColor: '#000', strokeWidth: 1 },
  },
  pageId: 'page_1',
});
assert(resStaticVal.diagnostics.some(d => d.code === 'INVALID_LINE_SOURCE'), '29. staticValue rejected with INVALID_LINE_SOURCE');

// 30. assetRefId rejected
const resAssetRef = resolveLineElement({
  element: {
    id: 'el_bad_asset',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
    assetRefId: 'logo_brasao',
    lineConfig: { strokeColor: '#000', strokeWidth: 1 },
  },
  pageId: 'page_1',
});
assert(resAssetRef.diagnostics.some(d => d.code === 'INVALID_LINE_SOURCE'), '30. assetRefId rejected with INVALID_LINE_SOURCE');

// 31. missing lineConfig rejected
const resNoConfig = resolveLineElement({
  element: {
    id: 'el_no_cfg',
    type: 'LINE',
    geometry: { x: 0, y: 0, width: 100, height: 0 },
  },
  pageId: 'page_1',
});
assert(resNoConfig.diagnostics.some(d => d.code === 'INVALID_LINE_CONFIG'), '31. missing lineConfig rejected with INVALID_LINE_CONFIG');

// ─────────────────────────────────────────────────────────────────────────────
// 5. Document Integration, Visibility & Z-Order
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Document Integration, Visibility & Z-Order ---');

// 32. Hidden invalid LINE ignored
const layoutHiddenLine: LayoutDefinition = {
  id: 'layout_hidden_line',
  name: 'Layout Hidden Line',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_txt_ok', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10 }, staticValue: 'OK' },
    {
      id: 'el_hid_bad_line',
      type: 'LINE',
      geometry: { x: 0, y: 0, width: 100, height: 20 },
      visibility: false,
      lineConfig: { strokeColor: '', strokeWidth: -5 },
    },
  ],
};
const docHiddenLine: DocumentDefinition = {
  id: 'doc_hid_line',
  slug: 'doc-hid-line',
  name: 'Doc Hidden Line',
  version: 1,
  formDefinitionId: 'form_doc_v1',
  assetSetId: 'asset_set_main',
  renderProfiles: [{ id: 'p_hl', name: 'P', pages: [{ id: 'phl', layoutId: 'layout_hidden_line' }], purpose: 'print', outputKind: 'pdf' }],
};
const resDocHidden = resolveDocument({
  doc: docHiddenLine,
  profileId: 'p_hl',
  layouts: [layoutHiddenLine],
  forms: [formDef],
  assetSets: [assetSetDoc],
  data: canonicalData,
});
assert(resDocHidden.ok === true, '32. Hidden invalid LINE is ignored without resolution failure');
if (resDocHidden.ok) {
  assert(resDocHidden.document.pages[0].elements.length === 1, '32. Only visible element was included');
}

// 37 & 38. TEXT + IMAGE + SHAPE + LINE Unified Z-Order
const layoutQuadMix: LayoutDefinition = {
  id: 'layout_quad_mix',
  name: 'Layout Quad Mix',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  baseAssetId: 'fundo_folha',
  elements: [
    { id: 'el_txt_top', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 10 }, staticValue: 'Top Text' },
    { id: 'el_line_mid1', type: 'LINE', geometry: { x: 0, y: 0, width: 100, height: 0, zIndex: 5 }, lineConfig: { strokeColor: '#000', strokeWidth: 1 } },
    { id: 'el_shape_mid2', type: 'SHAPE', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 5 }, shapeConfig: { shapeType: 'RECTANGLE', fillColor: '#CCC' } },
    { id: 'el_img_mid3', type: 'IMAGE', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 5 }, assetRefId: 'logo_brasao', imageConfig: { fit: 'contain' } },
    { id: 'el_line_bot', type: 'LINE', geometry: { x: 0, y: 0, width: 50, height: 0, zIndex: 1 }, lineConfig: { strokeColor: '#999', strokeWidth: 2 } },
  ],
};
const docQuadMix: DocumentDefinition = {
  id: 'doc_quad_mix',
  slug: 'doc-quad-mix',
  name: 'Doc Quad Mix',
  version: 1,
  formDefinitionId: 'form_doc_v1',
  assetSetId: 'asset_set_main',
  renderProfiles: [{ id: 'p_quad', name: 'P Quad', pages: [{ id: 'pq', layoutId: 'layout_quad_mix' }], purpose: 'print', outputKind: 'pdf' }],
};
const resQuadMix = resolveDocument({
  doc: docQuadMix,
  profileId: 'p_quad',
  layouts: [layoutQuadMix],
  forms: [formDef],
  assetSets: [assetSetDoc],
  data: canonicalData,
});
assert(resQuadMix.ok === true, '37 & 38. TEXT + IMAGE + SHAPE + LINE resolution succeeds');
if (resQuadMix.ok) {
  const els = resQuadMix.document.pages[0].elements;
  assert(els[0].id === 'el_line_bot', '37. Menor zIndex (1) fica em primeiro lugar (LINE)');
  assert(els[1].id === 'el_line_mid1', '38. Mesmos zIndex (5) preservam ordem original: LINE antes de SHAPE');
  assert(els[2].id === 'el_shape_mid2', '38. SHAPE antes de IMAGE');
  assert(els[3].id === 'el_img_mid3', '38. IMAGE em quarto');
  assert(els[4].id === 'el_txt_top', '37. Maior zIndex (10) fica por último (TEXT)');

  // 40, 41, 42. Existing TEXT, IMAGE, SHAPE unchanged
  const txtEl = els[4] as ResolvedTextElement;
  assert(txtEl.type === 'TEXT' && txtEl.text === 'Top Text', '40. Existing TEXT behavior unchanged');
  const imgEl = els[3] as ResolvedImageElement;
  assert(imgEl.type === 'IMAGE' && imgEl.asset.id === 'logo_brasao', '41. Existing IMAGE behavior unchanged');
  const shapeEl = els[2] as ResolvedShapeElement;
  assert(shapeEl.type === 'SHAPE' && shapeEl.fillColor === '#CCC', '42. Existing SHAPE behavior unchanged');
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Snapshot Independence & Determinism
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Snapshot Independence & Determinism ---');

const mutLineGeom = { x: 10, y: 20, width: 100, height: 0, rotation: 15, rotationOrigin: 'CENTER' as const };
const mutLineConfig = { strokeColor: '#123456', strokeWidth: 3, opacity: 0.85 };
const mutLayoutLine: LayoutDefinition = {
  id: 'layout_mut_line',
  name: 'Layout Mut Line',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_mut_line', type: 'LINE', geometry: mutLineGeom, lineConfig: mutLineConfig },
  ],
};
const mutDocLine: DocumentDefinition = {
  id: 'doc_mut_line',
  slug: 'doc-mut-line',
  name: 'Doc Mut Line',
  version: 1,
  formDefinitionId: 'form_doc_v1',
  assetSetId: 'asset_set_main',
  renderProfiles: [{ id: 'p_mut_l', name: 'P Mut L', pages: [{ id: 'pml', layoutId: 'layout_mut_line' }], purpose: 'print', outputKind: 'pdf' }],
};

const resSnapLine = resolveDocument({
  doc: mutDocLine,
  profileId: 'p_mut_l',
  layouts: [mutLayoutLine],
  forms: [formDef],
  assetSets: [assetSetDoc],
  data: canonicalData,
});

assert(resSnapLine.ok === true, 'Snapshot resolution succeeds');
if (resSnapLine.ok) {
  const elSnap = resSnapLine.document.pages[0].elements[0] as ResolvedLineElement;

  // Mutate inputs AFTER resolution
  mutLineGeom.x = 9999;
  mutLineGeom.width = 8888;
  mutLineGeom.rotation = 90;
  mutLineConfig.strokeColor = '#FFFFFF';
  mutLineConfig.strokeWidth = 99;
  mutLineConfig.opacity = 0.1;

  assert(elSnap.geometry.x === 10, '35. Resolved geometry.x permanece 10 após mutação posterior (9999)');
  assert(elSnap.geometry.width === 100, '35. Resolved geometry.width permanece 100 após mutação posterior (8888)');
  assert(elSnap.geometry.rotation === 15, '35. Resolved geometry.rotation permanece 15 após mutação posterior (90)');
  assert(elSnap.strokeColor === '#123456', '36. Resolved strokeColor permanece #123456 após mutação posterior');
  assert(elSnap.strokeWidth === 3, '36. Resolved strokeWidth permanece 3 após mutação posterior');
  assert(elSnap.opacity === 0.85, '36. Resolved opacity permanece 0.85 após mutação posterior');
}

// 39. Repeat resolution deterministic
const resRun1 = resolveDocument({ doc: docQuadMix, profileId: 'p_quad', layouts: [layoutQuadMix], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
const resRun2 = resolveDocument({ doc: docQuadMix, profileId: 'p_quad', layouts: [layoutQuadMix], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(JSON.stringify(resRun1) === JSON.stringify(resRun2), '39. Repeat resolution is 100% deterministic (deepEqual)');

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n========================================');
console.log('Resultado: ' + passedTests + ' PASS  |  0 FAIL');
console.log('Total: ' + totalTests + ' testes do Line Resolver (Phase 3B.3D-B)');
console.log('========================================\n');
