import { useCallback } from 'react'

import {
   DndContext,
   DragEndEvent,
   MouseSensor,
   PointerSensor,
   closestCenter,
   useSensor,
   useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { modals } from '@mantine/modals'
import { ActionIcon, Stack } from '@mantine/core'
import { IconAdjustmentsFilled, IconEye, IconEyeOff } from '@tabler/icons-react'

import { Column } from '@/types'
import useGlobalStore from '@/store/global'

import SortableItem from './SortableItem'
import ColumnSettings from './ColumnSettings'

const ColumnsSettings = () => {
   const [columns, setColumns] = useGlobalStore(state => [state.columns, state.setColumns])

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
            const oldIndex = columns.findIndex(c => c.id === active.id)
            const newIndex = columns.findIndex(c => c.id === over?.id)
            const _columns = arrayMove(columns, oldIndex, newIndex)
            setColumns(_columns)
         }
      },
      [columns]
   )

   const saveColumnSettings = (column: Column) => {
      const _columns = [...columns]
      const index = _columns.findIndex(c => c.id === column.id)

      _columns[index] = { ..._columns[index], ...column }
      setColumns([..._columns])

      modals.closeAll()
   }

   const openColumnSettings = (column: Column) => {
      modals.open({
         title: `Column Settings: ${column.id}`,
         children: <ColumnSettings column={column} onSave={saveColumnSettings} />,
      })
   }

   return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
         <SortableContext items={columns.map(c => c.id!)} strategy={verticalListSortingStrategy}>
            <Stack gap='xs'>
               {columns.map(column => (
                  <SortableItem
                     key={column.id}
                     id={column.id!}
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
