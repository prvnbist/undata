import { useMemo } from 'react'
import { Table } from '@mantine/core'
import {
   createColumnHelper,
   flexRender,
   getCoreRowModel,
   useReactTable,
} from '@tanstack/react-table'

import { Row } from '@/types'
import useGlobalStore from '@/store/global'

import cellRenderer from './cellRenderer'

const columnHelper = createColumnHelper<Row>()

const Results = () => {
   const [columns, rows] = useGlobalStore(state => [state.columns, state.rows])

   const cachedColumns = useMemo(
      () =>
         columns
            .filter(c => !c.hidden)
            .map(column =>
               columnHelper.accessor(column.id, {
                  id: column.id,
                  header: column.title,
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
export default Results
