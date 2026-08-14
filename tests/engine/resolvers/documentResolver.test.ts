/**
 * tests/engine/resolvers/documentResolver.test.ts
 *
 * Suíte de testes unitários para o Document / Page / Text Resolver puro (Phase 3B.2).
 * Cobre profile selection, resolução estrita de FormDefinition e AssetSet,
 * lookup de baseAsset com escopo estrito, imutabilidade de snapshot, z-order,
 * ausência de cascade noise, determinismo e diagnósticos estruturais.
 */

import type {
  DocumentDefinition,
  LayoutDefinition,
  FormDefinition,
  AssetSet,
  CanonicalData,
  ResolvedTextElement,
} from '../../../client/src/lib/engine';
import {
  resolveDocument,
  hasResolutionErrors,
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

console.log('=== RUNNING ENGINE V1 DOCUMENT RESOLVER TEST SUITE ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// Base Fixtures
// ─────────────────────────────────────────────────────────────────────────────
const formDef: FormDefinition = {
  id: 'form_academic_v1',
  name: 'Formulário Acadêmico',
  version: 1,
  fields: [
    { id: 'f_nome', key: 'nome_aluno', label: 'Nome do Aluno', type: 'TEXT', required: true },
    { id: 'f_obs', key: 'observacao', label: 'Observação', type: 'TEXT', required: false },
    { id: 'f_idade', key: 'idade', label: 'Idade', type: 'NUMBER', required: false },
    { id: 'f_ativo', key: 'ativo', label: 'Matrícula Ativa', type: 'BOOLEAN', required: false },
    { id: 'f_detalhes', key: 'detalhes', label: 'Detalhes Objeto', type: 'TEXT', required: false },
  ],
};

const formB: FormDefinition = {
  id: 'form_outro_b',
  name: 'Formulário B',
  version: 1,
  fields: [
    { id: 'f_titulo', key: 'titulo_eleitor', label: 'Título de Eleitor', type: 'TEXT', required: true },
  ],
};

const assetSet: AssetSet = {
  id: 'assets_academic_v1',
  name: 'Assets do Documento Acadêmico',
  version: 1,
  assets: [
    { id: 'asset_bg_page1', name: 'Fundo Folha 1', type: 'background_base', mimeType: 'image/png', storageRef: 'r2://bg1.png' },
    { id: 'asset_bg_page2', name: 'Fundo Folha 2', type: 'background_base', mimeType: 'image/png', storageRef: 'r2://bg2.png' },
  ],
};

const assetSetA: AssetSet = {
  id: 'asset_set_a',
  name: 'Asset Set A',
  version: 1,
  assets: [
    { id: 'background', name: 'Fundo A', type: 'background_base', mimeType: 'image/png', storageRef: 'r2://asset_a.png' },
  ],
};

const assetSetB: AssetSet = {
  id: 'asset_set_b',
  name: 'Asset Set B',
  version: 1,
  assets: [
    { id: 'background', name: 'Fundo B', type: 'background_base', mimeType: 'image/png', storageRef: 'r2://asset_b.png' },
  ],
};

const layoutSinglePage: LayoutDefinition = {
  id: 'layout_single',
  name: 'Layout de Página Única',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  baseAssetId: 'asset_bg_page1',
  elements: [
    {
      id: 'el_title',
      type: 'TEXT',
      geometry: { x: 50, y: 50, width: 694, height: 40, rotation: 0, rotationOrigin: 'CENTER', zIndex: 1 },
      staticValue: 'CERTIFICADO DE CONCLUSÃO',
      textConfig: { font: { family: 'Times', size: 24, weight: 'bold' }, color: '#000000', align: 'center' },
    },
    {
      id: 'el_name',
      type: 'TEXT',
      geometry: { x: 100.125, y: 150.333, width: 594, height: 30, rotation: 0, rotationOrigin: 'CENTER', zIndex: 2 },
      fieldBinding: 'nome_aluno',
      textConfig: { font: { family: 'Times', size: 18, weight: 'bold' }, color: '#005CA9', align: 'left', uppercase: true },
    },
    {
      id: 'el_obs',
      type: 'TEXT',
      geometry: { x: 100, y: 200, width: 594, height: 30, rotation: 0, rotationOrigin: 'CENTER', zIndex: 3 },
      fieldBinding: 'observacao',
    },
  ],
};

const layoutPage2: LayoutDefinition = {
  id: 'layout_page2',
  name: 'Layout Folha 2',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  baseAssetId: 'asset_bg_page2',
  elements: [
    {
      id: 'el_footer_note',
      type: 'TEXT',
      geometry: { x: 50, y: 1000, width: 694, height: 20, zIndex: 1 },
      staticValue: 'Documento gerado eletronicamente',
    },
  ],
};

const layoutLandscape: LayoutDefinition = {
  id: 'layout_landscape',
  name: 'Layout Paisagem',
  canvas: { width: 963, height: 680, unit: 'px', orientation: 'landscape' },
  elements: [
    {
      id: 'el_card_name',
      type: 'TEXT',
      geometry: { x: 100, y: 50, width: 400, height: 30, zIndex: 1 },
      fieldBinding: 'nome_aluno',
    },
  ],
};

const docDef: DocumentDefinition = {
  id: 'doc_academic_v1',
  slug: 'documento-academico',
  name: 'Documento Acadêmico',
  version: 1,
  formDefinitionId: 'form_academic_v1',
  assetSetId: 'assets_academic_v1',
  renderProfiles: [
    {
      id: 'profile_print_single',
      name: 'Impressão Folha Única',
      pages: [{ id: 'page_1', layoutId: 'layout_single' }],
      purpose: 'print',
      outputKind: 'pdf',
    },
    {
      id: 'profile_print_multi',
      name: 'Impressão 2 Páginas',
      pages: [
        { id: 'page_front', layoutId: 'layout_single' },
        { id: 'page_back', layoutId: 'layout_page2' },
      ],
      purpose: 'print',
      outputKind: 'pdf',
    },
    {
      id: 'profile_wallet_transformed',
      name: 'Carteira Digital Rotacionada',
      pages: [
        {
          id: 'page_wallet',
          layoutId: 'layout_landscape',
          outputCanvas: { width: 680, height: 963, unit: 'px', orientation: 'portrait' },
          transform: { translateX: 0, translateY: 963, rotateDeg: -90, scaleX: 1.0, scaleY: 1.0 },
        },
      ],
      purpose: 'digital_wallet_card',
      outputKind: 'raster_image',
    },
    {
      id: 'profile_reuse_native',
      name: 'Apresentação Nativa Landscape',
      pages: [{ id: 'page_native', layoutId: 'layout_landscape' }],
      purpose: 'public_preview',
      outputKind: 'raster_image',
    },
  ],
};

const validCanonicalData: CanonicalData = {
  nome_aluno: 'Carlos Silva Pereira',
  observacao: 'Aprovado com distinção',
  idade: 22,
  ativo: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Basic Resolution: Static & Bound Text
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Basic Single & Multi-Page Resolution ---');

const res1 = resolveDocument({
  doc: docDef,
  profileId: 'profile_print_single',
  layouts: [layoutSinglePage],
  forms: [formDef],
  assetSets: [assetSet],
  data: validCanonicalData,
});

assert(res1.ok === true, '1. Single-page resolution succeeds (ok: true)');
if (res1.ok) {
  assert(res1.document.pages.length === 1, '1. Single-page possui 1 página materializada');
  const p1 = res1.document.pages[0];
  assert(p1.pageId === 'page_1', '1. pageId preservado');
  assert(p1.pageIndex === 0, '1. pageIndex é 0');
  assert(p1.baseAsset?.id === 'asset_bg_page1', '1. baseAsset resolvido logicamente');

  const titleEl = p1.elements.find(e => e.id === 'el_title') as ResolvedTextElement;
  assert(titleEl.type === 'TEXT' && titleEl.text === 'CERTIFICADO DE CONCLUSÃO', '1. static TEXT resolvido');
  assert(!('staticValue' in titleEl), '1. staticValue removido do resolved snapshot');

  const nameEl = p1.elements.find(e => e.id === 'el_name') as ResolvedTextElement;
  assert(nameEl.type === 'TEXT' && nameEl.text === 'CARLOS SILVA PEREIRA', '2. bound TEXT resolvido com uppercase aplicado');
  assert(!('fieldBinding' in nameEl), '2. fieldBinding removido do resolved snapshot');
}

// 3. Multi-page bound TEXT & order
const resMulti = resolveDocument({
  doc: docDef,
  profileId: 'profile_print_multi',
  layouts: [layoutSinglePage, layoutPage2],
  forms: [formDef],
  assetSets: [assetSet],
  data: validCanonicalData,
});
assert(resMulti.ok === true, '3. Multi-page resolution succeeds');
if (resMulti.ok) {
  assert(resMulti.document.pages.length === 2, '3. Multi-page possui exatamente 2 páginas');
  assert(resMulti.document.pages[0].pageId === 'page_front' && resMulti.document.pages[0].pageIndex === 0, '4. Page 0 index e order corretos');
  assert(resMulti.document.pages[1].pageId === 'page_back' && resMulti.document.pages[1].pageIndex === 1, '4. Page 1 index e order corretos');
  assert(resMulti.document.pages[1].baseAsset?.id === 'asset_bg_page2', '4. Page 2 baseAsset resolvido logicamente');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Spaces, OutputCanvas & CanvasTransform Defaults
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Spaces, OutputCanvas & CanvasTransform Defaults ---');

if (res1.ok) {
  const p1 = res1.document.pages[0];
  assert(p1.sourceCanvas.width === 794 && p1.sourceCanvas.height === 1123, '5. sourceCanvas derivado da LayoutDefinition');
  assert(p1.outputCanvas.width === 794 && p1.outputCanvas.height === 1123, '5. outputCanvas default materializado = sourceCanvas');
  assert(
    p1.transform.translateX === 0 &&
    p1.transform.translateY === 0 &&
    p1.transform.rotateDeg === 0 &&
    p1.transform.scaleX === 1 &&
    p1.transform.scaleY === 1,
    '7. identity CanvasTransform materializado com todos os 5 campos obrigatórios'
  );
}

// 6 & 8. Custom outputCanvas & transform preserved
const resWallet = resolveDocument({
  doc: docDef,
  profileId: 'profile_wallet_transformed',
  layouts: [layoutLandscape],
  forms: [formDef],
  assetSets: [assetSet],
  data: validCanonicalData,
});
assert(resWallet.ok === true, '6 & 8. Wallet resolution succeeds');
if (resWallet.ok) {
  const pw = resWallet.document.pages[0];
  assert(pw.sourceCanvas.width === 963 && pw.sourceCanvas.height === 680, '6. Wallet sourceCanvas = 963x680 (Landscape)');
  assert(pw.outputCanvas.width === 680 && pw.outputCanvas.height === 963, '6. Wallet custom outputCanvas = 680x963 (Portrait)');
  assert(
    pw.transform.translateX === 0 &&
    pw.transform.translateY === 963 &&
    pw.transform.rotateDeg === -90 &&
    pw.transform.scaleX === 1.0 &&
    pw.transform.scaleY === 1.0,
    '8. Custom CanvasTransform materializado com rotateDeg = -90'
  );

  // 9. Global transform DOES NOT mutate element geometry
  const cardNameEl = pw.elements.find(e => e.id === 'el_card_name') as ResolvedTextElement;
  assert(cardNameEl.geometry.x === 100 && cardNameEl.geometry.y === 50, '9. Element geometry permanece estritamente em Source Space (x=100, y=50)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Visibility & Unsupported Elements
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Visibility & Unsupported Elements ---');

const layoutWithHiddenUnsupported: LayoutDefinition = {
  id: 'layout_vis_test',
  name: 'Layout Teste Visibilidade',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    {
      id: 'el_visible_text',
      type: 'TEXT',
      geometry: { x: 50, y: 50, width: 200, height: 30 },
      staticValue: 'Visível',
      visibility: true,
    },
    {
      id: 'el_hidden_text',
      type: 'TEXT',
      geometry: { x: 50, y: 100, width: 200, height: 30 },
      staticValue: 'Oculto',
      visibility: false,
    },
    {
      id: 'el_hidden_unsupported_qr',
      type: 'QR_CODE',
      geometry: { x: 50, y: 200, width: 100, height: 100 },
      visibility: false, // Hidden unsupported
    },
  ],
};

const docVis: DocumentDefinition = {
  ...docDef,
  renderProfiles: [{ id: 'p_vis', name: 'Profile Vis', pages: [{ id: 'pv', layoutId: 'layout_vis_test' }], purpose: 'print', outputKind: 'pdf' }],
};

const resVis = resolveDocument({
  doc: docVis,
  profileId: 'p_vis',
  layouts: [layoutWithHiddenUnsupported],
  forms: [formDef],
  assetSets: [assetSet],
  data: validCanonicalData,
});

assert(resVis.ok === true, '11. Hidden unsupported element (visibility: false) NÃO causa falha no resolver');
if (resVis.ok) {
  assert(resVis.document.pages[0].elements.length === 1, '10. Elementos com visibility: false são filtrados do snapshot final');
  assert(resVis.document.pages[0].elements[0].id === 'el_visible_text', '10. Somente elemento visível foi incluído');
}

// 12. Visible unsupported element fails
const layoutWithVisibleUnsupported: LayoutDefinition = {
  id: 'layout_unsupported_visible',
  name: 'Layout com Unsupported Visível',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    {
      id: 'el_visible_unsupported_qr',
      type: 'QR_CODE',
      geometry: { x: 50, y: 200, width: 100, height: 100 },
      visibility: true,
    },
  ],
};
const docUnsup: DocumentDefinition = {
  ...docDef,
  renderProfiles: [{ id: 'p_unsup', name: 'P Unsup', pages: [{ id: 'pu', layoutId: 'layout_unsupported_visible' }], purpose: 'print', outputKind: 'pdf' }],
};
const resUnsup = resolveDocument({
  doc: docUnsup,
  profileId: 'p_unsup',
  layouts: [layoutWithVisibleUnsupported],
  forms: [formDef],
  assetSets: [assetSet],
  data: validCanonicalData,
});
assert(resUnsup.ok === false, '12. Visible unsupported element causa ResolutionFailure');
if (!resUnsup.ok) {
  assert(resUnsup.diagnostics.some(d => d.code === 'UNSUPPORTED_ELEMENT_TYPE'), '12. Diagnostic UNSUPPORTED_ELEMENT_TYPE gerado');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Z-Index Ordering & Decimal Precision
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Z-Index Ordering & Decimal Precision ---');

const layoutZOrder: LayoutDefinition = {
  id: 'layout_z_order',
  name: 'Layout Z Order Test',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_z_top', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 10 }, staticValue: 'Top' },
    { id: 'el_z_mid_1', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 5 }, staticValue: 'Mid 1' },
    { id: 'el_z_mid_2', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 5 }, staticValue: 'Mid 2' },
    { id: 'el_z_bot', type: 'TEXT', geometry: { x: 100.125, y: 20.333333, width: 10, height: 10, zIndex: 1 }, staticValue: 'Bot' },
  ],
};
const docZ: DocumentDefinition = {
  ...docDef,
  renderProfiles: [{ id: 'p_z', name: 'P Z', pages: [{ id: 'pz', layoutId: 'layout_z_order' }], purpose: 'print', outputKind: 'pdf' }],
};
const resZ = resolveDocument({
  doc: docZ,
  profileId: 'p_z',
  layouts: [layoutZOrder],
  forms: [formDef],
  assetSets: [assetSet],
  data: validCanonicalData,
});
assert(resZ.ok === true, '13 & 14. Z-order resolution succeeds');
if (resZ.ok) {
  const els = resZ.document.pages[0].elements;
  assert(els[0].id === 'el_z_bot', '13. Menor zIndex (1) fica em primeiro lugar');
  assert(els[1].id === 'el_z_mid_1', '14. Mesmos zIndex (5) preservam ordem original do array (Mid 1 antes de Mid 2)');
  assert(els[2].id === 'el_z_mid_2', '14. Mid 2 em terceiro');
  assert(els[3].id === 'el_z_top', '13. Maior zIndex (10) fica por último');

  // 15. Decimal precision preserved
  assert(els[0].geometry.x === 100.125 && els[0].geometry.y === 20.333333, '15. Precisão decimal de coordenadas geométricas é preservada sem arredondamentos');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Text Data Types, Conversions & Validations
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Text Data Types, Conversions & Validations ---');

const layoutTypes: LayoutDefinition = {
  id: 'layout_types',
  name: 'Layout Types Test',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_num', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10 }, fieldBinding: 'idade' },
    { id: 'el_bool', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10 }, fieldBinding: 'ativo' },
    { id: 'el_optional_missing', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10 }, fieldBinding: 'observacao' },
  ],
};
const docTypes: DocumentDefinition = {
  ...docDef,
  renderProfiles: [{ id: 'p_types', name: 'P Types', pages: [{ id: 'pt', layoutId: 'layout_types' }], purpose: 'print', outputKind: 'pdf' }],
};

const resTypes = resolveDocument({
  doc: docTypes,
  profileId: 'p_types',
  layouts: [layoutTypes],
  forms: [formDef],
  assetSets: [assetSet],
  data: { idade: 22, ativo: true, observacao: null },
});

assert(resTypes.ok === true, '21, 22, 23. Types conversion resolution succeeds');
if (resTypes.ok) {
  const els = resTypes.document.pages[0].elements as ResolvedTextElement[];
  assert(els[0].text === '22', '22. Conversão determinística de número para string ("22")');
  assert(els[1].text === 'true', '23. Conversão determinística de booleano para string ("true")');
  assert(els[2].text === '', '21. Campo opcional nulo resolve deterministamente para string vazia ("")');
}

// 20. Required missing runtime value fails
const resReqMissing = resolveDocument({
  doc: docDef,
  profileId: 'profile_print_single',
  layouts: [layoutSinglePage],
  forms: [formDef],
  assetSets: [assetSet],
  data: { observacao: 'Teste' }, // nome_aluno ausente
});
assert(resReqMissing.ok === false, '20. Required field missing at runtime causes ResolutionFailure');
if (!resReqMissing.ok) {
  assert(resReqMissing.diagnostics.some(d => d.code === 'MISSING_REQUIRED_VALUE'), '20. Diagnostic MISSING_REQUIRED_VALUE gerado');
}

// 24. Object / array text value rejected
const resObjValue = resolveDocument({
  doc: docTypes,
  profileId: 'p_types',
  layouts: [layoutTypes],
  forms: [formDef],
  assetSets: [assetSet],
  data: { idade: { anos: 22 } as unknown as string },
});
assert(resObjValue.ok === false, '24. Objeto como valor de texto é rejeitado');
if (!resObjValue.ok) {
  assert(resObjValue.diagnostics.some(d => d.code === 'INVALID_TEXT_VALUE'), '24. Diagnostic INVALID_TEXT_VALUE gerado');
}

// 25. XOR source invalid rejected
const layoutXORBad: LayoutDefinition = {
  id: 'layout_xor_bad',
  name: 'Layout XOR Bad',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    {
      id: 'el_both_sources',
      type: 'TEXT',
      geometry: { x: 0, y: 0, width: 10, height: 10 },
      fieldBinding: 'nome_aluno',
      staticValue: 'Conflito', // Ambas as fontes declaradas
    },
  ],
};
const docXOR: DocumentDefinition = {
  ...docDef,
  renderProfiles: [{ id: 'p_xor', name: 'P XOR', pages: [{ id: 'pxor', layoutId: 'layout_xor_bad' }], purpose: 'print', outputKind: 'pdf' }],
};
const resXOR = resolveDocument({
  doc: docXOR,
  profileId: 'p_xor',
  layouts: [layoutXORBad],
  forms: [formDef],
  assetSets: [assetSet],
  data: validCanonicalData,
});
assert(resXOR.ok === false, '25. Violação de XOR (staticValue E fieldBinding declarados juntos) é rejeitada');
if (!resXOR.ok) {
  assert(resXOR.diagnostics.some(d => d.code === 'INVALID_TEXT_SOURCE'), '25. Diagnostic INVALID_TEXT_SOURCE gerado');
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Structural Document Dependency Failures (No Cascade Noise)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Structural Document Dependency Failures ---');

// 16. Missing Profile
const resMissingProfile = resolveDocument({
  doc: docDef,
  profileId: 'profile_fantasma',
  layouts: [layoutSinglePage],
  forms: [formDef],
  assetSets: [assetSet],
  data: validCanonicalData,
});
assert(resMissingProfile.ok === false, '16. Profile inexistente causa ResolutionFailure');
if (!resMissingProfile.ok) {
  assert(resMissingProfile.diagnostics.some(d => d.code === 'PROFILE_NOT_FOUND'), '16. Diagnostic PROFILE_NOT_FOUND gerado');
}

// 16b. Missing FormDefinition
const resMissingForm = resolveDocument({
  doc: docDef,
  profileId: 'profile_print_single',
  layouts: [layoutSinglePage],
  forms: [formB], // form_academic_v1 ausente
  assetSets: [assetSet],
  data: validCanonicalData,
});
assert(resMissingForm.ok === false, '16b. FormDefinition ausente no input.forms causa FORM_NOT_FOUND direto na raiz');
if (!resMissingForm.ok) {
  assert(resMissingForm.diagnostics.some(d => d.code === 'FORM_NOT_FOUND'), '16b. Diagnostic FORM_NOT_FOUND gerado');
  assert(resMissingForm.diagnostics.length === 1, '16b. Zero cascade noise (apenas 1 erro emitido sem processar elementos)');
}

// 16c. Missing AssetSet
const resMissingAssetSet = resolveDocument({
  doc: docDef,
  profileId: 'profile_print_single',
  layouts: [layoutSinglePage],
  forms: [formDef],
  assetSets: [assetSetA], // assets_academic_v1 ausente
  data: validCanonicalData,
});
assert(resMissingAssetSet.ok === false, '16c. AssetSet ausente no input.assetSets causa ASSET_SET_NOT_FOUND');
if (!resMissingAssetSet.ok) {
  assert(resMissingAssetSet.diagnostics.some(d => d.code === 'ASSET_SET_NOT_FOUND'), '16c. Diagnostic ASSET_SET_NOT_FOUND gerado');
  assert(resMissingAssetSet.diagnostics.length === 1, '16c. Zero cascade noise');
}

// 17. Missing Layout
const docBadLayout: DocumentDefinition = {
  ...docDef,
  renderProfiles: [{ id: 'p_bad_l', name: 'P Bad L', pages: [{ id: 'pb', layoutId: 'layout_fantasma' }], purpose: 'print', outputKind: 'pdf' }],
};
const resMissingLayout = resolveDocument({
  doc: docBadLayout,
  profileId: 'p_bad_l',
  layouts: [layoutSinglePage],
  forms: [formDef],
  assetSets: [assetSet],
  data: validCanonicalData,
});
assert(resMissingLayout.ok === false, '17. Layout inexistente causa ResolutionFailure');
if (!resMissingLayout.ok) {
  assert(resMissingLayout.diagnostics.some(d => d.code === 'LAYOUT_NOT_FOUND'), '17. Diagnostic LAYOUT_NOT_FOUND gerado');
}

// 18. Missing Base Asset inside scoped AssetSet
const layoutBadAsset: LayoutDefinition = {
  ...layoutSinglePage,
  id: 'layout_bad_asset',
  baseAssetId: 'asset_fantasma',
};
const docBadAsset: DocumentDefinition = {
  ...docDef,
  renderProfiles: [{ id: 'p_bad_a', name: 'P Bad A', pages: [{ id: 'pa', layoutId: 'layout_bad_asset' }], purpose: 'print', outputKind: 'pdf' }],
};
const resMissingAsset = resolveDocument({
  doc: docBadAsset,
  profileId: 'p_bad_a',
  layouts: [layoutBadAsset],
  forms: [formDef],
  assetSets: [assetSet],
  data: validCanonicalData,
});
assert(resMissingAsset.ok === false, '18. Base asset inexistente causa ResolutionFailure');
if (!resMissingAsset.ok) {
  assert(resMissingAsset.diagnostics.some(d => d.code === 'BASE_ASSET_NOT_FOUND'), '18. Diagnostic BASE_ASSET_NOT_FOUND gerado');
}

// 18b. Scoped AssetSet Lookup Isolation (Doc points to AssetSet B with 'background' asset)
const layoutScopedAsset: LayoutDefinition = {
  id: 'layout_scoped_asset',
  name: 'Layout Scoped Asset',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  baseAssetId: 'background',
  elements: [],
};
const docScopedAssetB: DocumentDefinition = {
  id: 'doc_scoped_b',
  slug: 'doc-scoped-b',
  name: 'Doc Scoped B',
  version: 1,
  formDefinitionId: 'form_academic_v1',
  assetSetId: 'asset_set_b',
  renderProfiles: [{ id: 'p_sc_b', name: 'P B', pages: [{ id: 'pscb', layoutId: 'layout_scoped_asset' }], purpose: 'print', outputKind: 'pdf' }],
};
const resScopedAsset = resolveDocument({
  doc: docScopedAssetB,
  profileId: 'p_sc_b',
  layouts: [layoutScopedAsset],
  forms: [formDef],
  assetSets: [assetSetA, assetSetB],
  data: validCanonicalData,
});
assert(resScopedAsset.ok === true, '18b. Base asset resolvido estritamente no AssetSet correto do documento');
if (resScopedAsset.ok) {
  assert(resScopedAsset.document.pages[0].baseAsset?.storageRef === 'r2://asset_b.png', '18b. Resolveu asset de AssetSet B ("r2://asset_b.png"), não de A');
}

// 18c. Wrong AssetSet Lookup (Doc points to B, Layout references 'background_a' which only exists in A)
const layoutWrongAsset: LayoutDefinition = {
  id: 'layout_wrong_asset',
  name: 'Layout Wrong Asset',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  baseAssetId: 'background_a_only',
  elements: [],
};
const assetSetAWithExclusive: AssetSet = {
  id: 'asset_set_a',
  name: 'Asset Set A',
  version: 1,
  assets: [{ id: 'background_a_only', name: 'Fundo A Exclusivo', type: 'background_base', mimeType: 'image/png', storageRef: 'r2://a_only.png' }],
};
const docWrongAsset: DocumentDefinition = {
  ...docScopedAssetB,
  renderProfiles: [{ id: 'p_sc_wrong', name: 'P Wrong', pages: [{ id: 'pscw', layoutId: 'layout_wrong_asset' }], purpose: 'print', outputKind: 'pdf' }],
};
const resWrongAsset = resolveDocument({
  doc: docWrongAsset,
  profileId: 'p_sc_wrong',
  layouts: [layoutWrongAsset],
  forms: [formDef],
  assetSets: [assetSetAWithExclusive, assetSetB],
  data: validCanonicalData,
});
assert(resWrongAsset.ok === false, '18c. Layout referenciando asset de outro AssetSet falha com BASE_ASSET_NOT_FOUND (sem busca global)');
if (!resWrongAsset.ok) {
  assert(resWrongAsset.diagnostics.some(d => d.code === 'BASE_ASSET_NOT_FOUND'), '18c. Diagnostic BASE_ASSET_NOT_FOUND emitido');
}

// 19. Wrong Form Binding (Doc points to Form B, Element binds to 'nome_aluno' which only exists in Form A)
const docPointsToFormB: DocumentDefinition = {
  id: 'doc_points_form_b',
  slug: 'doc-points-form-b',
  name: 'Doc Points to Form B',
  version: 1,
  formDefinitionId: 'form_outro_b',
  renderProfiles: [{ id: 'p_fb', name: 'P FB', pages: [{ id: 'pfb', layoutId: 'layout_single' }], purpose: 'print', outputKind: 'pdf' }],
};
const resWrongFormBinding = resolveDocument({
  doc: docPointsToFormB,
  profileId: 'p_fb',
  layouts: [layoutSinglePage],
  forms: [formDef, formB],
  assetSets: [assetSet],
  data: validCanonicalData,
});
assert(resWrongFormBinding.ok === false, '19. Binding validado estritamente contra o FormDefinition referenciado pelo documento');
if (!resWrongFormBinding.ok) {
  assert(resWrongFormBinding.diagnostics.some(d => d.code === 'MISSING_BINDING'), '19. Diagnostic MISSING_BINDING gerado');
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Immutability & Snapshot Independence (Deep Assets and Styles)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 7. Immutability & Snapshot Independence ---');

// Mutable test fixtures
const mutGeometry = { x: 100, y: 200, width: 300, height: 40 };
const mutFont = { family: 'Arial', size: 14, weight: 'bold' as const };
const mutTextConfig = { font: mutFont, color: '#112233', align: 'center' as const };
const mutLayout: LayoutDefinition = {
  id: 'layout_mut',
  name: 'Layout Mutável',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  baseAssetId: 'asset_mut_bg',
  elements: [
    { id: 'el_mut_text', type: 'TEXT', geometry: mutGeometry, staticValue: 'Original Text', textConfig: mutTextConfig },
  ],
};
const mutOutputCanvas = { width: 680, height: 963, unit: 'px' as const, orientation: 'portrait' as const };
const mutTransform = { translateX: 0, translateY: 963, rotateDeg: -90, scaleX: 1.0, scaleY: 1.0 };
const mutProfile = {
  id: 'profile_mut',
  name: 'Profile Mutável',
  pages: [{ id: 'pm', layoutId: 'layout_mut', outputCanvas: mutOutputCanvas, transform: mutTransform }],
  purpose: 'print' as const,
  outputKind: 'pdf' as const,
};
const mutAsset = { id: 'asset_mut_bg', name: 'Mut Bg', type: 'background_base' as const, mimeType: 'image/png', storageRef: 'r2://original_bg.png' };
const mutAssetSet: AssetSet = { id: 'asset_set_mut', name: 'Mut AssetSet', version: 1, assets: [mutAsset] };
const mutDoc: DocumentDefinition = {
  ...docDef,
  formDefinitionId: 'form_academic_v1',
  assetSetId: 'asset_set_mut',
  renderProfiles: [mutProfile],
};
const mutData: CanonicalData = {
  nome_aluno: 'Original Name',
};

const resSnapshot = resolveDocument({
  doc: mutDoc,
  profileId: 'profile_mut',
  layouts: [mutLayout],
  forms: [formDef],
  assetSets: [mutAssetSet],
  data: mutData,
});

assert(resSnapshot.ok === true, 'Snapshot resolution succeeds');
if (resSnapshot.ok) {
  const pSnap = resSnapshot.document.pages[0];
  const elSnap = pSnap.elements[0] as ResolvedTextElement;

  // Mutate inputs AFTER resolution
  mutGeometry.x = 9999;
  mutFont.size = 99;
  mutFont.family = 'Comic Sans';
  mutTextConfig.color = '#FF0000';
  mutOutputCanvas.width = 4444;
  mutTransform.rotateDeg = 180;
  mutAsset.storageRef = 'r2://corrupted_mutated.png';
  mutData.nome_aluno = 'Mutated Name';

  // 29. Output snapshot independent from later layout mutation
  assert(elSnap.geometry.x === 100, '29. Resolved geometry.x permanece 100 após mutação posterior do layout (9999)');

  // 30. Output snapshot independent from later transform mutation
  assert(pSnap.transform.rotateDeg === -90, '30. Resolved transform.rotateDeg permanece -90 após mutação posterior do transform (180)');

  // 31. Output snapshot independent from later outputCanvas mutation
  assert(pSnap.outputCanvas.width === 680, '31. Resolved outputCanvas.width permanece 680 após mutação posterior do outputCanvas (4444)');

  // 31b. Output snapshot independent from later baseAsset mutation
  assert(pSnap.baseAsset?.storageRef === 'r2://original_bg.png', '31b. Resolved baseAsset.storageRef permanece "r2://original_bg.png" após mutação posterior do AssetSet');

  // 31c. Output snapshot independent from later text style / font mutation
  assert(elSnap.style.font.size === 14 && elSnap.style.font.family === 'Arial', '31c. Resolved style.font permanece intacto após mutação do font spec original');
  assert(elSnap.style.color === '#112233', '31c. Resolved style.color permanece inalterado');
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Determinism & Same Layout Reuse
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 8. Determinism & Same Layout Reuse ---');

// 32. Repeat resolution deepEqual deterministic
const resRun1 = resolveDocument({ doc: docDef, profileId: 'profile_print_multi', layouts: [layoutSinglePage, layoutPage2], forms: [formDef], assetSets: [assetSet], data: validCanonicalData });
const resRun2 = resolveDocument({ doc: docDef, profileId: 'profile_print_multi', layouts: [layoutSinglePage, layoutPage2], forms: [formDef], assetSets: [assetSet], data: validCanonicalData });

assert(JSON.stringify(resRun1) === JSON.stringify(resRun2), '32. Duas resoluções consecutivas com mesmos inputs produzem outputs JSON idênticos (determinismo estrito)');

// 33. Same LayoutDefinition reused by two profiles resolves independently
const resPresNative = resolveDocument({ doc: docDef, profileId: 'profile_reuse_native', layouts: [layoutLandscape], forms: [formDef], assetSets: [assetSet], data: validCanonicalData });
const resPresTransf = resolveDocument({ doc: docDef, profileId: 'profile_wallet_transformed', layouts: [layoutLandscape], forms: [formDef], assetSets: [assetSet], data: validCanonicalData });

assert(resPresNative.ok === true && resPresTransf.ok === true, '33. Mesma LayoutDefinition resolvida em dois perfis diferentes com sucesso');
if (resPresNative.ok && resPresTransf.ok) {
  assert(resPresNative.document.pages[0].outputCanvas.width === 963, '33. Profile Nativo tem outputCanvas.width = 963');
  assert(resPresTransf.document.pages[0].outputCanvas.width === 680, '33. Profile Transformado tem outputCanvas.width = 680');
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n========================================');
console.log('Resultado: ' + passedTests + ' PASS  |  0 FAIL');
console.log('Total: ' + totalTests + ' testes do Document / Page / Text Resolver (Phase 3B.2)');
console.log('========================================\n');
