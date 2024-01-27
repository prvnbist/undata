import { Column, Row } from '@/types'

export const prepareTableData = <T extends Row>(
   schema: Array<{ name: string; type: string }>,
   data: T[],
   setRows: (value: T[]) => void,
   setColumns: (value: Column[]) => void
) => {
   if (Array.isArray(data)) {
      if (data.length === 0) {
         {
            setRows([])
            setColumns([])
            return
         }
      }

      setRows(data)

      const firstRow = data[0]
      const columns = Object.keys(firstRow).map(key => ({
         id: key,
         hidden: false,
         title: key,
         type: schema.find(s => s.name === key)?.type,
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
