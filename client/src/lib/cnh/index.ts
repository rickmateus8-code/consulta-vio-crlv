/**
 * lib/cnh/index.ts
 *
 * Barrel export do módulo canônico CNH.
 * Importar de "@/lib/cnh" para acesso centralizado.
 */
export type {
  CNHEmissionIdentity,
  CNHCanonicalData,
  CNHRenderInput,
  CNHRenderProfileId,
  CNHRenderProfileMeta,
} from "./renderInput";

export { CNH_RENDER_PROFILES } from "./renderInput";

export {
  normalizeCNHRenderInput,
  cNHDocumentPropsToRenderInput,
  cNH3PartDocumentPropsToRenderInput,
} from "./normalize";

export type { CNHMRZInput } from "./mrz";
export { gerarMRZ } from "./mrz";

export { getCNHValidationUrl, CNH_VALIDATION_DOMAIN } from "./validation";

export type {
  FontWeight,
  TextAlign,
  RendererHint,
  FontSpec,
  ConditionDeclarative,
  TextElement,
  CompositeTextElement,
  ImageElement,
  RectElement,
  ConditionalTextElement,
  WalletElement,
  WalletProfileId,
  CanvasTransform,
  WalletProfileLayout,
} from "./walletGeometry";

export {
  WALLET_FRONT_LAYOUT,
  WALLET_BACK_LAYOUT,
  WALLET_FRONT_ELEMENTS,
  WALLET_BACK_ELEMENTS,
} from "./walletGeometry";
