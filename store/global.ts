import { create } from 'zustand'

import { Column, Row } from '@/types'

export interface GlobalState {
   columns: Column[]
   error: string
   metadata: {
      tables: Array<{ name: string }>
      views: Array<{ name: string }>
   }
   query: string
   rows: Row[]
   tab: 'results' | 'errors' | 'visualizations'
   setColumns: (columns: Column[]) => void
   setError: (error: string) => void
   setMetadata: (input: any) => void
   setQuery: (query: string) => void
   setRows: (rows: Row[]) => void
   setTab: (tab: GlobalState['tab']) => void
}

const useGlobalStore = create<GlobalState>(set => ({
   columns: [],
   error: '',
   metadata: { tables: [], views: [] },
   query: 'select * from test;',
   rows: [],
   tab: 'results',
   setColumns: (columns: Column[]) => set(() => ({ columns })),
   setError: (error: string) => set(() => ({ error })),
   setMetadata: metadata => set(() => ({ metadata })),
   setQuery: (query: string) => set(() => ({ query })),
   setRows: (rows: Row[]) => set(() => ({ rows })),
   setTab: (tab: GlobalState['tab']) => set(() => ({ tab })),
}))

export default useGlobalStore
