import { useMemo, useState } from 'react'
import { IconAdjustmentsFilled, IconEye, IconEyeOff } from '@tabler/icons-react'
import {
	DndContext,
	MouseSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { ColumnSettingDialog } from './ColumnSettingDialog'
import { SortableItem } from './SortableItem'
import { Button } from '@/components/ui/button'
import { useProject } from '@/store/project'
import type { Column } from '@/store/project'

const toMap = (columns: Column[]) => new Map(columns.map(column => [column.key, column]))

function ColumnsSettings() {
	// Select the stored references only; the array is derived below.
	const columnMap = useProject(state => state.columns)
	const setColumns = useProject(state => state.setColumns)

	// Only the key is stored, so the dialog always reads the latest column from the store.
	const [editingKey, setEditingKey] = useState<string | null>(null)

	const columns = useMemo(() => [...columnMap.values()], [columnMap])
	const keys = useMemo(() => columns.map(column => column.key), [columns])

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
	)

	const handleDragEnd = ({ active, over }: DragEndEvent) => {
		if (active.id === over?.id) return

		const oldIndex = keys.indexOf(String(active.id))
		const newIndex = keys.indexOf(String(over?.id))
		setColumns(toMap(arrayMove(columns, oldIndex, newIndex)))
	}

	const save = (column: Column) => {
		setColumns(toMap(columns.map(item => (item.key === column.key ? column : item))))
	}

	const editing = editingKey ? (columnMap.get(editingKey) ?? null) : null

	return (
		<>
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext strategy={verticalListSortingStrategy} items={keys}>
					<div className="flex flex-col gap-2">
						{columns.map(column => (
							<SortableItem
								key={column.key}
								column={column}
								actions={
									<>
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={`${column.hidden ? 'Show' : 'Hide'} ${column.key}`}
											onClick={event => {
												event.stopPropagation()
												save({ ...column, hidden: !column.hidden })
											}}
										>
											{column.hidden ? <IconEyeOff size={16} /> : <IconEye size={16} />}
										</Button>
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={`Settings for ${column.key}`}
											onClick={event => {
												event.stopPropagation()
												setEditingKey(column.key)
											}}
										>
											<IconAdjustmentsFilled size={16} />
										</Button>
									</>
								}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
			<ColumnSettingDialog column={editing} onSave={save} onClose={() => setEditingKey(null)} />
		</>
	)
}

export default ColumnsSettings
