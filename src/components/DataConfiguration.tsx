import { useEffect, useState } from 'react'
import { csv2json } from 'json-2-csv'

import { FileWithPath } from '@mantine/dropzone'
import { Center, Input, Select, Table, Text } from '@mantine/core'

import { DATA_TYPES } from '@/constants'
import { prepareColumns } from '@/utils'
import type { Column, DataType, Source } from '@/types'

interface DataConfigurationProps {
	file: FileWithPath
	source: Source
	columns: Map<string, Column>
	setData: (data: { [key in string]: any }[]) => void
	setColumns: (columns: Map<string, Column>) => void
}

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

		if (['JSON', 'CSV'].includes(source)) {
			const reader = new FileReader()

			reader.onloadend = evt => {
				const content = (evt.target?.result as string) ?? ''
				if (source === 'JSON') {
					try {
						const parsed = JSON.parse(content)

						if (!Array.isArray(parsed) || parsed.length === 0) return

						setData(parsed)

						const _columns = prepareColumns(parsed)
						setColumns(_columns)
					} catch (err) {
						setError(
							'Unable to parse JSON file, please make sure the file has valid JSON data'
						)
					}
				} else if (source === 'CSV') {
					try {
						const parsed = csv2json(content)

						if (!Array.isArray(parsed) || parsed.length === 0) return

						setData(parsed)

						const _columns = prepareColumns(parsed)
						setColumns(_columns)
					} catch (err) {
						setError('Unable to parse CSV file, please make sure the file has valid CSV data')
					}
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
					{error}
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
