import { useMemo, useState } from 'react'
import { Flex, Pagination, Space, Table, Text } from '@mantine/core'
import {
   createColumnHelper,
   flexRender,
   getCoreRowModel,
   useReactTable,
} from '@tanstack/react-table'

import { Row } from '@/types'
import { chunkRows } from '@/utils'
import useGlobalStore from '@/store/global'
import { DATE_DATA_TYPES, NUMERIC_DATA_TYPES, TIME_DATA_TYPES } from '@/constants'

import cellRenderer from './cellRenderer'

const columnHelper = createColumnHelper<Row>()

const isRightAligned = (type: string) =>
   [...NUMERIC_DATA_TYPES, ...TIME_DATA_TYPES, ...DATE_DATA_TYPES].includes(type)

const Results = () => {
   const [page, setPage] = useState(1)
   const [columns, rows] = useGlobalStore(state => [state.columns, state.rows])

   const cachedColumns = useMemo(
      () =>
         columns
            .filter(c => !c.hidden)
            .map(column =>
               columnHelper.accessor(column.id, {
                  id: column.id,
                  header: () => (
                     <Text size='sm' ta={isRightAligned(column.type!) ? 'right' : 'left'}>
                        {column.title}
                     </Text>
                  ),
                  ...(column.type && {
                     cell: props => cellRenderer(props, column.type!),
                  }),
               })
            ),
      [columns]
   )

   const table = useReactTable({
      data: rows,
      columns: cachedColumns,
      getCoreRowModel: getCoreRowModel(),
   })

   const chunkedRows = useMemo(
      () => chunkRows(table.getRowModel().rows, 10),
      [table.getRowModel().rows]
   )
   const _rows = chunkedRows[page - 1]

   return (
      <>
         {rows.length > 10 && (
            <>
               <Flex justify='end'>
                  <Pagination
                     size='sm'
                     withEdges
                     radius='md'
                     value={page}
                     onChange={setPage}
                     total={chunkedRows.length}
                  />
               </Flex>
               <Space h={16} />
            </>
         )}
         <Table.ScrollContainer minWidth={480}>
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
                  {_rows.map(row => (
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
         </Table.ScrollContainer>
      </>
   )
}
export default Results
