import { Paper } from '@mantine/core'

import type { Cell } from '@/store'

const Cell = ({ cell }: { cell: Cell }) => (
	<Paper shadow='xs' withBorder>
		{cell.source}
	</Paper>
)

export default Cell
