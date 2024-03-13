import { Stack } from '@mantine/core'

import useGlobalStore from '@/store'

import Cell from './Cell'

const Cells = () => {
	const cells = useGlobalStore(state => state.cells)

	if (cells.length === 0) return null
	return (
		<Stack gap='md'>
			{cells.map(cell => (
				<Cell key={cell.id} cell={cell} />
			))}
		</Stack>
	)
}

export default Cells
