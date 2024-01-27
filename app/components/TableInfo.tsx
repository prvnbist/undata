import { useState } from 'react'
import { Divider, Flex, Stack, Text } from '@mantine/core'

import { trpc } from '@/utils'

const TableInfo = ({ table }: { table: string }) => {
   const [columns, setColumns] = useState<Array<{ name: string; type: string }>>([])
   trpc.getTableColumns.useQuery(
      { table },
      {
         onSuccess: data => {
            setColumns(data ?? [])
         },
      }
   )
   return (
      <Stack gap={0}>
         {columns.map((column, index) => (
            <>
               <Flex key={column.name} {...{ gap: 1, h: '32px', align: 'center' }}>
                  <Text size='sm'>{column.name}</Text>
               </Flex>
               {index < columns.length - 1 && <Divider my={2} />}
            </>
         ))}
      </Stack>
   )
}

export default TableInfo
