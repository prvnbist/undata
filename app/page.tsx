'use client'

import { useDisclosure } from '@mantine/hooks'
import { IconAdjustments, IconChartLine, IconTable } from '@tabler/icons-react'
import { ActionIcon, Container, Drawer, Flex, Space, Stack, Table, Tabs } from '@mantine/core'

import { Row } from '@/types'
import useGlobalStore from '@/store/global'
import { prepareTableData, trpc } from '@/utils'

import { ColumnsSettings, Editor, Results } from './components'

export default function Home() {
   const [rows, setColumns, setRows, setMetadata] = useGlobalStore(state => [
      state.rows,
      state.setColumns,
      state.setRows,
      state.setMetadata,
   ])

   const [opened, { open, close }] = useDisclosure(false)

   trpc.metadata.useQuery(undefined, {
      retry: 3,
      queryKey: ['metadata', undefined],
      onSuccess: data => setMetadata(data),
   })

   const { mutate } = trpc.query.useMutation({
      onSuccess: ({ results = [], columns: schema }) => {
         prepareTableData(
            schema,
            results as Row[],
            rows => setRows(rows),
            columns => setColumns(columns)
         )
      },
   })

   return (
      <Container fluid p={16} h='100vh'>
         <Stack>
            <Editor onRun={query => mutate({ query })} />
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
                        <Results />
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
            <ColumnsSettings />
         </Drawer>
      </Container>
   )
}
