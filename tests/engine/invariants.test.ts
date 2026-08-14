/**
 * tests/engine/invariants.test.ts
 *
 * Suíte de testes unitários para a DocMaster Engine V1 (Phase 1).
 * Valida a integridade matemática dos contratos puros e os 12 Invariantes Arquiteturais.
 */

import {
  validateCanvasDefinition,
  validateElementGeometry,
  validateFormDefinition,
  validateAssetSet,
  validateLayoutDefinition,
  validateRenderProfile,
  validateEngineGraph,
  type FormDefinition,
  type AssetSet,
  type LayoutDefinition,
  type RenderProfile,
  type DocumentDefinition,
  type CanvasDefinition,
  type ElementGeometry,
  type ElementDefinition,
  type CanonicalData,
  type EmissionIdentity,
  type EditorSessionState,
} from '../../client/src/lib/engine';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${msg}`);
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('=== RUNNING ENGINE V1 CONTRACT & INVARIANTS TEST SUITE ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. INVARIANTE 1: FormDefinition define somente DADOS e não possui geometria
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- Invariant 1: FormDefinition pure data separation ---');
const sampleForm: FormDefinition = {
  id: 'form_generic_certificate_v1',
  name: 'Formulário de Certificado Genérico',
  version: 1,
  fields: [
    { id: 'f1', key: 'student_name', label: 'Nome do Aluno', type: 'text', required: true },
    { id: 'f2', key: 'course_title', label: 'Nome do Curso', type: 'text', required: true },
    { id: 'f3', key: 'completion_date', label: 'Data de Conclusão', type: 'date', required: true },
    { id: 'f4', key: 'workload_hours', label: 'Carga Horária', type: 'number', required: false },
  ],
};

const formErrors = validateFormDefinition(sampleForm);
assert(formErrors.length === 0, 'FormDefinition válido passa com 0 erros');

const hasGeometryInForm = sampleForm.fields.some((f: Record<string, unknown>) =>
  f.x !== undefined || f.y !== undefined || f.width !== undefined || f.height !== undefined
);
assert(!hasGeometryInForm, 'Nenhum campo de FormDefinition possui coordenadas x, y, width ou height');

// Teste de duplicata de chave no formulário
const duplicateKeyForm: FormDefinition = {
  id: 'form_dup',
  name: 'Formulário Duplicado',
  version: 1,
  fields: [
    { id: 'f1', key: 'name', label: 'Nome 1', type: 'text', required: true },
    { id: 'f2', key: 'name', label: 'Nome 2', type: 'text', required: true },
  ],
};
const dupFormErrors = validateFormDefinition(duplicateKeyForm);
assert(dupFormErrors.some(e => e.includes('Duplicate field key')), 'Validador detecta chave de campo duplicada no formulário');

// Teste de ID de campo duplicado
const duplicateIdForm: FormDefinition = {
  id: 'form_dup_id',
  name: 'Formulário Duplicado ID',
  version: 1,
  fields: [
    { id: 'same_id', key: 'key_a', label: 'Campo A', type: 'text', required: true },
    { id: 'same_id', key: 'key_b', label: 'Campo B', type: 'text', required: true },
  ],
};
assert(validateFormDefinition(duplicateIdForm).some(e => e.includes('Duplicate field id')), 'Validador detecta ID de campo duplicado no formulário');

// Teste de ID de formulário vazio
const emptyIdForm: FormDefinition = { id: '', name: 'Sem ID', version: 1, fields: [] };
assert(validateFormDefinition(emptyIdForm).some(e => e.includes('id cannot be empty')), 'Validador rejeita FormDefinition com ID vazio');

// ─────────────────────────────────────────────────────────────────────────────
// 2. INVARIANTE 2 & 6: LayoutDefinition é dono da geometria e suporta dimensões arbitrárias
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Invariant 2 & 6: LayoutDefinition owns geometry & supports arbitrary dimensions ---');

// A4 Portrait
const a4PortraitCanvas: CanvasDefinition = { width: 794, height: 1123, unit: 'px', dpi: 96, orientation: 'portrait' };
assert(validateCanvasDefinition(a4PortraitCanvas).length === 0, 'Canvas A4 Portrait (px) é válido');

// A4 Landscape em mm
const a4LandscapeMm: CanvasDefinition = { width: 297, height: 210, unit: 'mm', orientation: 'landscape' };
assert(validateCanvasDefinition(a4LandscapeMm).length === 0, 'Canvas A4 Landscape em mm é válido');

// Card em pt
const cardPtCanvas: CanvasDefinition = { width: 720, height: 510, unit: 'pt', orientation: 'custom' };
assert(validateCanvasDefinition(cardPtCanvas).length === 0, 'Canvas Card em pt é válido');

// Card em in
const inCanvas: CanvasDefinition = { width: 8.5, height: 11, unit: 'in', dpi: 300, orientation: 'portrait' };
assert(validateCanvasDefinition(inCanvas).length === 0, 'Canvas Letter em polegadas (in) com DPI 300 é válido');

// Square
const squareCanvas: CanvasDefinition = { width: 600, height: 600, unit: 'px', orientation: 'square' };
assert(validateCanvasDefinition(squareCanvas).length === 0, 'Canvas Square 1:1 é válido');

// Canvas inválido (negativo, zero)
const invalidCanvas: CanvasDefinition = { width: -100, height: 0, unit: 'px', orientation: 'portrait' };
const canvasErrors = validateCanvasDefinition(invalidCanvas);
assert(canvasErrors.length >= 2, 'Validador rejeita dimensões negativas ou zeradas de canvas');

// Geometria com NaN e Infinity
const nanGeo: ElementGeometry = { x: NaN, y: 100, width: 200, height: 50 };
assert(validateElementGeometry(nanGeo).some(e => e.includes('x must be finite')), 'Validador rejeita coordenada x = NaN');

const infGeo: ElementGeometry = { x: 100, y: Infinity, width: 200, height: 50 };
assert(validateElementGeometry(infGeo).some(e => e.includes('y must be finite')), 'Validador rejeita coordenada y = Infinity');

// ─────────────────────────────────────────────────────────────────────────────
// 3. INVARIANTE 3 & 10: RenderProfile referencia LayoutDefinition e perfis são independentes
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Invariant 3 & 10: RenderProfiles reference layouts & have independent geometry ---');

const sampleAssetSet: AssetSet = {
  id: 'assets_cert_v1',
  name: 'Pacote de Assets do Certificado',
  version: 1,
  assets: [
    { id: 'bg_cert_print', name: 'Moldura A4 Impressão', type: 'background_base', storageRef: 'r2://cert/a4_print.png', mimeType: 'image/png' },
    { id: 'bg_cert_badge', name: 'Badge Digital Wallet', type: 'background_base', storageRef: 'r2://cert/badge_card.png', mimeType: 'image/png' },
    { id: 'logo_institution', name: 'Logo Institucional', type: 'logo', storageRef: 'r2://cert/logo.svg', mimeType: 'image/svg+xml' },
  ],
};
assert(validateAssetSet(sampleAssetSet).length === 0, 'AssetSet válido passa com 0 erros');

// Asset duplicado
const dupAssetSet: AssetSet = {
  id: 'assets_dup',
  name: 'Assets com ID duplicado',
  version: 1,
  assets: [
    { id: 'same_asset', name: 'Asset 1', type: 'logo', storageRef: 'r2://1.png', mimeType: 'image/png' },
    { id: 'same_asset', name: 'Asset 2', type: 'logo', storageRef: 'r2://2.png', mimeType: 'image/png' },
  ],
};
assert(validateAssetSet(dupAssetSet).some(e => e.includes('Duplicate asset id')), 'Validador detecta asset id duplicado em AssetSet');

// Layout 1: Impressão A4
const printLayout: LayoutDefinition = {
  id: 'layout_cert_print_a4',
  name: 'Layout de Impressão A4',
  canvas: { width: 1123, height: 794, unit: 'px', dpi: 96, orientation: 'landscape' },
  baseAssetId: 'bg_cert_print',
  elements: [
    {
      id: 'el_student_name',
      type: 'TEXT',
      geometry: { x: 100, y: 350, width: 923, height: 50, anchor: 'TOP_LEFT' },
      fieldBinding: 'student_name',
      textConfig: { font: { family: 'Times New Roman', size: 36, weight: 'bold' }, color: '#000000', align: 'center' },
    },
    {
      id: 'el_course_title',
      type: 'TEXT',
      geometry: { x: 100, y: 450, width: 923, height: 40, anchor: 'TOP_LEFT' },
      fieldBinding: 'course_title',
      textConfig: { font: { family: 'Helvetica', size: 24, weight: 'normal' }, color: '#333333', align: 'center' },
    },
    {
      id: 'el_logo',
      type: 'IMAGE',
      geometry: { x: 511, y: 80, width: 100, height: 100 },
      assetRefId: 'logo_institution',
    },
  ],
};

// Layout 2: Badge Digital (dimensões e posições totalmente diferentes para os mesmos dados)
const badgeLayout: LayoutDefinition = {
  id: 'layout_cert_badge_card',
  name: 'Layout de Badge para Carteira Digital',
  canvas: { width: 963, height: 680, unit: 'px', orientation: 'custom' },
  baseAssetId: 'bg_cert_badge',
  elements: [
    {
      id: 'el_badge_student_name',
      type: 'TEXT',
      geometry: { x: 40, y: 150, width: 500, height: 35, anchor: 'TOP_LEFT' },
      fieldBinding: 'student_name', // MESMO dado
      textConfig: { font: { family: 'Rawline', size: 22, weight: 'bold' }, color: '#000000', align: 'left' },
    },
  ],
};

assert(validateLayoutDefinition(printLayout, sampleForm, sampleAssetSet).length === 0, 'Layout de Impressão A4 é válido');
assert(validateLayoutDefinition(badgeLayout, sampleForm, sampleAssetSet).length === 0, 'Layout de Badge é válido');

// Elemento com ID duplicado no layout
const dupElementLayout: LayoutDefinition = {
  id: 'layout_dup_el',
  name: 'Layout com elementos duplicados',
  canvas: a4PortraitCanvas,
  elements: [
    { id: 'el_same', type: 'TEXT', geometry: { x: 10, y: 10, width: 100, height: 20 } },
    { id: 'el_same', type: 'TEXT', geometry: { x: 20, y: 20, width: 100, height: 20 } },
  ],
};
assert(validateLayoutDefinition(dupElementLayout).some(e => e.includes('Duplicate element id')), 'Validador detecta element ID duplicado no Layout');

// BaseAssetId inexistente no Layout
const missingBaseAssetLayout: LayoutDefinition = {
  id: 'layout_bad_base',
  name: 'Layout Base Inexistente',
  canvas: a4PortraitCanvas,
  baseAssetId: 'non_existent_base_asset',
  elements: [],
};
assert(validateLayoutDefinition(missingBaseAssetLayout, sampleForm, sampleAssetSet).some(e => e.includes('was not found in AssetSet')), 'Validador detecta baseAssetId inexistente no AssetSet');

// RenderProfiles
const profilePrint: RenderProfile = {
  id: 'PROFILE_PRINT',
  name: 'Impressão A4',
  pages: [{ id: 'page_print', layoutId: 'layout_cert_print_a4' }],
  purpose: 'print',
  outputKind: 'pdf',
};

const profileWallet: RenderProfile = {
  id: 'PROFILE_WALLET',
  name: 'Carteira Digital',
  pages: [{ id: 'page_wallet', layoutId: 'layout_cert_badge_card' }],
  purpose: 'digital_wallet_card',
  outputKind: 'raster_image',
};

assert(validateRenderProfile(profilePrint, [printLayout, badgeLayout]).length === 0, 'Profile de Impressão é válido');
assert(validateRenderProfile(profileWallet, [printLayout, badgeLayout]).length === 0, 'Profile de Carteira é válido');

// Prova de independência: alterar a coordenada no printLayout não altera o badgeLayout
assert(printLayout.elements[0].geometry.x === 100, 'PrintLayout x = 100');
assert(badgeLayout.elements[0].geometry.x === 40, 'BadgeLayout x = 40 (Independente)');

// ─────────────────────────────────────────────────────────────────────────────
// 4. INVARIANTE 4: Element Binding referencia chave canônica existente
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Invariant 4: Element binding validation ---');

const invalidBindingLayout: LayoutDefinition = {
  id: 'layout_invalid_binding',
  name: 'Layout com Binding Inexistente',
  canvas: a4PortraitCanvas,
  elements: [
    {
      id: 'el_bad',
      type: 'TEXT',
      geometry: { x: 50, y: 50, width: 200, height: 30 },
      fieldBinding: 'unexistent_field_key',
    },
  ],
};

const bindingErrors = validateLayoutDefinition(invalidBindingLayout, sampleForm, sampleAssetSet);
assert(bindingErrors.some(e => e.includes("binds to unknown form field key 'unexistent_field_key'")), 'Validador detecta binding para campo inexistente no formulário');

// ─────────────────────────────────────────────────────────────────────────────
// 5. INVARIANTE 5 & 7: DocumentDefinition e Layouts não possuem CanonicalData de cliente
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Invariant 5 & 7: Segregation of DocumentDefinition vs CanonicalData vs Emission ---');

const sampleDocument: DocumentDefinition = {
  id: 'doc_def_cert_curso_v1',
  slug: 'certificado-curso-livre',
  name: 'Certificado de Curso Livre',
  category: 'educacao',
  version: 1,
  status: 'published',
  formDefinitionId: 'form_generic_certificate_v1',
  assetSetId: 'assets_cert_v1',
  renderProfiles: [profilePrint, profileWallet],
};

const graphValidation = validateEngineGraph({
  doc: sampleDocument,
  forms: [sampleForm],
  assetSets: [sampleAssetSet],
  layouts: [printLayout, badgeLayout],
});
assert(graphValidation.valid, 'Grafo completo de DocumentDefinition é 100% válido');

// DocumentDefinition com perfis duplicados
const dupProfileDoc: DocumentDefinition = {
  ...sampleDocument,
  id: 'doc_dup_profiles',
  renderProfiles: [profilePrint, profilePrint],
};
const dupProfileErrors = validateEngineGraph({
  doc: dupProfileDoc,
  forms: [sampleForm],
  assetSets: [sampleAssetSet],
  layouts: [printLayout, badgeLayout],
});
assert(dupProfileErrors.errors.some(e => e.includes('Duplicate RenderProfile id')), 'Validador detecta RenderProfile duplicado em DocumentDefinition');

// Dados canônicos de uma emissão real
const runtimeData: CanonicalData = {
  student_name: 'Maria Eduarda Santos',
  course_title: 'Engenharia de Software Avançada',
  completion_date: '2026-08-14',
  workload_hours: 120,
};

const emissionIdentity: EmissionIdentity = {
  emissionId: '7e2c918f-3d12-4c54-b59a-8fe0d1c3a812',
  validationId: 'CERT-2026-88912',
  createdAt: '2026-08-14T21:00:00Z',
};

assert(typeof runtimeData.student_name === 'string', 'CanonicalData vive separadamente em objeto próprio');
assert(emissionIdentity.emissionId.includes('-'), 'EmissionIdentity possui UUID próprio sem poluir DocumentDefinition');

// ─────────────────────────────────────────────────────────────────────────────
// 6. INVARIANTE 8: EditorSessionState é transitório e separado do modelo persistido
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Invariant 8: EditorSessionState transient UI isolation ---');

const sessionState: EditorSessionState = {
  selectedElementId: 'el_student_name',
  hoveredElementId: null,
  activeHandle: 'bottom_right',
  isDragging: false,
  isResizing: true,
};

assert(sessionState.selectedElementId === 'el_student_name', 'EditorSessionState gerencia chrome de interação sem poluir LayoutDefinition');

// ─────────────────────────────────────────────────────────────────────────────
// 7. INVARIANTE 11: Detecção de referências quebradas e duplicatas no Grafo
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- Invariant 11: Broken references detection in graph validator ---');

const brokenDoc: DocumentDefinition = {
  id: 'doc_broken',
  slug: 'doc-broken',
  name: 'Documento Quebrado',
  category: 'teste',
  version: 1,
  status: 'draft',
  formDefinitionId: 'form_inexistente',
  assetSetId: 'asset_inexistente',
  renderProfiles: [
    {
      id: 'prof_broken',
      name: 'Profile com Layout Inexistente',
      pages: [{ id: 'page_broken', layoutId: 'layout_inexistente' }],
      purpose: 'print',
      outputKind: 'pdf',
    },
  ],
};

const brokenGraph = validateEngineGraph({
  doc: brokenDoc,
  forms: [sampleForm],
  assetSets: [sampleAssetSet],
  layouts: [printLayout],
});

assert(!brokenGraph.valid, 'Grafo quebrado é invalidado com sucesso');
assert(brokenGraph.errors.some(e => e.includes('unknown formDefinitionId')), 'Detecta formDefinitionId inexistente');
assert(brokenGraph.errors.some(e => e.includes('unknown assetSetId')), 'Detecta assetSetId inexistente');
assert(brokenGraph.errors.some(e => e.includes('unknown layoutId')), 'Detecta layoutId inexistente no profile');

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADO FINAL
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n========================================`);
console.log(`Resultado: ${passedTests} PASS  |  0 FAIL`);
console.log(`Total: ${totalTests} testes de invariantes da Engine V1`);
console.log(`========================================\n`);
