import type { ReactNode } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { IconGripVertical } from '@tabler/icons-react'

import type { Column } from '@/store/project'

export function SortableItem({ column, actions }: { column: Column; actions: ReactNode }) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
		id: column.key,
	})

	return (
		<div
			ref={setNodeRef}
			// Dynamic values from dnd-kit, so they cannot be utilities.
			style={{ transform: CSS.Transform.toString(transform), transition }}
			{...attributes}
			{...listeners}
			className="flex h-10 cursor-grab items-center rounded-md border bg-background"
		>
			<div className="flex w-8 items-center justify-center">
				<IconGripVertical size={16} stroke={2} />
			</div>
			<div className="flex w-full items-center justify-between pr-4">
				<span className="text-sm">
					{column.title}
					{column.title !== column.key && ` (${column.key})`}
				</span>
				<div className="flex items-center gap-2">{actions}</div>
			</div>
		</div>
	)
}
