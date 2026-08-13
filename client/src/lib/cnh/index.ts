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
} from "./normalize";

export type { CNHMRZInput } from "./mrz";
export { gerarMRZ } from "./mrz";

export { getCNHValidationUrl, CNH_VALIDATION_DOMAIN } from "./validation";
