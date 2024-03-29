import { Column, Row } from '@/types'

const INITIAL_COLUMN_STATE = {
   formatType: null,
}

export const prepareTableData = <T extends Row>(
   schema: Array<{ name: string; type: string }>,
   data: T[],
   setRows: (value: T[]) => void,
   setColumns: (value: Column[]) => void
) => {
   if (Array.isArray(data)) {
      if (data.length === 0) {
         setRows([])
         setColumns([])
         return
      }

      setRows(data)

      const firstRow = data[0]
      const columns = Object.keys(firstRow).map(key => ({
         ...INITIAL_COLUMN_STATE,
         id: key,
         hidden: false,
         title: key,
         type: schema.find(s => s.name === key)?.type ?? null,
      }))
      setColumns(columns)
   }
}

export const buildTableColumnsListQuery = (table: string) =>
   `SELECT * FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${table}' order by ordinal_position;`

export const extractTableNames = (query: string) => {
   const pattern = /\b(?:FROM|JOIN)\s+(?:\w+\.)?(\w+)\b/gi
   const matches = [...query.matchAll(pattern)]
   const tableNames = matches.map(match => match[1])
   return tableNames
}

const forbiddenKeywords =
   /\b(ALTER|CREATE|DROP|INSERT|UPDATE|DELETE|GRANT|REVOKE|ANALYZE|VACUUM)\b/i

export const containsForbiddenKeywords = (input: string) => forbiddenKeywords.test(input)

export function chunkRows<T>(array: T[], size: number): T[][] {
   if (!array.length) {
      return []
   }
   const head = array.slice(0, size)
   const tail = array.slice(size)
   return [head, ...chunkRows(tail, size)]
}

const URL_REGEX = /^(?:(https?:\/\/)?(?:www\.)?)?([\w-]+(\.[\w-]+)+\/?)([^\s]*)$/

export const isURL = (input: string) => URL_REGEX.test(input)

export const extractURLName = (input: string) => {
   const match = input.match(/\/([^/]+)$/)
   return match ? match[1] : null
}
