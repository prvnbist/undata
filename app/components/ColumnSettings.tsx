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

import { ActionIcon, Flex, Stack, Text } from '@mantine/core'
import { IconEye, IconEyeOff, IconGripVertical } from '@tabler/icons-react'

import { Column } from '@/types'

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
            <Text size='sm'>{props.column.id}</Text>
            {props.actions}
         </Flex>
      </Flex>
   )
}

const ColumnSettings = ({
   columns,
   setColumns,
}: {
   columns: Column[]
   setColumns: (value: Column[]) => void
}) => {
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
                        <ActionIcon
                           size='xs'
                           color='white'
                           variant='transparent'
                           onClick={e => {
                              e.stopPropagation()
                              toggleVisibility(column.id, !column.visible)
                           }}
                        >
                           {column.visible ? <IconEye /> : <IconEyeOff />}
                        </ActionIcon>
                     }
                  />
               ))}
            </Stack>
         </SortableContext>
      </DndContext>
   )
}

export default ColumnSettings
