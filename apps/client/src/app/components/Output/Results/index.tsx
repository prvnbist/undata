import { useMemo, useState } from 'react'
import { Flex, Pagination, Space, Table, Text } from '@mantine/core'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from '@tanstack/react-table'

import cellRenderer from './cellRenderer'

import { chunkRows } from 'utils'
import { useProject } from 'providers/project'
import type { Row } from 'providers/project'
import { NUMERIC_DATA_TYPES, TIME_DATA_TYPES, DATE_DATA_TYPES } from 'constants/index'

const columnHelper = createColumnHelper<Row>()

const isRightAligned = (type: string) =>
	[...NUMERIC_DATA_TYPES, ...TIME_DATA_TYPES, ...DATE_DATA_TYPES].includes(type)

const Results = () => {
	const [page, setPage] = useState(1)
	const [columns, rows] = useProject(state => [state.columns, state.rows])

	const cachedColumns = useMemo(
		() =>
			[...columns.values()]
				.filter(c => !c.hidden)
				.map(column =>
					columnHelper.accessor(column.key, {
						id: column.key,
						header: () => (
							<Text size="sm" ta={isRightAligned(column.data_type!) ? 'right' : 'left'}>
								{column.title}
							</Text>
						),
						...(column.data_type && {
							cell: props => cellRenderer(props, column.data_type, column.format_type),
						}),
					})
				),
		[columns]
	)

	const table = useReactTable({
		data: rows,
		columns: cachedColumns,
		getCoreRowModel: getCoreRowModel(),
	})

	const chunkedRows = useMemo(() => chunkRows(table.getRowModel().rows, 10), [table.getRowModel])
	const _rows = chunkedRows[page - 1]

	return (
		<>
			<Table striped highlightOnHover withTableBorder withColumnBorders>
				<Table.Thead>
					{table.getHeaderGroups().map(headerGroup => (
						<Table.Tr key={headerGroup.id}>
							{headerGroup.headers.map(header => (
								<Table.Th key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(header.column.columnDef.header, header.getContext())}
								</Table.Th>
							))}
						</Table.Tr>
					))}
				</Table.Thead>
				<Table.Tbody>
					{_rows?.map(row => (
						<Table.Tr key={row.id}>
							{row.getVisibleCells().map(cell => (
								<Table.Td key={cell.id}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</Table.Td>
							))}
						</Table.Tr>
					))}
				</Table.Tbody>
			</Table>
			{rows.length > 10 && (
				<>
					<Space h={16} />
					<Flex justify="center">
						<Pagination
							size="sm"
							withEdges
							radius="md"
							value={page}
							onChange={setPage}
							total={chunkedRows.length}
						/>
					</Flex>
				</>
			)}
		</>
	)
}
export default Results
