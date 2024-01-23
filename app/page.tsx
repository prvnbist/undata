'use client'

import { format } from 'sql-formatter'
import Editor from '@monaco-editor/react'

import { trpc } from '@/utils'
import { useState } from 'react'
import { IconChartLine, IconPlayerPlayFilled, IconSparkles, IconTable } from '@tabler/icons-react'
import { Button, Container, Group, ScrollArea, Space, Stack, Table, Tabs } from '@mantine/core'
import {
   ColumnDef,
   createColumnHelper,
   flexRender,
   getCoreRowModel,
   useReactTable,
} from '@tanstack/react-table'

type Row = {
   [key in string]: any
}

const columnHelper = createColumnHelper<Row>()

const prepareTableData = <T extends Row>(
   data: T[],
   setRows: (value: T[]) => void,
   setColumns: (value: ColumnDef<Row, any>[]) => void
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
      const columns = Object.keys(firstRow).map(key => columnHelper.accessor(key, {}))
      setColumns(columns)
   }
}

export default function Home() {
   const [rows, setRows] = useState<Row[]>([])
   const [columns, setColumns] = useState<ColumnDef<Row, any>[]>([])

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
      </Container>
   )
}

const Results = ({ rows, columns }: { rows: Row[]; columns: ColumnDef<Row, any>[] }) => {
   const table = useReactTable({
      columns,
      data: rows,
      getCoreRowModel: getCoreRowModel(),
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
