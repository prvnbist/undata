import { useMemo, useState } from 'react'
import { Group, InputLabel, NumberInput, Pagination, Space, Table, Text } from '@mantine/core'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	useReactTable,
} from '@tanstack/react-table'

import cellRenderer from './cellRenderer'

import { useProject } from '@/providers/project'
import type { Row } from '@/providers/project'
import { NUMERIC_DATA_TYPES, TIME_DATA_TYPES, DATE_DATA_TYPES } from '@/constants/index'

const columnHelper = createColumnHelper<Row>()

const isRightAligned = (type: string) =>
	type in NUMERIC_DATA_TYPES || type in TIME_DATA_TYPES || type in DATE_DATA_TYPES

const Results = () => {
	const [columns, rows] = useProject(state => [state.columns, state.rows])

	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	})

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
							cell: props => cellRenderer(props, column.data_type),
						}),
					})
				),
		[columns]
	)

	const table = useReactTable({
		data: rows,
		columns: cachedColumns,
		rowCount: rows.length,
		state: {
			pagination,
		},
		getCoreRowModel: getCoreRowModel(),
		onPaginationChange: setPagination,
		getPaginationRowModel: getPaginationRowModel(),
	})

	return (
		<>
			<Table.ScrollContainer minWidth={540}>
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
						{table.getRowModel().rows?.map(row => (
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
			</Table.ScrollContainer>
			<Space h="sm" />
			<Group justify="space-between">
				<Pagination.Root total={table.getPageCount()}>
					<Group gap={5} justify="center">
						<Pagination.First
							onClick={() => table.firstPage()}
							disabled={!table.getCanPreviousPage()}
						/>
						<Pagination.Previous
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						/>
						<Space w="sm" />
						<Text size="sm">
							Page {table.getState().pagination.pageIndex + 1} of{' '}
							{table.getPageCount().toLocaleString()}
						</Text>
						<Space w="sm" />
						<Pagination.Next
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						/>
						<Pagination.Last
							onClick={() => table.lastPage()}
							disabled={!table.getCanNextPage()}
						/>
					</Group>
				</Pagination.Root>
				<Group>
					<InputLabel>Go to page</InputLabel>
					<NumberInput
						min={1}
						w={80}
						allowNegative={false}
						max={table.getPageCount()}
						value={table.getState().pagination.pageIndex + 1}
						onChange={value => {
							const page = value ? Number(value) - 1 : 0
							table.setPageIndex(page)
						}}
					/>
				</Group>
			</Group>
		</>
	)
}
export default Results
