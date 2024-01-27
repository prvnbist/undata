'use client'

import { Checkbox, Flex, Table } from '@mantine/core'
import {
   createColumnHelper,
   flexRender,
   getCoreRowModel,
   useReactTable,
} from '@tanstack/react-table'
import { format } from 'date-fns'

import { Row } from '@/types'
import useGlobalStore from '@/store/global'
import { DATE_TIME_TYPES_FORMAT, NUMERIC_DATA_TYPES } from '@/constants'

const columnHelper = createColumnHelper<Row>()

const cellRenderer = (cell: any, type: string) => {
   const value = cell.getValue()

   if (type === 'bool')
      return (
         <Flex justify='center'>
            <Checkbox readOnly checked={value} color='teal' size='xs' />
         </Flex>
      )

   if (NUMERIC_DATA_TYPES.includes(type)) return <Flex justify='right'>{value}</Flex>

   if (type in DATE_TIME_TYPES_FORMAT) {
      if (['time', 'timetz'].includes(type)) return <Flex justify='right'>{value}</Flex>
      return <Flex justify='right'>{format(new Date(value), DATE_TIME_TYPES_FORMAT[type])}</Flex>
   }

   if (['json', 'jsonb'].includes(type)) return JSON.stringify(value)

   return value
}

const Results = () => {
   const [columns, rows] = useGlobalStore(state => [state.columns, state.rows])

   const table = useReactTable({
      data: rows,
      getCoreRowModel: getCoreRowModel(),
      columns: columns
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
