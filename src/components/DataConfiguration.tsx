import { useEffect, useState } from 'react'

import { FileWithPath } from '@mantine/dropzone'
import { Center, Input, Select, Table, Text } from '@mantine/core'

import type { Column, DataType, Source } from '@/store'

interface DataConfigurationProps {
	file: FileWithPath
	source: Source
	columns: Map<string, Column>
	setData: (data: { [key in string]: any }[]) => void
	setColumns: (columns: Map<string, Column>) => void
}

const DATA_TYPES = [
	{ value: 'boolean', label: 'Boolean' },
	{ value: 'date', label: 'Date' },
	{ value: 'number', label: 'Number' },
	{ value: 'text', label: 'Text' },
]

const DataConfiguration = ({
	file,
	source,
	setData,
	columns,
	setColumns,
}: DataConfigurationProps) => {
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		setError(null)
		setData([])

		if (source === 'JSON') {
			const reader = new FileReader()

			reader.onloadend = evt => {
				try {
					const content = JSON.parse((evt.target?.result as string) ?? '')

					if (!Array.isArray(content) || content.length === 0) return

					setData(content)

					const _columns: Map<string, Column> = new Map([])
					const keys = Object.keys(content[0])

					keys.forEach(key => {
						if (!_columns.has(key)) {
							_columns.set(key, { id: key, title: key, data_type: 'text' })
						}
					})

					setColumns(_columns)
				} catch (err) {
					setError('Unable to parse JSON file, please make sure the file has valid JSON data')
				}
			}

			reader.readAsText(file)
		}
	}, [source, file])

	const onChange = (id: string, payload: Partial<Column>) => {
		const _columns = new Map(columns)
		// @ts-ignore
		_columns.set(id, { id, ..._columns.get(id), ...payload })
		setColumns(_columns)
	}

	if (error) {
		return (
			<Center p='xl' w='70%' mx='auto'>
				<Text c='red.4' ta='center'>
					Unable to parse JSON file, please make sure the file has valid JSON data.{error}
				</Text>
			</Center>
		)
	}
	return (
		<Table>
			<Table.Thead>
				<Table.Tr>
					<Table.Th>Key</Table.Th>
					<Table.Th>Title</Table.Th>
				</Table.Tr>
			</Table.Thead>
			<Table.Tbody>
				{[...columns.values()].map(column => (
					<Table.Tr key={column.id}>
						<Table.Td>{column.id}</Table.Td>
						<Table.Td>
							<Input
								value={column.title}
								onChange={e => onChange(column.id, { title: e.target.value })}
							/>
						</Table.Td>
						<Table.Td>
							<Select
								data={DATA_TYPES}
								placeholder='Select data type'
								value={column.data_type}
								onChange={value => onChange(column.id, { data_type: value as DataType })}
							/>
						</Table.Td>
					</Table.Tr>
				))}
			</Table.Tbody>
		</Table>
	)
}

export default DataConfiguration
