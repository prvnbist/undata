'use client'

import dynamic from 'next/dynamic'

import { Box } from '@mantine/core'

import { useProject } from 'providers/project'

const Results = dynamic(() => import('./Results'))

const Output = () => {
	const rows = useProject(state => state.rows)

	return <Box p={16}>{rows.length > 0 && <Results />}</Box>
}

export default Output
