import { Fragment, useState } from 'react'
import { Center, Divider, Flex, Loader, Stack, Text } from '@mantine/core'

import { trpc } from '@/utils/trpc'

const TableInfo = ({ table }: { table: string }) => {
   const [columns, setColumns] = useState<Array<{ name: string; type: string }>>([])
   const { isLoading } = trpc.getTableColumns.useQuery(
      { table },
      {
         onSuccess: data => {
            setColumns(data ?? [])
         },
      }
   )

   if (isLoading) {
      return (
         <Center>
            <Loader color='yellow' size='sm' />;
         </Center>
      )
   }

   return (
      <Stack gap={0}>
         {columns.map((column, index) => (
            <Fragment key={column.name}>
               <Flex {...{ gap: 1, h: '32px', align: 'center', justify: 'space-between' }}>
                  <Text size='sm'>{column.name}</Text>
                  <Text size='xs'>{column.type}</Text>
               </Flex>
               {index < columns.length - 1 && <Divider my={2} />}
            </Fragment>
         ))}
      </Stack>
   )
}

export default TableInfo
