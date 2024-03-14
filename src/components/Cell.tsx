import { useEffect, useMemo, useState } from 'react'
import {
	IconArrowsSort,
	IconSortAscending,
	IconSortDescending,
	IconTrash,
} from '@tabler/icons-react'
import {
	ActionIcon,
	Group,
	Input,
	Pagination,
	Paper,
	Space,
	Stack,
	Table,
	Text,
} from '@mantine/core'

import type { Cell } from '@/store'
import useGlobalStore from '@/store'

function chunk<T>(array: T[], size: number): T[][] {
	if (!array.length) {
		return []
	}
	const head = array.slice(0, size)
	const tail = array.slice(size)
	return [head, ...chunk(tail, size)]
}

const Cell = ({ cell }: { index: number; cell: Cell }) => {
	const [activePage, setPage] = useState(1)
	const updateCell = useGlobalStore(state => state.updateCell)
	const deleteCell = useGlobalStore(state => state.deleteCell)

	const [sort, setSort] = useState<{ column: string; direction: 'ASC' | 'DESC' } | null>(null)

	useEffect(() => {
		updateCell(cell.id, { sort })
	}, [sort])

	const chunkedRows = useMemo(() => {
		let rows = [...cell.data.rows]

		if (sort) {
			const column = cell.data.columns.get(sort.column)!
			rows = rows.sort((a, b) => {
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

		return chunk(rows, 10)
	}, [sort, cell.data])

	const handleSort = (key: string) => {
		setSort(current => {
			if (!current || current.column !== key) return { column: key, direction: 'ASC' }

			if (current.direction === 'ASC') return { column: key, direction: 'DESC' }

			return null
		})
	}

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
			<Input
				size='xs'
				variant='unstyled'
				value={cell.title}
				placeholder='Enter your cell title'
				onChange={e => updateCell(cell.id, { title: e.target.value })}
				styles={{
					input: {
						fontSize: 'var(--mantine-font-size-lg)',
						fontFamily: "'Unbounded Variable', sans-serif",
					},
				}}
			/>
			<Space h={16} />
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
												{isSortApplied && sort.direction === 'ASC' && (
													<IconSortAscending size={16} />
												)}
												{isSortApplied && sort.direction === 'DESC' && (
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
		</Paper>
	)
}

export default Cell
