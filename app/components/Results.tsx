'use client'

import { Table } from '@mantine/core'
import {
   createColumnHelper,
   flexRender,
   getCoreRowModel,
   useReactTable,
} from '@tanstack/react-table'

import { Column, Row } from '@/types'

const columnHelper = createColumnHelper<Row>()

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
export default Results
