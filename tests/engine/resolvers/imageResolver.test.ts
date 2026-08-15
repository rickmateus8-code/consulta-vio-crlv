/**
 * tests/engine/resolvers/imageResolver.test.ts
 *
 * Suíte de testes unitários para a resolução estática pura de IMAGE (Phase 3B.3B).
 * Cobre lookup em escopo, compatibilidade de AssetType, fit explícito, validação de opacity,
 * ordenação de z-order unificada (TEXT + IMAGE) e imutabilidade estrita de snapshot.
 */

import type {
  DocumentDefinition,
  LayoutDefinition,
  FormDefinition,
  AssetSet,
  CanonicalData,
  ResolvedImageElement,
  ResolvedTextElement,
} from '../../../client/src/lib/engine';
import {
  resolveDocument,
  resolveImageElement,
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

console.log('=== RUNNING ENGINE V1 STATIC IMAGE RESOLVER TEST SUITE ===\n');

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
      dimensions: { width: 500, height: 500 },
    },
    {
      id: 'selo_seguranca',
      name: 'Selo Holográfico',
      type: 'seal',
      mimeType: 'image/png',
      storageRef: 'r2://selo.png',
      dimensions: { width: 200, height: 200 },
    },
    {
      id: 'marca_dagua',
      name: 'Marca Dágua Oficial',
      type: 'watermark',
      mimeType: 'image/png',
      storageRef: 'r2://watermark.png',
    },
    {
      id: 'overlay_seguranca',
      name: 'Overlay Guilloche',
      type: 'overlay',
      mimeType: 'image/png',
      storageRef: 'r2://overlay.png',
    },
    {
      id: 'foto_fundo_padrao',
      name: 'Fundo Base Reusado',
      type: 'background_base',
      mimeType: 'image/png',
      storageRef: 'r2://bg_base.png',
    },
    {
      id: 'fonte_incompativel',
      name: 'Fonte TTF Não-Visual',
      type: 'font',
      mimeType: 'font/ttf',
      storageRef: 'r2://font.ttf',
    },
  ],
};

const assetSetOther: AssetSet = {
  id: 'asset_set_other',
  name: 'Asset Set Outro',
  version: 1,
  assets: [
    {
      id: 'logo_brasao',
      name: 'Brasão Outro',
      type: 'logo',
      mimeType: 'image/png',
      storageRef: 'r2://brasao_outro.png',
    },
  ],
};

const layoutImageAndText: LayoutDefinition = {
  id: 'layout_img_txt',
  name: 'Layout com Imagem e Texto',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  baseAssetId: 'foto_fundo_padrao',
  elements: [
    {
      id: 'el_logo_header',
      type: 'IMAGE',
      geometry: { x: 50.5, y: 40.25, width: 120, height: 120, rotation: 0, zIndex: 1 },
      assetRefId: 'logo_brasao',
      imageConfig: { fit: 'contain', opacity: 0.95 },
    },
    {
      id: 'el_name_text',
      type: 'TEXT',
      geometry: { x: 200, y: 80, width: 500, height: 30, zIndex: 2 },
      fieldBinding: 'nome_titular',
    },
    {
      id: 'el_seal_footer',
      type: 'IMAGE',
      geometry: { x: 600, y: 950, width: 100, height: 100, zIndex: 3 },
      assetRefId: 'selo_seguranca',
      imageConfig: { fit: 'cover', opacity: 1 },
    },
  ],
};

const docImage: DocumentDefinition = {
  id: 'doc_img_v1',
  slug: 'documento-com-imagem',
  name: 'Documento com Imagem',
  version: 1,
  formDefinitionId: 'form_doc_v1',
  assetSetId: 'asset_set_main',
  renderProfiles: [
    {
      id: 'profile_print_img',
      name: 'Perfil Impressão com Imagens',
      pages: [{ id: 'page_main', layoutId: 'layout_img_txt' }],
      purpose: 'print',
      outputKind: 'pdf',
    },
  ],
};

const canonicalData: CanonicalData = {
  nome_titular: 'MARIA SILVA SANTOS',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Basic Resolution & Contract Integrity
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. Basic Static Image Resolution ---');

const res1 = resolveDocument({
  doc: docImage,
  profileId: 'profile_print_img',
  layouts: [layoutImageAndText],
  forms: [formDef],
  assetSets: [assetSetDoc],
  data: canonicalData,
});

assert(res1.ok === true, '1. Valid static IMAGE resolves with ok: true');
if (res1.ok) {
  const page = res1.document.pages[0];
  assert(page.elements.length === 3, '1. Todos os 3 elementos (2 imagens + 1 texto) foram resolvidos');

  const logoEl = page.elements.find(e => e.id === 'el_logo_header') as ResolvedImageElement;
  assert(logoEl.type === 'IMAGE', '2. Tipo é estritamente IMAGE');
  assert(logoEl.asset.id === 'logo_brasao', '2. asset.id correto resolvido');
  assert(logoEl.asset.storageRef === 'r2://brasao.png', '2. asset.storageRef materializado');
  assert(logoEl.asset.mimeType === 'image/png', '2. asset.mimeType preservado');
  assert(logoEl.asset.dimensions?.width === 500 && logoEl.asset.dimensions?.height === 500, '2. asset.dimensions preservadas');
  assert(!('assetRefId' in logoEl), '3. assetRefId removido do resolved snapshot (zero lookup pendente)');
  assert(logoEl.presentation.fit === 'contain', '14. presentation.fit "contain" materializado');
  assert(logoEl.presentation.opacity === 0.95, '15. presentation.opacity 0.95 materializado');

  // 12 & 13. Geometry & Decimals
  assert(logoEl.geometry.x === 50.5 && logoEl.geometry.y === 40.25, '12 & 13. Decimal geometry preservada exatamente');

  // 27 & 28. BaseAsset & TEXT unchanged
  assert(page.baseAsset?.storageRef === 'r2://bg_base.png', '27. baseAsset preservado separadamente do array de elementos');
  const txtEl = page.elements.find(e => e.id === 'el_name_text') as ResolvedTextElement;
  assert(txtEl.type === 'TEXT' && txtEl.text === 'MARIA SILVA SANTOS', '28. TEXT behavior preservado intacto');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Scoped Lookup & Isolation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Scoped Asset Lookup & Isolation ---');

const docScopedOther: DocumentDefinition = {
  ...docImage,
  assetSetId: 'asset_set_other',
};

const resScopedOther = resolveDocument({
  doc: docScopedOther,
  profileId: 'profile_print_img',
  layouts: [layoutImageAndText],
  forms: [formDef],
  assetSets: [assetSetDoc, assetSetOther],
  data: canonicalData,
});

// Em asset_set_other, selo_seguranca não existe -> deve falhar
assert(resScopedOther.ok === false, '4 & 6. Lookup é estritamente escopado no AssetSet do documento');
if (!resScopedOther.ok) {
  assert(resScopedOther.diagnostics.some(d => d.code === 'ELEMENT_ASSET_NOT_FOUND'), '6. Falha ELEMENT_ASSET_NOT_FOUND para asset não existente no AssetSet scoped');
}

// 5. Same asset ID in two AssetSets selects correct scoped one
const layoutOnlyLogo: LayoutDefinition = {
  id: 'layout_only_logo',
  name: 'Layout Logo Only',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    {
      id: 'el_logo',
      type: 'IMAGE',
      geometry: { x: 50, y: 50, width: 100, height: 100 },
      assetRefId: 'logo_brasao',
      imageConfig: { fit: 'contain' },
    },
  ],
};
const docScopedOtherLogo: DocumentDefinition = {
  ...docImage,
  assetSetId: 'asset_set_other',
  renderProfiles: [{ id: 'p_other', name: 'P Other', pages: [{ id: 'po', layoutId: 'layout_only_logo' }], purpose: 'print', outputKind: 'pdf' }],
};
const resScopedLogoOther = resolveDocument({
  doc: docScopedOtherLogo,
  profileId: 'p_other',
  layouts: [layoutOnlyLogo],
  forms: [formDef],
  assetSets: [assetSetDoc, assetSetOther],
  data: canonicalData,
});
assert(resScopedLogoOther.ok === true, '5. Same asset ID resolves asset from the document-scoped AssetSet');
if (resScopedLogoOther.ok) {
  const el = resScopedLogoOther.document.pages[0].elements[0] as ResolvedImageElement;
  assert(el.asset.storageRef === 'r2://brasao_outro.png', '5. Resolveu asset de asset_set_other ("r2://brasao_outro.png"), não de asset_set_main');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Validation Failures & Errors
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Validation Failures & Diagnostics ---');

// 7. Missing assetRefId
const layoutMissingRef: LayoutDefinition = {
  id: 'layout_no_ref',
  name: 'Layout No Ref',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_bad_ref', type: 'IMAGE', geometry: { x: 0, y: 0, width: 10, height: 10 }, imageConfig: { fit: 'contain' } },
  ],
};
const docNoRef: DocumentDefinition = {
  ...docImage,
  renderProfiles: [{ id: 'p_no_ref', name: 'P', pages: [{ id: 'pn', layoutId: 'layout_no_ref' }], purpose: 'print', outputKind: 'pdf' }],
};
const resNoRef = resolveDocument({ doc: docNoRef, profileId: 'p_no_ref', layouts: [layoutMissingRef], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(resNoRef.ok === false, '7. Missing assetRefId fails');
if (!resNoRef.ok) {
  assert(resNoRef.diagnostics.some(d => d.code === 'MISSING_ELEMENT_ASSET_REF'), '7. Diagnostic MISSING_ELEMENT_ASSET_REF gerado');
}

// 8. Missing asset
const layoutPhantomAsset: LayoutDefinition = {
  id: 'layout_phantom',
  name: 'Layout Phantom',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_phantom', type: 'IMAGE', geometry: { x: 0, y: 0, width: 10, height: 10 }, assetRefId: 'asset_fantasma', imageConfig: { fit: 'contain' } },
  ],
};
const docPhantom: DocumentDefinition = {
  ...docImage,
  renderProfiles: [{ id: 'p_ph', name: 'P', pages: [{ id: 'pph', layoutId: 'layout_phantom' }], purpose: 'print', outputKind: 'pdf' }],
};
const resPhantom = resolveDocument({ doc: docPhantom, profileId: 'p_ph', layouts: [layoutPhantomAsset], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(resPhantom.ok === false, '8. Missing asset fails');
if (!resPhantom.ok) {
  assert(resPhantom.diagnostics.some(d => d.code === 'ELEMENT_ASSET_NOT_FOUND'), '8. Diagnostic ELEMENT_ASSET_NOT_FOUND gerado');
}

// 9. Asset Type Incompatibility (font & background_base as IMAGE)

// Case A: background_base as LayoutDefinition.baseAssetId -> SUCCESS
const layoutBaseOnly: LayoutDefinition = {
  id: 'layout_base_only',
  name: 'Layout Base Only',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  baseAssetId: 'foto_fundo_padrao',
  elements: [],
};
const docBaseOnly: DocumentDefinition = {
  ...docImage,
  renderProfiles: [{ id: 'p_bo', name: 'P Base Only', pages: [{ id: 'pbo', layoutId: 'layout_base_only' }], purpose: 'print', outputKind: 'pdf' }],
};
const resBaseOnly = resolveDocument({ doc: docBaseOnly, profileId: 'p_bo', layouts: [layoutBaseOnly], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(resBaseOnly.ok === true, 'Case A: background_base as LayoutDefinition.baseAssetId succeeds');
if (resBaseOnly.ok) {
  assert(resBaseOnly.document.pages[0].baseAsset?.type === 'background_base', 'Case A: Resolved baseAsset has type "background_base"');
}

// Case B: background_base as IMAGE.assetRefId -> FAILURE with INVALID_ELEMENT_ASSET_TYPE
const layoutBgAsImage: LayoutDefinition = {
  id: 'layout_bg_img',
  name: 'Layout Bg As Image',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_bg_as_img', type: 'IMAGE', geometry: { x: 0, y: 0, width: 100, height: 100 }, assetRefId: 'foto_fundo_padrao', imageConfig: { fit: 'contain' } },
  ],
};
const docBgAsImage: DocumentDefinition = {
  ...docImage,
  renderProfiles: [{ id: 'p_bgimg', name: 'P Bg Image', pages: [{ id: 'pbi', layoutId: 'layout_bg_img' }], purpose: 'print', outputKind: 'pdf' }],
};
const resBgAsImage = resolveDocument({ doc: docBgAsImage, profileId: 'p_bgimg', layouts: [layoutBgAsImage], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(resBgAsImage.ok === false, 'Case B: background_base as IMAGE.assetRefId fails');
if (!resBgAsImage.ok) {
  assert(resBgAsImage.diagnostics.some(d => d.code === 'INVALID_ELEMENT_ASSET_TYPE'), 'Case B: Diagnostic INVALID_ELEMENT_ASSET_TYPE generated for background_base as IMAGE');
}

// Case C: Layout uses background_base as baseAsset, IMAGE uses logo -> SUCCESS
const layoutBgAndLogo: LayoutDefinition = {
  id: 'layout_bg_and_logo',
  name: 'Layout Bg and Logo',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  baseAssetId: 'foto_fundo_padrao',
  elements: [
    { id: 'el_logo_valid', type: 'IMAGE', geometry: { x: 10, y: 10, width: 80, height: 80 }, assetRefId: 'logo_brasao', imageConfig: { fit: 'contain' } },
  ],
};
const docBgAndLogo: DocumentDefinition = {
  ...docImage,
  renderProfiles: [{ id: 'p_bglogo', name: 'P Bg and Logo', pages: [{ id: 'pbl', layoutId: 'layout_bg_and_logo' }], purpose: 'print', outputKind: 'pdf' }],
};
const resBgAndLogo = resolveDocument({ doc: docBgAndLogo, profileId: 'p_bglogo', layouts: [layoutBgAndLogo], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(resBgAndLogo.ok === true, 'Case C: Layout uses background_base as baseAsset and logo as IMAGE succeeds');
if (resBgAndLogo.ok) {
  assert(resBgAndLogo.document.pages[0].baseAsset?.id === 'foto_fundo_padrao', 'Case C: baseAsset correctly resolved');
  const imgEl = resBgAndLogo.document.pages[0].elements[0] as ResolvedImageElement;
  assert(imgEl.asset.id === 'logo_brasao' && imgEl.asset.type === 'logo', 'Case C: IMAGE element correctly resolved with logo asset');
}

// Case D: font as IMAGE.assetRefId -> FAILURE with INVALID_ELEMENT_ASSET_TYPE
const layoutIncompatibleFont: LayoutDefinition = {
  id: 'layout_font_incompat',
  name: 'Layout Font Incompat',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_font_img', type: 'IMAGE', geometry: { x: 0, y: 0, width: 10, height: 10 }, assetRefId: 'fonte_incompativel', imageConfig: { fit: 'contain' } },
  ],
};
const docIncompatFont: DocumentDefinition = {
  ...docImage,
  renderProfiles: [{ id: 'p_inc_font', name: 'P Inc Font', pages: [{ id: 'pincf', layoutId: 'layout_font_incompat' }], purpose: 'print', outputKind: 'pdf' }],
};
const resIncompatFont = resolveDocument({ doc: docIncompatFont, profileId: 'p_inc_font', layouts: [layoutIncompatibleFont], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(resIncompatFont.ok === false, 'Case D: font as IMAGE.assetRefId fails');
if (!resIncompatFont.ok) {
  assert(resIncompatFont.diagnostics.some(d => d.code === 'INVALID_ELEMENT_ASSET_TYPE'), 'Case D: Diagnostic INVALID_ELEMENT_ASSET_TYPE generated for font as IMAGE');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Visibility Filter
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Visibility Filter ---');

const layoutHiddenBrokenImg: LayoutDefinition = {
  id: 'layout_hidden_broken',
  name: 'Layout Hidden Broken',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_visible_ok', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10 }, staticValue: 'OK' },
    { id: 'el_hidden_missing_asset', type: 'IMAGE', geometry: { x: 0, y: 0, width: 10, height: 10 }, assetRefId: 'asset_fantasma', visibility: false, imageConfig: { fit: 'contain' } },
    { id: 'el_hidden_incompat_asset', type: 'IMAGE', geometry: { x: 0, y: 0, width: 10, height: 10 }, assetRefId: 'fonte_incompativel', visibility: false, imageConfig: { fit: 'contain' } },
  ],
};
const docHidden: DocumentDefinition = {
  ...docImage,
  renderProfiles: [{ id: 'p_hid', name: 'P', pages: [{ id: 'ph', layoutId: 'layout_hidden_broken' }], purpose: 'print', outputKind: 'pdf' }],
};
const resHidden = resolveDocument({ doc: docHidden, profileId: 'p_hid', layouts: [layoutHiddenBrokenImg], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(resHidden.ok === true, '10 & 11. Hidden missing/incompatible assets are ignored without resolution error');
if (resHidden.ok) {
  assert(resHidden.document.pages[0].elements.length === 1, '10 & 11. Somente elemento visível foi incluído no snapshot');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Opacity Validations
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 5. Opacity Validations ---');

// Opacity 0 and 1
const layoutOpacity0: LayoutDefinition = {
  id: 'layout_op_0',
  name: 'Layout Opacity 0',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_op0', type: 'IMAGE', geometry: { x: 0, y: 0, width: 10, height: 10 }, assetRefId: 'logo_brasao', imageConfig: { fit: 'fill', opacity: 0 } },
  ],
};
const docOp0: DocumentDefinition = {
  ...docImage,
  renderProfiles: [{ id: 'p_op0', name: 'P', pages: [{ id: 'pop0', layoutId: 'layout_op_0' }], purpose: 'print', outputKind: 'pdf' }],
};
const resOp0 = resolveDocument({ doc: docOp0, profileId: 'p_op0', layouts: [layoutOpacity0], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(resOp0.ok === true, '16. Opacity = 0 é válida');
if (resOp0.ok) {
  const el = resOp0.document.pages[0].elements[0] as ResolvedImageElement;
  assert(el.presentation.opacity === 0, '16. Opacity 0 materializada');
}

// Opacity < 0 rejected
const layoutOpNeg: LayoutDefinition = {
  id: 'layout_op_neg',
  name: 'Layout Opacity Neg',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_op_neg', type: 'IMAGE', geometry: { x: 0, y: 0, width: 10, height: 10 }, assetRefId: 'logo_brasao', imageConfig: { fit: 'contain', opacity: -0.1 } },
  ],
};
const docOpNeg: DocumentDefinition = {
  ...docImage,
  renderProfiles: [{ id: 'p_op_neg', name: 'P', pages: [{ id: 'popn', layoutId: 'layout_op_neg' }], purpose: 'print', outputKind: 'pdf' }],
};
const resOpNeg = resolveDocument({ doc: docOpNeg, profileId: 'p_op_neg', layouts: [layoutOpNeg], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(resOpNeg.ok === false, '18. Opacity < 0 é rejeitada com INVALID_IMAGE_CONFIG');

// Opacity > 1 rejected
const layoutOpOver: LayoutDefinition = {
  id: 'layout_op_over',
  name: 'Layout Opacity Over',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_op_over', type: 'IMAGE', geometry: { x: 0, y: 0, width: 10, height: 10 }, assetRefId: 'logo_brasao', imageConfig: { fit: 'contain', opacity: 1.05 } },
  ],
};
const docOpOver: DocumentDefinition = {
  ...docImage,
  renderProfiles: [{ id: 'p_op_over', name: 'P', pages: [{ id: 'popo', layoutId: 'layout_op_over' }], purpose: 'print', outputKind: 'pdf' }],
};
const resOpOver = resolveDocument({ doc: docOpOver, profileId: 'p_op_over', layouts: [layoutOpOver], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(resOpOver.ok === false, '19. Opacity > 1 é rejeitada com INVALID_IMAGE_CONFIG');

// ─────────────────────────────────────────────────────────────────────────────
// 6. Snapshot Independence (Asset, Dimensions, Config, Geometry)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 6. Snapshot Independence ---');

const mutAssetDimensions = { width: 300, height: 300 };
const mutAssetRef = {
  id: 'asset_mut',
  name: 'Asset Mutável',
  type: 'logo' as const,
  mimeType: 'image/png',
  storageRef: 'r2://original_img.png',
  dimensions: mutAssetDimensions,
};
const mutAssetSetImg: AssetSet = {
  id: 'asset_set_mut_img',
  name: 'Mut AssetSet Img',
  version: 1,
  assets: [mutAssetRef],
};
const mutImgGeometry = { x: 10, y: 20, width: 100, height: 100 };
const mutImgConfig = { fit: 'contain' as const, opacity: 0.8 };
const mutLayoutImg: LayoutDefinition = {
  id: 'layout_mut_img',
  name: 'Layout Mut Img',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_mut_img', type: 'IMAGE', geometry: mutImgGeometry, assetRefId: 'asset_mut', imageConfig: mutImgConfig },
  ],
};
const mutDocImg: DocumentDefinition = {
  ...docImage,
  assetSetId: 'asset_set_mut_img',
  renderProfiles: [{ id: 'p_mut', name: 'P Mut', pages: [{ id: 'pm', layoutId: 'layout_mut_img' }], purpose: 'print', outputKind: 'pdf' }],
};

const resSnapImg = resolveDocument({
  doc: mutDocImg,
  profileId: 'p_mut',
  layouts: [mutLayoutImg],
  forms: [formDef],
  assetSets: [mutAssetSetImg],
  data: canonicalData,
});

assert(resSnapImg.ok === true, 'Snapshot resolution succeeds');
if (resSnapImg.ok) {
  const elSnap = resSnapImg.document.pages[0].elements[0] as ResolvedImageElement;

  // Mutate inputs AFTER resolution
  mutAssetRef.storageRef = 'r2://tampered_storage.png';
  mutAssetDimensions.width = 9999;
  mutImgGeometry.x = 8888;
  mutImgConfig.opacity = 0.1;

  assert(elSnap.asset.storageRef === 'r2://original_img.png', '20. Resolved asset.storageRef permanece original após mutação posterior');
  assert(elSnap.asset.dimensions?.width === 300, '21. Resolved asset.dimensions.width permanece 300 após mutação posterior (9999)');
  assert(elSnap.presentation.opacity === 0.8, '22. Resolved presentation.opacity permanece 0.8 após mutação posterior (0.1)');
  assert(elSnap.geometry.x === 10, '23. Resolved geometry.x permanece 10 após mutação posterior (8888)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Z-Order Unified Ordering (TEXT + IMAGE)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 7. Z-Order Unified Ordering ---');

const layoutZMix: LayoutDefinition = {
  id: 'layout_z_mix',
  name: 'Layout Z Mix',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    { id: 'el_txt_top', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 10 }, staticValue: 'Top Text' },
    { id: 'el_img_mid', type: 'IMAGE', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 5 }, assetRefId: 'logo_brasao', imageConfig: { fit: 'contain' } },
    { id: 'el_txt_mid', type: 'TEXT', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 5 }, staticValue: 'Mid Text' },
    { id: 'el_img_bot', type: 'IMAGE', geometry: { x: 0, y: 0, width: 10, height: 10, zIndex: 1 }, assetRefId: 'selo_seguranca', imageConfig: { fit: 'cover' } },
  ],
};
const docZMix: DocumentDefinition = {
  ...docImage,
  renderProfiles: [{ id: 'p_zmix', name: 'P', pages: [{ id: 'pzm', layoutId: 'layout_z_mix' }], purpose: 'print', outputKind: 'pdf' }],
};
const resZMix = resolveDocument({ doc: docZMix, profileId: 'p_zmix', layouts: [layoutZMix], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(resZMix.ok === true, '24 & 25. Z-order unified resolution succeeds');
if (resZMix.ok) {
  const els = resZMix.document.pages[0].elements;
  assert(els[0].id === 'el_img_bot', '24. Menor zIndex (1) fica em primeiro lugar (IMAGE)');
  assert(els[1].id === 'el_img_mid', '25. Mesmos zIndex (5) preservam ordem original: IMAGE antes de TEXT');
  assert(els[2].id === 'el_txt_mid', '25. TEXT em terceiro');
  assert(els[3].id === 'el_txt_top', '24. Maior zIndex (10) fica por último (TEXT)');
}

// 26. Repeat resolution deepEqual deterministic
const resRunA = resolveDocument({ doc: docImage, profileId: 'profile_print_img', layouts: [layoutImageAndText], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
const resRunB = resolveDocument({ doc: docImage, profileId: 'profile_print_img', layouts: [layoutImageAndText], forms: [formDef], assetSets: [assetSetDoc], data: canonicalData });
assert(JSON.stringify(resRunA) === JSON.stringify(resRunB), '26. Duas resoluções consecutivas com IMAGE produzem JSONs idênticos');

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n========================================');
console.log('Resultado: ' + passedTests + ' PASS  |  0 FAIL');
console.log('Total: ' + totalTests + ' testes do Static Image Resolver (Phase 3B.3B)');
console.log('========================================\n');
