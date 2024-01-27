import { create } from 'zustand'

import { Column, Row } from '@/types'

interface GlobalState {
   query: string
   rows: Row[]
   metadata: {
      tables: Array<{ name: string }>
      views: Array<{ name: string }>
   }
   columns: Column[]
   setRows: (rows: Row[]) => void
   setQuery: (query: string) => void
   setColumns: (columns: Column[]) => void
   setMetadata: (input: any) => void
}

const useGlobalStore = create<GlobalState>(set => ({
   query: 'select * from public.transactions order by date desc limit 10;',
   rows: [],
   columns: [],
   metadata: { tables: [], views: [] },
   setQuery: (query: string) => set(() => ({ query })),
   setRows: (rows: Row[]) => set(() => ({ rows })),
   setColumns: (columns: Column[]) => set(() => ({ columns })),
   setMetadata: metadata => set(() => ({ metadata })),
}))

export default useGlobalStore
