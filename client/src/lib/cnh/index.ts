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
