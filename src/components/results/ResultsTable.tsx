import { useMemo, useState } from 'react'
import {
	createColumnHelper,
	createPaginatedRowModel,
	rowPaginationFeature,
	tableFeatures,
	useTable,
} from '@tanstack/react-table'
import type { PaginationState } from '@tanstack/react-table'

import { renderCell } from './cell-renderers'
import { TablePagination } from './TablePagination'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'
import { DATE_DATA_TYPES, NUMERIC_DATA_TYPES, TIME_DATA_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useProject } from '@/store/project'
import type { Row } from '@/store/project'

const features = tableFeatures({
	rowPaginationFeature,
	paginatedRowModel: createPaginatedRowModel(),
})

const columnHelper = createColumnHelper<typeof features, Row>()

const isRightAligned = (type: string | null) =>
	type !== null &&
	(type in NUMERIC_DATA_TYPES || type in TIME_DATA_TYPES || type in DATE_DATA_TYPES)

export function ResultsTable() {
	// Select the stored references and derive the list, so the selectors never build a new array.
	const columns = useProject(state => state.columns)
	const rows = useProject(state => state.rows)

	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

	const columnDefs = useMemo(
		() =>
			columnHelper.columns(
				[...columns.values()]
					.filter(column => !column.hidden)
					.map(column =>
						columnHelper.accessor(row => row[column.key], {
							id: column.key,
							header: () => (
								<span
									className={cn(
										'block text-sm',
										isRightAligned(column.data_type) && 'text-right'
									)}
								>
									{column.title}
								</span>
							),
							cell: props => renderCell(props.getValue(), column.data_type),
						})
					)
			),
		[columns]
	)

	const table = useTable({
		features,
		columns: columnDefs,
		data: rows,
		state: { pagination },
		onPaginationChange: setPagination,
	})

	const pageCount = table.getPageCount()

	return (
		<div className="space-y-3">
			<Table className="border-collapse border [&_td]:border [&_th]:border [&_tbody_tr:nth-child(even)]:bg-muted/40">
				<TableHeader>
					{table.getHeaderGroups().map(headerGroup => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map(header => (
								<TableHead key={header.id}>
									{header.isPlaceholder ? null : <table.FlexRender header={header} />}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.map(row => (
						<TableRow key={row.id}>
							{row.getAllCells().map(cell => (
								<TableCell key={cell.id}>
									<table.FlexRender cell={cell} />
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
			<TablePagination
				pageIndex={pagination.pageIndex}
				pageCount={pageCount}
				onPageChange={pageIndex => table.setPageIndex(pageIndex)}
			/>
		</div>
	)
}
