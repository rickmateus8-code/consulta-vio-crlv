/**
 * lib/engine/types/renderProfile.ts
 *
 * Definição de Render Profile e Paginação.
 * Define a semântica de saída/consumer (impressão, carteira digital, mrz strip) e
 * referencia as páginas ordenadas do documento com suas transformações globais de apresentação.
 *
 * INVARIANTE: PageDefinition referencia layoutId; NÃO duplica canvas source, baseAsset nem elements.
 * LayoutDefinition continua sendo a única SSOT de composição visual no Source Space.
 */

import type { CanvasDefinition } from './primitives';
import type { CanvasTransform } from './geometry';

export type ProfilePurpose =
  | 'print'
  | 'digital_wallet_card'
  | 'mrz_strip'
  | 'qr_auth'
  | 'public_preview'
  | 'custom';

export type ProfileOutputKind =
  | 'pdf'
  | 'raster_image'
  | 'vector_svg'
  | 'json_dto';

/**
 * Definição de página em um RenderProfile.
 * Possui identidade estável (id), aponta para uma LayoutDefinition em Source Space
 * e declara opcionalmente a transformação e dimensões do Output Space.
 */
export interface PageDefinition {
  /** Identificador estável da página (ex: 'page_capa', 'page_folha_1', 'page_wallet_front'). */
  readonly id: string;
  /** Referência obrigatória à LayoutDefinition dona da composição desta página em Source Space. */
  readonly layoutId: string;
  /** Transformação global opcional aplicada ao layout para apresentação desta página (T x R x S). */
  readonly transform?: CanvasTransform;
  /** Dimensões finais opcionais do Output Space. Se omitido, assume o CanvasDefinition do layout. */
  readonly outputCanvas?: CanvasDefinition;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface RenderProfile {
  readonly id: string;
  readonly name: string;
  /** Sequência ordenada de páginas do perfil. Documentos single-page contêm exatamente 1 página. */
  readonly pages: readonly PageDefinition[];
  readonly purpose: ProfilePurpose;
  readonly outputKind: ProfileOutputKind;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
