/**
 * tests/engine/resolvers/contracts.test.ts
 *
 * Suíte de testes unitários para os contratos de Multipage & Resolved Render Model (Phase 3B.1).
 * Valida a distinção entre Source/Engine Space e Output/Presentation Space,
 * invariantes de CanvasTransform (degrees, T x R x S, scale > 0),
 * validação de rotationOrigin ('CENTER' | 'TOP_LEFT'),
 * reutilização do mesmo LayoutDefinition com apresentações distintas,
 * e a materialização obrigatória de sourceCanvas, outputCanvas e transform no ResolvedRenderPage.
 */

import type {
  RenderProfile,
  PageDefinition,
  LayoutDefinition,
  CanvasTransform,
  ResolvedRenderDocument,
  ResolvedRenderPage,
  ResolvedCanvasTransform,
  ResolvedTextElement,
  ResolutionDiagnostic,
  ResolutionResult,
} from '../../../client/src/lib/engine';
import {
  validateRenderProfile,
  validateCanvasTransform,
  validateElementGeometry,
  validateEngineGraph,
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

console.log('=== RUNNING ENGINE V1 MULTIPAGE & RESOLVED MODEL CONTRACTS TEST SUITE ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// Layout Fixtures (Source / Engine Space)
// ─────────────────────────────────────────────────────────────────────────────
const layoutPage1: LayoutDefinition = {
  id: 'layout_folha_1',
  name: 'Folha 1 - Cabeçalho e Dados',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    {
      id: 'el_student_name',
      type: 'TEXT',
      geometry: { x: 50, y: 100, width: 694, height: 30, rotation: 0, rotationOrigin: 'CENTER' },
      fieldBinding: 'nome_aluno',
    },
  ],
};

const layoutPage2: LayoutDefinition = {
  id: 'layout_folha_2',
  name: 'Folha 2 - Grade de Notas e Assinaturas',
  canvas: { width: 794, height: 1123, unit: 'px', orientation: 'portrait' },
  elements: [
    {
      id: 'el_grade_table',
      type: 'TABLE',
      geometry: { x: 50, y: 150, width: 694, height: 800 },
    },
  ],
};

const layoutLandscapeSource: LayoutDefinition = {
  id: 'layout_landscape_source',
  name: 'Layout Desenhado em Landscape (963x680)',
  canvas: { width: 963, height: 680, unit: 'px', orientation: 'landscape' },
  elements: [
    {
      id: 'el_badge_name',
      type: 'TEXT',
      geometry: { x: 100, y: 50, width: 400, height: 30, rotation: 0, rotationOrigin: 'CENTER' },
      fieldBinding: 'nome_titular',
    },
  ],
};

const layoutPrintA4: LayoutDefinition = {
  id: 'layout_print_a4',
  name: 'Layout Impressão A4 300 DPI (2481x3508)',
  canvas: { width: 2481, height: 3508, unit: 'px', dpi: 300, orientation: 'portrait' },
  elements: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Single-Page and Multi-Page RenderProfiles
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- 1. RenderProfile & Multipage Hierarchy ---');

// Case 1: Normal Single-Page Document (Source = Output = 2481x3508, Identity Transform)
const singlePageProfile: RenderProfile = {
  id: 'profile_single_print',
  name: 'Perfil Single Page A4',
  pages: [
    { id: 'page_main', layoutId: 'layout_print_a4' },
  ],
  purpose: 'print',
  outputKind: 'pdf',
};
assert(singlePageProfile.pages.length === 1, 'Single-page document possui pages.length === 1 (não é caso especial)');
assert(validateRenderProfile(singlePageProfile, [layoutPrintA4]).length === 0, 'Single-page profile é 100% válido');

// Case 2: Wallet Representability (Source: 963x680 -> Output: 680x963 via Global Transform)
const walletCardProfile: RenderProfile = {
  id: 'profile_wallet_card',
  name: 'Perfil Carteira Digital Rotacionada',
  pages: [
    {
      id: 'page_wallet_front',
      layoutId: 'layout_landscape_source',
      outputCanvas: { width: 680, height: 963, unit: 'px', orientation: 'portrait' },
      transform: {
        translateX: 0,
        translateY: 963,
        rotateDeg: -90,
        scaleX: 1.0,
        scaleY: 1.0,
      },
    },
  ],
  purpose: 'digital_wallet_card',
  outputKind: 'raster_image',
};
assert(validateRenderProfile(walletCardProfile, [layoutLandscapeSource]).length === 0, 'Wallet profile (Source 963x680 -> Output 680x963 com transform -90deg) é 100% válido');
assert(walletCardProfile.pages[0].transform?.rotateDeg === -90, 'Transform da página armazena rotateDeg = -90 graus');
assert(walletCardProfile.pages[0].outputCanvas?.width === 680, 'OutputCanvas da página armazena width = 680');

// Case 3: Mesma LayoutDefinition com apresentações distintas em Profiles diferentes
const profilePresentationA: RenderProfile = {
  id: 'profile_pres_a',
  name: 'Apresentação A (Nativa Landscape)',
  pages: [{ id: 'p_a', layoutId: 'layout_landscape_source' }],
  purpose: 'public_preview',
  outputKind: 'raster_image',
};
const profilePresentationB: RenderProfile = {
  id: 'profile_pres_b',
  name: 'Apresentação B (Rotacionada Portrait com Zoom)',
  pages: [{
    id: 'p_b',
    layoutId: 'layout_landscape_source',
    outputCanvas: { width: 680, height: 963, unit: 'px', orientation: 'portrait' },
    transform: { translateX: 0, translateY: 963, rotateDeg: -90, scaleX: 1.0, scaleY: 1.0 },
  }],
  purpose: 'digital_wallet_card',
  outputKind: 'raster_image',
};
assert(validateRenderProfile(profilePresentationA, [layoutLandscapeSource]).length === 0, 'Profile A com layout nativo é válido');
assert(validateRenderProfile(profilePresentationB, [layoutLandscapeSource]).length === 0, 'Profile B com mesmo layout e apresentação transformada é válido');

// ─────────────────────────────────────────────────────────────────────────────
// 2. Invariantes de Validação de CanvasTransform e ElementGeometry
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 2. Transform and Rotation Invariants Validation ---');

assert(validateCanvasTransform({ translateX: 0, translateY: 0, rotateDeg: 0, scaleX: 1, scaleY: 1 }).length === 0, 'Identity transform é válido');
assert(validateCanvasTransform({ translateX: -50, translateY: 100, rotateDeg: 45.5, scaleX: 2.0, scaleY: 1.5 }).length === 0, 'Transform com números finitos válidos é aceito');

// Rejeição de scale <= 0 e NaN/Infinity
assert(validateCanvasTransform({ scaleX: 0 }).some(e => e.includes('scaleX must be a positive finite number')), 'Validador rejeita scaleX = 0');
assert(validateCanvasTransform({ scaleY: -1 }).some(e => e.includes('scaleY must be a positive finite number')), 'Validador rejeita scaleY negativo (-1)');
assert(validateCanvasTransform({ scaleX: NaN }).some(e => e.includes('scaleX must be a positive finite number')), 'Validador rejeita scaleX = NaN');
assert(validateCanvasTransform({ rotateDeg: Infinity }).some(e => e.includes('rotateDeg must be finite')), 'Validador rejeita rotateDeg = Infinity');

// Validação de rotationOrigin em ElementGeometry
assert(validateElementGeometry({ x: 0, y: 0, width: 100, height: 50, rotation: 45, rotationOrigin: 'CENTER' }).length === 0, 'rotationOrigin CENTER é aceito');
assert(validateElementGeometry({ x: 0, y: 0, width: 100, height: 50, rotation: 45, rotationOrigin: 'TOP_LEFT' }).length === 0, 'rotationOrigin TOP_LEFT é aceito');
assert(validateElementGeometry({ x: 0, y: 0, width: 100, height: 50, rotationOrigin: 'BOTTOM_RIGHT' as unknown as import('../../../client/src/lib/engine').RotationOrigin }).some(e => e.includes('Invalid rotation origin')), 'Validador rejeita rotationOrigin desconhecido');

// ─────────────────────────────────────────────────────────────────────────────
// 3. Invariantes de Validação Estrutural de Páginas
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 3. Page Structural Invariants Validation ---');

// Duplicate Page ID
const dupPageProfile: RenderProfile = {
  id: 'profile_dup_pages',
  name: 'Profile com Page ID Duplicado',
  pages: [
    { id: 'same_page_id', layoutId: 'layout_folha_1' },
    { id: 'same_page_id', layoutId: 'layout_folha_2' },
  ],
  purpose: 'print',
  outputKind: 'pdf',
};
assert(validateRenderProfile(dupPageProfile, [layoutPage1, layoutPage2]).some(e => e.includes('Duplicate page id')), 'Validador rejeita Page ID duplicado no profile');

// Missing Layout Reference
const missingLayoutProfile: RenderProfile = {
  id: 'profile_bad_layout',
  name: 'Profile com Layout Inexistente',
  pages: [
    { id: 'page_1', layoutId: 'layout_fantasma' },
  ],
  purpose: 'print',
  outputKind: 'pdf',
};
assert(validateRenderProfile(missingLayoutProfile, [layoutPage1]).some(e => e.includes('references unknown layoutId')), 'Validador rejeita página apontando para layout inexistente');

// Empty pages array
const emptyPagesProfile: RenderProfile = {
  id: 'profile_empty_pages',
  name: 'Profile sem Páginas',
  pages: [],
  purpose: 'print',
  outputKind: 'pdf',
};
assert(validateRenderProfile(emptyPagesProfile, [layoutPage1]).some(e => e.includes('must have at least one PageDefinition')), 'Validador rejeita profile com pages[] vazio');

// ─────────────────────────────────────────────────────────────────────────────
// 4. Resolved Render Model Contracts (Materialized Spaces & Transforms)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- 4. Resolved Render Model Materialized Spaces ---');

const sampleResolvedElement: ResolvedTextElement = {
  id: 'el_student_name',
  type: 'TEXT',
  geometry: { x: 50, y: 100, width: 694, height: 30, rotation: 0, rotationOrigin: 'CENTER' },
  text: 'CARLOS SILVA PEREIRA', // Valor resolvido final (sem fieldBinding nem lookup)
  style: {
    font: { family: 'Times New Roman', size: 24, weight: 'bold' },
    color: '#000000',
    align: 'left',
  },
  zIndex: 1,
};

assert(!('fieldBinding' in sampleResolvedElement), 'ResolvedTextElement NÃO contém fieldBinding (resolução de dados concluída)');
assert(sampleResolvedElement.text === 'CARLOS SILVA PEREIRA', 'ResolvedTextElement contém texto final renderizável');

// Página resolvida Normal (Source = Output, Identity Transform Materializado)
const resolvedNormalPage: ResolvedRenderPage = {
  pageId: 'page_main',
  pageIndex: 0,
  layoutId: 'layout_print_a4',
  sourceCanvas: { width: 2481, height: 3508, unit: 'px', dpi: 300, orientation: 'portrait' },
  outputCanvas: { width: 2481, height: 3508, unit: 'px', dpi: 300, orientation: 'portrait' },
  transform: { translateX: 0, translateY: 0, rotateDeg: 0, scaleX: 1, scaleY: 1 },
  elements: [sampleResolvedElement],
};

// Página resolvida com Rotação (Source 963x680 -> Output 680x963, Transform Materializado)
const resolvedRotatedPage: ResolvedRenderPage = {
  pageId: 'page_wallet_front',
  pageIndex: 1,
  layoutId: 'layout_landscape_source',
  sourceCanvas: { width: 963, height: 680, unit: 'px', orientation: 'landscape' },
  outputCanvas: { width: 680, height: 963, unit: 'px', orientation: 'portrait' },
  transform: { translateX: 0, translateY: 963, rotateDeg: -90, scaleX: 1, scaleY: 1 },
  elements: [sampleResolvedElement],
};

assert(resolvedNormalPage.sourceCanvas.width === 2481 && resolvedNormalPage.outputCanvas.width === 2481, 'Normal page: sourceCanvas e outputCanvas idênticos materializados');
assert(resolvedNormalPage.transform.rotateDeg === 0, 'Normal page: identity transform materializado (rotateDeg = 0)');
assert(resolvedRotatedPage.sourceCanvas.width === 963 && resolvedRotatedPage.outputCanvas.width === 680, 'Rotated page: sourceCanvas (963x680) e outputCanvas (680x963) distintos materializados');
assert(resolvedRotatedPage.transform.rotateDeg === -90, 'Rotated page: transform global materializado (rotateDeg = -90)');

// ResolvedRenderDocument Multi-Page
const resolvedDoc: ResolvedRenderDocument = {
  documentDefinitionId: 'doc_cnh_v1',
  profileId: 'profile_multipage_cnh',
  pages: [resolvedNormalPage, resolvedRotatedPage],
};

assert(resolvedDoc.pages.length === 2, 'ResolvedRenderDocument armazena páginas ordenadas com seus espaços');
assert(resolvedDoc.pages[0].pageIndex === 0 && resolvedDoc.pages[1].pageIndex === 1, 'pageIndex determinístico preservado');

// Resolution Result Discriminated Union
const resSuccess: ResolutionResult = {
  ok: true,
  document: resolvedDoc,
  diagnostics: [],
};
assert(resSuccess.ok === true, 'ResolutionSuccess possui ok: true');

const resFailure: ResolutionResult = {
  ok: false,
  diagnostics: [{ level: 'error', code: 'INVALID_TRANSFORM', message: 'Scale inválido' }],
};
assert(resFailure.ok === false, 'ResolutionFailure possui ok: false');
assert(!('document' in resFailure), 'ResolutionFailure NÃO expõe document');

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n========================================');
console.log('Resultado: ' + passedTests + ' PASS  |  0 FAIL');
console.log('Total: ' + totalTests + ' testes de contratos Multipage & Resolved Model (Phase 3B.1)');
console.log('========================================\n');
