import { create } from 'zustand'

import { Column, Row } from '@/types'

interface GlobalState {
   query: string
   rows: Row[]
   columns: Column[]
   setRows: (rows: Row[]) => void
   setQuery: (query: string) => void
   setColumns: (columns: Column[]) => void
}

const useGlobalStore = create<GlobalState>(set => ({
   query: 'select * from public.transactions order by date desc limit 10;',
   rows: [],
   columns: [],
   setQuery: (query: string) => set(() => ({ query })),
   setRows: (rows: Row[]) => set(() => ({ rows })),
   setColumns: (columns: Column[]) => set(() => ({ columns })),
}))

export default useGlobalStore
