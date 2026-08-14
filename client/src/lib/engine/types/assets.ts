/**
 * lib/engine/types/assets.ts
 *
 * Catálogo e referências de Assets de Design Time vs Runtime Media.
 */

export type AssetType =
  | 'background_base'
  | 'logo'
  | 'seal'
  | 'watermark'
  | 'font'
  | 'overlay'
  | 'static_image';

/**
 * Asset estático pertencente ao Design/Template do documento.
 */
export interface Asset {
  readonly id: string;
  readonly name: string;
  readonly type: AssetType;
  readonly storageRef: string;
  readonly mimeType: string;
  readonly dimensions?: {
    readonly width: number;
    readonly height: number;
  };
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Coleção versionada de Assets utilizada por um DocumentDefinition.
 */
export interface AssetSet {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly assets: readonly Asset[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Referência de mídia transitória ou de emissão individual (ex: foto ou assinatura de uma pessoa).
 * Separada formalmente dos Assets de Design do Template.
 */
export interface RuntimeMediaRef {
  readonly id: string;
  readonly kind: 'photo' | 'signature' | 'attachment';
  readonly mimeType: string;
  readonly source: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
