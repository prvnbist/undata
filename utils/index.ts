import { createTRPCReact } from '@trpc/react-query'

import { Column, Row } from '@/types'
import type { AppRouter } from '@/app/api/trpc/router'

export const trpc = createTRPCReact<AppRouter>()

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
