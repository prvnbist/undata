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

export const DATATIME_DATA_TYPES = ['date', 'time', 'timetz', 'timestamp', 'timestamptz']

export const DATA_TYPES = [
   'bool',
   '_bool',
   ...TEXT_DATA_TYPES,
   ...NUMERIC_DATA_TYPES,
   'json',
   'jsonb',
   'uuid',
   ...DATATIME_DATA_TYPES,
]

export const DATE_TIME_TYPES_FORMAT: Record<string, string> = {
   date: 'yyyy-MM-dd',
   time: 'hh:mm:ss',
   timetz: 'hh:mm:ssXXX',
   timestamp: 'yyyy-MM-dd hh:mm:ss',
   timestamptz: 'yyyy-MM-dd hh:mm:ssXXX',
}
