import { z } from 'zod'
import superjson from 'superjson'
import { initTRPC } from '@trpc/server'

import db from '@/libs/db'

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
            const response = await db.unsafe(input.query)
            return response
         } catch (error) {
            console.log(error)
            return {}
         }
      }),
})

export type AppRouter = typeof appRouter
