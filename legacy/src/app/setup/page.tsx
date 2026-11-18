'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

import { Card, Center, Select, Space, Title } from '@mantine/core'

import '@mantine/dropzone/styles.css'

import { useProject } from '@/providers/project'
import type { Source, Column, Row } from '@/providers/project'

const CSVReader = dynamic(() => import('./components/CSVReader'))

export default function Setup() {
	const router = useRouter()
	const [source, setSource] = useState<Source>('csv')

	const initProject = useProject(state => state.initProject)

	const onUpload = (data: {
		columns: Map<string, Column>
		rows: Array<Row>
	}) => {
		initProject(source, data.columns, data.rows)
		router.push('/')
	}

	return (
		<Center pt={80}>
			<Card w={480} p={24} withBorder shadow="md">
				<Title order={2}>Project Setup</Title>
				<Card.Section p={16}>
					<Select
						value={source}
						label="Data Source"
						placeholder="Select a data source"
						data={[{ value: 'csv', label: 'CSV' }]}
						onChange={value => setSource(value as Source)}
					/>
					<Space h={16} />
					{source === 'csv' && <CSVReader onUpload={onUpload} />}
				</Card.Section>
			</Card>
		</Center>
	)
}
