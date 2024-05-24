import { useCallback, useMemo } from 'react'
import { IconAdjustmentsFilled, IconEye, IconEyeOff } from '@tabler/icons-react'

import {
	DndContext,
	type DragEndEvent,
	MouseSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { modals } from '@mantine/modals'
import { ActionIcon, Stack } from '@mantine/core'

import type { Column } from 'providers/project'
import { useProject } from 'providers/project'

import SortableItem from './SortableItem'
import ColumnSetting from './ColumnSetting'

const ColumnsSettings = () => {
	const [columns, setColumns] = useProject(state => [
		[...state.columns.values()],
		state.setColumns,
	])

	const sensors = useSensors(
		useSensor(MouseSensor, {
			activationConstraint: {
				distance: 5,
			},
		}),
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5,
			},
		})
	)

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event
			if (active.id !== over?.id) {
				const oldIndex = columns.findIndex(c => c.key === active.id)
				const newIndex = columns.findIndex(c => c.key === over?.id)
				const _columns = arrayMove(columns, oldIndex, newIndex)

				const data = new Map()
				for (const c of _columns) {
					data.set(c.key, c)
				}
				setColumns(data)
			}
		},
		[columns, setColumns]
	)

	const saveColumnSettings = (column: Column) => {
		const _columns = [...columns]
		const index = _columns.findIndex(c => c.key === column.key)
		_columns[index] = { ..._columns[index], ...column }

		const data = new Map()
		for (const c of _columns) {
			data.set(c.key, c)
		}
		setColumns(data)

		modals.closeAll()
	}

	const openColumnSettings = (column: Column) => {
		modals.open({
			title: `Column Settings: ${column.key}`,
			children: <ColumnSetting column={column} onSave={saveColumnSettings} />,
		})
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext strategy={verticalListSortingStrategy} items={columns.map(c => c.key!)}>
				<Stack gap="xs">
					{columns.map(column => (
						<SortableItem
							key={column.key}
							id={column.key!}
							column={column}
							actions={
								<>
									<ActionIcon
										{...{ size: 'sm', color: 'white', variant: 'subtle' }}
										onClick={e => {
											e.stopPropagation()
											saveColumnSettings({ ...column, hidden: !column.hidden })
										}}
									>
										{column.hidden ? <IconEyeOff size={16} /> : <IconEye size={16} />}
									</ActionIcon>
									<ActionIcon
										{...{ size: 'sm', color: 'white', variant: 'subtle' }}
										onClick={e => {
											e.stopPropagation()
											openColumnSettings(column)
										}}
									>
										<IconAdjustmentsFilled size={16} />
									</ActionIcon>
								</>
							}
						/>
					))}
				</Stack>
			</SortableContext>
		</DndContext>
	)
}

export default ColumnsSettings
