import type { ReactNode } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'

import { Flex, Text } from '@mantine/core'
import { IconGripVertical } from '@tabler/icons-react'

import type { Column } from 'providers/project'

const SortableItem = (props: { id: string; column: Column; actions: ReactNode }) => {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
		id: props.id,
	})

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	}

	return (
		<Flex
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			{...{ gap: 1, h: '40px', align: 'center' }}
			styles={{
				root: {
					cursor: 'grab',
					borderRadius: '4px',
					border: '1px solid var(--mantine-color-dark-4)',
				},
			}}
		>
			<Flex w="32px" align="center" justify="center">
				<IconGripVertical size={16} stroke={2} />
			</Flex>
			<Flex align="center" justify="space-between" w="100%" pr={16}>
				<Text size="sm">
					{props.column.title ?? props.column.key}
					{props.column.title !== props.column.key && ` (${props.column.key})`}
				</Text>
				<Flex align="center" gap={8}>
					{props.actions}
				</Flex>
			</Flex>
		</Flex>
	)
}

export default SortableItem
