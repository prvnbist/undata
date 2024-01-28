import { z } from 'zod'
import superjson from 'superjson'
import { initTRPC } from '@trpc/server'
import { PostgresError } from 'postgres'

import db from '@/libs/db'
import { LIST_TABLES_QUERY, LIST_VIEWS_QUERY } from '@/constants'
import { buildTableColumnsListQuery, containsForbiddenKeywords, extractTableNames } from '@/utils'

const t = initTRPC.create({
   transformer: superjson,
})

export const appRouter = t.router({
   query: t.procedure
      .input(
         z.object({
            query: z.string(),
         })
      )
      .mutation(async ({ input }) => {
         try {
            if (containsForbiddenKeywords(input.query)) {
               return { status: 'ERROR', message: 'Query contains forbidden keywords.' }
            }

            const results = await db.unsafe(input.query)

            const tables = extractTableNames(input.query)
            let tableColumns: Array<{ name: string; type: string }> = []

            if (tables.length > 0) {
               const response = await db.unsafe(buildTableColumnsListQuery(tables[0]))
               if (response.length > 0 && results.length > 0) {
                  const [row] = results

                  // @ts-ignore
                  tableColumns = response.reduce((acc, curr) => {
                     if (curr.column_name in row) {
                        acc.push({
                           name: curr.column_name,
                           type: curr.udt_name,
                        })
                     }

                     return acc
                  }, [])
               }
            }

            return { status: 'SUCCESS', data: { results, columns: tableColumns } }
         } catch (error) {
            const { name, message } = error as PostgresError
            return {
               status: 'ERROR',
               message:
                  name === 'PostgresError' ? message : 'Unable to run the query please try again.',
            }
         }
      }),
   metadata: t.procedure.query(async () => {
      try {
         const tables = await db.unsafe(LIST_TABLES_QUERY)
         const views = await db.unsafe(LIST_VIEWS_QUERY)
         return {
            tables: tables
               .map(node => ({ name: node.tablename }))
               .sort((a, b) => a.name.localeCompare(b.name)),
            views: views
               .map(node => ({ name: node.viewname }))
               .sort((a, b) => a.name.localeCompare(b.name)),
         }
      } catch (error) {
         console.log(error)
         return { tables: [], views: [] }
      }
   }),
   getTableColumns: t.procedure
      .input(
         z.object({
            table: z.string(),
         })
      )
      .query(async ({ input }) => {
         try {
            const query = buildTableColumnsListQuery(input.table)
            const columns = await db.unsafe(query)
            return columns.map(column => ({ name: column.column_name, type: column.udt_name }))
         } catch (error) {
            console.log(error)
            return []
         }
      }),
})

export type AppRouter = typeof appRouter
