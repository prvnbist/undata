import { editor } from 'monaco-editor'
import { FormatOptionsWithLanguage } from 'sql-formatter'

const TEXT_DATA_TYPES = ['text', '_text', 'char', '_char', 'varchar']

export const NUMERIC_DATA_TYPES = [
   'int2',
   '_int2',
   'int4',
   'int8',
   'float4',
   '_float4',
   'float8',
   '_float8',
   'numeric',
]

export const TIME_DATA_TYPES = ['time', 'timetz']

export const DATE_DATA_TYPES = ['date', 'timestamp', 'timestamptz']

export const JSON_DATA_TYPES = ['json', 'jsonb']

export const DATA_TYPES = [
   'uuid',
   'bool',
   '_bool',
   ...TEXT_DATA_TYPES,
   ...NUMERIC_DATA_TYPES,
   ...JSON_DATA_TYPES,
   ...TIME_DATA_TYPES,
   ...DATE_DATA_TYPES,
]

export const TIME_TYPES_FORMAT: Record<string, string> = {
   time: 'hh:mm:ss',
   timetz: 'hh:mm:ssXXX',
}

export const DATE_TYPES_FORMAT: Record<string, string> = {
   date: 'yyyy-MM-dd',
   timestamp: 'yyyy-MM-dd hh:mm:ss',
   timestamptz: 'yyyy-MM-dd hh:mm:ssXXX',
}

export const JSON_TEXT_EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
   fontSize: 12,
   readOnly: true,
   lineNumbers: 'off',
   fontLigatures: true,
   fontFamily: 'Fira Code',
   minimap: { enabled: false },
   padding: { top: 16, bottom: 16 },
}

export const QUERY_FORMAT_OPTIONS = {
   tabWidth: 2,
   keywordCase: 'upper',
   language: 'postgresql',
   linesBetweenQueries: 2,
} as FormatOptionsWithLanguage

export const LIST_TABLES_QUERY = "select * from pg_catalog.pg_tables where schemaname='public'"
export const LIST_VIEWS_QUERY = "select * from pg_catalog.pg_views where schemaname='public'"

export const DATA_FORMAT_TYPES = [
   { value: 'image', label: 'Image' },
   { value: 'single_select', label: 'Single Select' },
   { value: 'multi_select', label: 'Multi Select' },
   { value: 'url', label: 'URL' },
]
