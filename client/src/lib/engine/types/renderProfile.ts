/**
 * lib/engine/types/renderProfile.ts
 *
 * Definição de Render Profile.
 * Define a semântica de saída/consumer (impressão, carteira digital, mrz strip) e
 * aponta para uma LayoutDefinition que possui a geometria real.
 * INVARIANTE: RenderProfile NÃO duplica geometry nem elements.
 */

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

export interface RenderProfile {
  readonly id: string;
  readonly name: string;
  readonly layoutId: string;
  readonly purpose: ProfilePurpose;
  readonly outputKind: ProfileOutputKind;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
