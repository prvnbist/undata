import { memo } from 'react'
import { Stack } from '@mantine/core'

import useGlobalStore from '@/store'

import Cell from './Cell'

const Cells = () => {
	const cells = useGlobalStore(state => state.cells)

	if (cells.size === 0) return null

	const list = [...cells.values()]
	return (
		<Stack gap='md'>
			{list.map((cell, index) => (
				<Cell key={cell.id} index={index} cell={cell} />
			))}
		</Stack>
	)
}

export default memo(Cells)
