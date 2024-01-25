'use client'

import { ReactNode, useCallback } from 'react'

import {
   DndContext,
   DragEndEvent,
   MouseSensor,
   PointerSensor,
   closestCenter,
   useSensor,
   useSensors,
} from '@dnd-kit/core'
import {
   SortableContext,
   arrayMove,
   useSortable,
   verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { modals } from '@mantine/modals'
import { ActionIcon, Flex, Stack, Text } from '@mantine/core'
import { IconAdjustmentsFilled, IconEye, IconEyeOff, IconGripVertical } from '@tabler/icons-react'

import { Column } from '@/types'
import useGlobalStore from '@/store/global'

import ColumnSettings from './ColumnSettings'

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
         <Flex w='32px' align='center' justify='center'>
            <IconGripVertical size={16} stroke={2} />
         </Flex>
         <Flex align='center' justify='space-between' w='100%' pr={16}>
            <Text size='sm'>
               {props.column.title ?? props.column.id}
               {props.column.title !== props.column.id && ` (${props.column.id})`}
            </Text>
            <Flex align='center' gap={8}>
               {props.actions}
            </Flex>
         </Flex>
      </Flex>
   )
}

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

   const toggleVisibility = useCallback(
      (id: string, value: boolean) => {
         const _columns = [...columns]
         const index = _columns.findIndex(c => c.id === id)

         _columns[index] = { ..._columns[index], visible: value }
         setColumns([..._columns])
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
                              size='sm'
                              color='white'
                              variant='subtle'
                              onClick={e => {
                                 e.stopPropagation()
                                 toggleVisibility(column.id, !column.visible)
                              }}
                           >
                              {column.visible ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                           </ActionIcon>
                           <ActionIcon
                              size='sm'
                              color='white'
                              variant='subtle'
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
