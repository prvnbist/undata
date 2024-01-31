'use client'

import { useState } from 'react'
import superjson from 'superjson'
import { httpBatchLink, getFetch, loggerLink } from '@trpc/client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { trpc } from '.'

function getBaseUrl() {
   if (typeof window !== 'undefined') return ''
   if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
   return 'http://localhost:3000'
}

export const TrpcProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [queryClient] = useState(
      () =>
         new QueryClient({
            defaultOptions: { queries: { staleTime: 5000 } },
         })
   )

   const [trpcClient] = useState(() =>
      trpc.createClient({
         links: [
            loggerLink({
               enabled: () => false,
            }),
            httpBatchLink({
               url: `${getBaseUrl()}/api/trpc`,
               fetch: async (input, init?) => {
                  const fetch = getFetch()
                  return fetch(input, {
                     ...init,
                     credentials: 'include',
                  })
               },
            }),
         ],
         transformer: superjson,
      })
   )
   return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
         <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools />
         </QueryClientProvider>
      </trpc.Provider>
   )
}
