/**
 * lib/engine/types/form.ts
 *
 * Definição canônica de Formulário e Campos de Dados.
 * INVARIANTE: FormDefinition define DADOS e não possui NENHUMA propriedade de geometria (x, y, px).
 */

export type FieldType =
  | 'text'
  | 'cpf'
  | 'cnpj'
  | 'date'
  | 'select'
  | 'number'
  | 'textarea'
  | 'photo'
  | 'signature'
  | 'boolean';

export interface FieldDefinition {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly type: FieldType;
  readonly required: boolean;
  readonly defaultValue?: unknown;
  readonly options?: readonly string[];
  readonly group?: string;
  readonly visibility?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface FormDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly fields: readonly FieldDefinition[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}
