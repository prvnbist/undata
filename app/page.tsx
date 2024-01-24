'use client'

import Editor from '@monaco-editor/react'
import { ReactNode, useCallback, useState } from 'react'
import { format } from 'sql-formatter'

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

import {
   ActionIcon,
   Button,
   Container,
   Drawer,
   Flex,
   Group,
   Space,
   Stack,
   Table,
   Tabs,
   Text,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
   IconAdjustments,
   IconChartLine,
   IconEye,
   IconEyeOff,
   IconGripVertical,
   IconPlayerPlayFilled,
   IconSparkles,
   IconTable,
} from '@tabler/icons-react'
import {
   createColumnHelper,
   flexRender,
   getCoreRowModel,
   useReactTable,
} from '@tanstack/react-table'

import { trpc } from '@/utils'

type Row = {
   [key in string]: any
}

type Column = {
   id: string
   visible: boolean
}

const columnHelper = createColumnHelper<Row>()

const prepareTableData = <T extends Row>(
   data: T[],
   setRows: (value: T[]) => void,
   setColumns: (value: Column[]) => void
) => {
   if (Array.isArray(data)) {
      if (data.length === 0) {
         {
            setRows([])
            setColumns([])
            return
         }
      }

      setRows(data)

      const firstRow = data[0]
      const columns = Object.keys(firstRow).map(key => ({ id: key, visible: true }))
      setColumns(columns)
   }
}

export default function Home() {
   const [rows, setRows] = useState<Row[]>([])
   const [columns, setColumns] = useState<Column[]>([])

   const [opened, { open, close }] = useDisclosure(false)

   const [query, setQuery] = useState<string>(
      'select * from public.transactions order by date desc limit 10;'
   )
   const { mutate } = trpc.query.useMutation({
      onSuccess: data => {
         prepareTableData(
            data as Row[],
            rows => setRows(rows),
            columns => setColumns(columns)
         )
      },
   })

   return (
      <Container fluid p={16} h='100vh'>
         <Stack>
            <Group justify='end'>
               <Button
                  variant='default'
                  color='gray'
                  onClick={() => setQuery(format(query!))}
                  leftSection={<IconSparkles size={16} />}
               >
                  Format
               </Button>
               <Button
                  color='gray'
                  variant='default'
                  onClick={() => mutate({ query })}
                  leftSection={<IconPlayerPlayFilled size={16} />}
               >
                  Run
               </Button>
            </Group>
            <Editor
               height={420}
               theme='vs-dark'
               defaultLanguage='sql'
               options={{
                  fontLigatures: true,
                  fontFamily: 'Fira Code',
                  padding: { top: 16, bottom: 16 },
               }}
               value={query}
               onChange={value => setQuery(value || '')}
            />
            {rows.length > 0 && (
               <Tabs defaultValue='results'>
                  <Tabs.List>
                     <Tabs.Tab value='results' leftSection={<IconTable size={16} />}>
                        Results
                     </Tabs.Tab>
                     <Tabs.Tab
                        value='visualization'
                        leftSection={<IconChartLine size={16} />}
                        disabled
                     >
                        Visualization
                     </Tabs.Tab>
                     <Flex align='center' justify='center' ml='auto'>
                        <ActionIcon variant='subtle' color='gray' title='Settings' onClick={open}>
                           <IconAdjustments size={16} />
                        </ActionIcon>
                     </Flex>
                  </Tabs.List>
                  <Tabs.Panel value='results'>
                     <Space h={16} />
                     <Table.ScrollContainer minWidth={480}>
                        <Results rows={rows} columns={columns} />
                     </Table.ScrollContainer>
                  </Tabs.Panel>
               </Tabs>
            )}
         </Stack>
         <Drawer
            offset={8}
            radius='md'
            opened={opened}
            onClose={close}
            title='Settings'
            position='right'
         >
            <Settings columns={columns} setColumns={setColumns} />
         </Drawer>
      </Container>
   )
}

const Results = ({ rows, columns }: { rows: Row[]; columns: Column[] }) => {
   const table = useReactTable({
      data: rows,
      getCoreRowModel: getCoreRowModel(),
      columns: columns
         .filter(c => c.visible)
         .map(column => columnHelper.accessor(column.id, { id: column.id })),
   })

   return (
      <Table striped highlightOnHover withTableBorder withColumnBorders>
         <Table.Thead>
            {table.getHeaderGroups().map(headerGroup => (
               <Table.Tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                     <Table.Th key={header.id}>
                        {header.isPlaceholder
                           ? null
                           : flexRender(header.column.columnDef.header, header.getContext())}
                     </Table.Th>
                  ))}
               </Table.Tr>
            ))}
         </Table.Thead>
         <Table.Tbody>
            {table.getRowModel().rows.map(row => (
               <Table.Tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                     <Table.Td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                     </Table.Td>
                  ))}
               </Table.Tr>
            ))}
         </Table.Tbody>
      </Table>
   )
}

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

const Settings = ({
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
