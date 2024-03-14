import { useMemo, useState } from 'react'
import { IconTrash } from '@tabler/icons-react'
import { ActionIcon, Input, Pagination, Paper, Space, Stack, Table, Title } from '@mantine/core'

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

const Cell = ({ cell, index }: { index: number; cell: Cell }) => {
	const [activePage, setPage] = useState(1)
	const updateCell = useGlobalStore(state => state.updateCell)
	const deleteCell = useGlobalStore(state => state.deleteCell)

	const rows = [...cell.data.rows.values()]

	const chunkedRows = useMemo(() => chunk(rows, 10), [rows])

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
				onChange={e => updateCell(index, { title: e.target.value })}
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
							{[...cell.data.columns.values()].map(c => (
								<Table.Td
									key={c.id}
									ta={['number', 'date'].includes(c.data_type) ? 'right' : 'left'}
								>
									{c.title}
								</Table.Td>
							))}
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
				total={Math.ceil(rows.length / 10)}
			/>
		</Paper>
	)
}

export default Cell
