import { Box, Center, Loader, ScrollArea, Tabs, Text } from '@mantine/core'
import { IconEye, IconTable } from '@tabler/icons-react'

import useGlobalStore from '@/store/global'

import TableOrViewItem from './TableOrViewItem'

const Schema = () => {
   const metadata = useGlobalStore(state => state.metadata)
   const isEditorMounted = useGlobalStore(state => state.isEditorMounted)

   const hasTables = !!metadata.tables.length
   const hasViews = !!metadata.views.length
   const hasTablesOrViews = hasTables || hasViews
   return (
      <Box h='100%' bg='#1e1e1e' style={{ overflow: 'hidden', borderRadius: 8 }}>
         {isEditorMounted ? (
            hasTablesOrViews ? (
               <Tabs
                  defaultValue='tables'
                  styles={{
                     tab: {
                        borderRadius: 0,
                     },
                  }}
               >
                  <Tabs.List>
                     {hasTables && (
                        <Tabs.Tab value='tables' leftSection={<IconTable size={16} />}>
                           Tables
                        </Tabs.Tab>
                     )}
                     {hasViews && (
                        <Tabs.Tab value='views' leftSection={<IconEye size={16} />}>
                           Views
                        </Tabs.Tab>
                     )}
                  </Tabs.List>
                  {hasTables && (
                     <Tabs.Panel value='tables'>
                        <ScrollArea py={8} px={16} h={382}>
                           {metadata.tables.map(item => (
                              <TableOrViewItem item={item} key={item.name} />
                           ))}
                        </ScrollArea>
                     </Tabs.Panel>
                  )}
                  {hasViews && (
                     <Tabs.Panel value='views'>
                        <ScrollArea py={8} px={16} h={382}>
                           {metadata.views.map(item => (
                              <TableOrViewItem item={item} key={item.name} type='view' />
                           ))}
                        </ScrollArea>
                     </Tabs.Panel>
                  )}
               </Tabs>
            ) : (
               <Center w='100%' h='100%' px={32}>
                  <Text variant='md' ta='center'>
                     Connected database has no tables or views.
                  </Text>
               </Center>
            )
         ) : (
            <Center w='100%' h='100%'>
               <Loader color='yellow' size='sm' />
            </Center>
         )}
      </Box>
   )
}

export default Schema
