import { useEffect, useMemo, useState } from 'react'
import {
	IconArrowsSort,
	IconCheck,
	IconFile,
	IconSortAscending,
	IconSortDescending,
	IconTrash,
} from '@tabler/icons-react'

import { LineChart } from '@mantine/charts'
import {
	ActionIcon,
	Center,
	Flex,
	Group,
	Input,
	MultiSelect,
	Pagination,
	Paper,
	SegmentedControl,
	Select,
	Space,
	Stack,
	Table,
	Text,
} from '@mantine/core'

import { chunk } from '@/utils'
import type { Cell } from '@/store'
import useGlobalStore from '@/store'
import { CHART_HEIGHT } from '@/constants'
import type { View, Column } from '@/types'

const Cell = ({ cell }: { index: number; cell: Cell }) => {
	const updateCell = useGlobalStore(state => state.updateCell)
	const deleteCell = useGlobalStore(state => state.deleteCell)

	const [view, setView] = useState<View>(cell.view ?? 'TABLE')

	const [title, setTitle] = useState(cell.title ?? '')

	useEffect(() => {
		updateCell(cell.id, { view })
	}, [view])

	return (
		<Paper shadow='xs' withBorder p='md' style={{ position: 'relative' }}>
			<Stack style={{ top: 0, right: -36, position: 'absolute' }}>
				<ActionIcon
					variant='subtle'
					color='red.4'
					title='Delete Cell'
					onClick={() => deleteCell(cell.id)}
				>
					<IconTrash size={16} />
				</ActionIcon>
			</Stack>
			<Flex w='100%' justify='space-between'>
				<Group gap={2} flex={1}>
					<Flex w={32} align='center' justify='center'>
						{cell.title !== title ? (
							<ActionIcon
								title='Save Title'
								variant='subtle'
								onClick={() => updateCell(cell.id, { title })}
							>
								<IconCheck size={16} />
							</ActionIcon>
						) : (
							<IconFile size={24} />
						)}
					</Flex>
					<Input
						size='xs'
						flex={1}
						value={title}
						variant='unstyled'
						placeholder='Enter your cell title'
						onChange={e => setTitle(e.target.value)}
						styles={{
							input: {
								fontSize: 'var(--mantine-font-size-lg)',
								fontFamily: "'Unbounded Variable', sans-serif",
							},
						}}
					/>
				</Group>
				<SegmentedControl
					size='xs'
					value={view}
					withItemsBorders={false}
					onChange={value => setView(value as View)}
					data={[
						{ value: 'TABLE', label: 'Table' },
						{ value: 'CHART', label: 'Chart' },
					]}
				/>
			</Flex>
			<Space h={16} />
			{view === 'TABLE' && <TableView cell={cell} />}
			{view === 'CHART' && <ChartView cell={cell} />}
		</Paper>
	)
}

export default Cell

interface IChartView {
	cell: Cell
}

const ChartView = ({ cell }: IChartView) => {
	const [xAxis, setXAxis] = useState<string | null>(cell.chart?.xAxis ?? null)
	const [yAxis, setYAxis] = useState<string[]>(cell.chart?.yAxis ?? [])

	const updateCell = useGlobalStore(state => state.updateCell)

	useEffect(() => {
		updateCell(cell.id, { chart: { ...cell.chart, xAxis, yAxis } })
	}, [xAxis, yAxis])

	return (
		<Flex gap={16}>
			<ChartSettings
				xAxis={xAxis}
				setXAxis={setXAxis}
				yAxis={yAxis}
				setYAxis={setYAxis}
				columns={[...cell.data.columns.values()]}
			/>
			<Paper withBorder p='md' flex={1}>
				<Chart xAxis={xAxis} yAxis={yAxis} data={cell.data.rows} />
			</Paper>
		</Flex>
	)
}

interface IChartSettings {
	xAxis: string | null
	yAxis: string[]
	columns: Column[]
	setXAxis: (value: string) => void
	setYAxis: (value: string[]) => void
}

const ChartSettings = ({ xAxis, setXAxis, yAxis, setYAxis, columns }: IChartSettings) => {
	const options = columns.map(c => ({ value: c.id, label: c.title }))
	return (
		<Paper withBorder w={240} p='xs'>
			<Stack gap={4}>
				<Input.Label>X Axis</Input.Label>
				<Select
					value={xAxis}
					clearable={false}
					allowDeselect={false}
					placeholder='Select a column'
					onChange={value => setXAxis(value as string)}
					data={options.filter(o => !yAxis.includes(o.value))}
				/>
			</Stack>
			<Space h={16} />
			<Stack gap={4}>
				<Input.Label>Y Axis</Input.Label>
				<MultiSelect
					value={yAxis}
					placeholder='Select column/s'
					onChange={value => setYAxis(value)}
					data={options.filter(o => o.value !== xAxis)}
				/>
			</Stack>
		</Paper>
	)
}

interface IChart {
	xAxis: string | null
	yAxis: string[]
	data: Cell['data']['rows']
}

const Chart = ({ xAxis, yAxis, data }: IChart) => {
	if (!xAxis) {
		return (
			<Center h={CHART_HEIGHT}>
				<Text c='red.4'>Please select x axis column</Text>
			</Center>
		)
	}

	if (yAxis.length === 0) {
		return (
			<Center h={CHART_HEIGHT}>
				<Text c='red.4'>Please select y axis column/s</Text>
			</Center>
		)
	}

	const series = yAxis.map((c, index) => ({
		name: c,
		color: `blue.${index + 4}`,
	}))
	return (
		<LineChart
			w='100%'
			h={CHART_HEIGHT}
			data={data}
			dataKey={xAxis}
			series={series}
			curveType='linear'
		/>
	)
}

interface ITableView {
	cell: Cell
}

const TableView = ({ cell }: ITableView) => {
	const [activePage, setPage] = useState(1)

	const updateCell = useGlobalStore(state => state.updateCell)

	const [sort, setSort] = useState<{ column: string; direction: 'ASC' | 'DESC' } | null>(null)

	const handleSort = (key: string) => {
		setSort(current => {
			if (!current || current.column !== key) return { column: key, direction: 'ASC' }

			if (current.direction === 'ASC') return { column: key, direction: 'DESC' }

			return null
		})
	}

	useEffect(() => {
		updateCell(cell.id, { sort })
	}, [sort])

	const chunkedRows = useMemo(() => {
		let _rows = [...cell.data.rows]

		if (sort) {
			const column = cell.data.columns.get(sort.column)!
			_rows = _rows.sort((a, b) => {
				const x = a[sort.column]
				const y = b[sort.column]

				if (column.data_type === 'date') {
					return sort.direction === 'ASC'
						? new Date(x).getTime() - new Date(y).getTime()
						: new Date(y).getTime() - new Date(x).getTime()
				}

				if (['number', 'boolean'].includes(column.data_type)) {
					return sort.direction === 'ASC' ? x - y : y - x
				}

				return sort.direction === 'ASC'
					? String(x).localeCompare(y)
					: String(y).localeCompare(x)
			})
		}

		return chunk(_rows, 10)
	}, [sort, cell.data.rows, cell.data.columns])
	return (
		<>
			<Paper withBorder>
				<Table
					striped
					withColumnBorders
					verticalSpacing={4}
					horizontalSpacing='xs'
					styles={{
						table: {
							borderRadius: '8px',
						},
					}}
				>
					<Table.Thead>
						<Table.Tr>
							{[...cell.data.columns.values()].map(c => {
								const isSortApplied = sort?.column === c.id
								return (
									<Table.Th key={c.id}>
										<Group justify='space-between'>
											<Text size='sm'>{c.title}</Text>
											<ActionIcon
												size='sm'
												onClick={() => handleSort(c.id)}
												opacity={isSortApplied ? 1 : 0.4}
												variant={isSortApplied ? 'light' : 'subtle'}
												color={isSortApplied ? 'yellow.4' : 'gray'}
											>
												{isSortApplied && sort?.direction === 'ASC' && (
													<IconSortAscending size={16} />
												)}
												{isSortApplied && sort?.direction === 'DESC' && (
													<IconSortDescending size={16} />
												)}
												{!isSortApplied && <IconArrowsSort size={16} />}
											</ActionIcon>
										</Group>
									</Table.Th>
								)
							})}
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>
						{chunkedRows[activePage - 1].map((row, i) => (
							<Table.Tr key={i}>
								{[...cell.data.columns.values()].map(c => (
									<Table.Td
										key={c.id}
										ta={['number', 'date'].includes(c.data_type) ? 'right' : 'left'}
									>
										{row[c.id]}
									</Table.Td>
								))}
							</Table.Tr>
						))}
					</Table.Tbody>
				</Table>
			</Paper>
			<Space h={8} />
			<Pagination
				size='sm'
				withEdges
				value={activePage}
				onChange={setPage}
				total={Math.ceil(cell.data.rows.length / 10)}
			/>
		</>
	)
}
