'use client'

import { create } from 'zustand'
import { createContext, useRef } from 'react'
import type { PropsWithChildren } from 'react'
import { redirect, usePathname } from 'next/navigation'

export type Source = 'csv' | null

export type Column = {
	key: string
	title: string
	data_type: string | null
	hidden: boolean
	format_type: 'single_select' | 'multi_select' | 'url' | 'image' | null
}

export type Row = Record<Column['key'], string | boolean | number | null>

export type Tab = 'results' | 'errors' | 'visualizations'

interface ProjectState {
	metadata: {
		source: Source
	}
	initProject: (source: Source, columns: Map<string, Column>, rows: Array<Row>) => void

	columns: Map<string, Column>
	setColumns: (columns: Map<string, Column>) => void

	rows: Array<Row>

	error: string | null
	setError: (error: string | null) => void
}

export const useProject = create<ProjectState>(set => ({
	metadata: {
		source: null,
	},

	rows: [],

	columns: new Map(),
	setColumns: (columns: Map<string, Column>) => set(() => ({ columns })),

	initProject: (source: Source, columns: Map<string, Column>, rows: Array<Row>) => {
		return set(() => ({ metadata: { source }, columns, rows }))
	},

	error: null,
	setError: (error: string | null) => set(() => ({ error })),
}))

const Context = createContext<typeof useProject | null>(null)

const ProjectProvider = ({ children }: PropsWithChildren) => {
	const pathname = usePathname()

	const projectRef = useRef<typeof useProject | null>()

	if (!projectRef.current) {
		projectRef.current = useProject
	}

	const source = useProject(state => state.metadata.source)

	if (!source && pathname !== '/setup') return redirect('/setup')

	return <Context.Provider value={projectRef.current}>{children}</Context.Provider>
}

export default ProjectProvider
