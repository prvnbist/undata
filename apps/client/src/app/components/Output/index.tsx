'use client'

import dynamic from 'next/dynamic'

import { useProject } from 'providers/project'

const Results = dynamic(() => import('./Results'))

const Output = () => {
	const rows = useProject(state => state.rows)

	if (rows.length === 0) return null
	return <Results />
}

export default Output
