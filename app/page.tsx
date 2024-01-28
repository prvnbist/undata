'use client'

import { useDisclosure } from '@mantine/hooks'
import { IconAdjustments, IconChartLine, IconTable } from '@tabler/icons-react'
import { ActionIcon, Container, Drawer, Flex, Stack, Tabs } from '@mantine/core'

import { Row } from '@/types'
import { trpc } from '@/utils/trpc'
import { prepareTableData } from '@/utils'
import useGlobalStore from '@/store/global'

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
            _rows => setRows(_rows),
            _columns => setColumns(_columns)
         )
      },
   })

   return (
      <Container fluid p={16} h='100vh'>
         <Stack>
            <Editor onRun={query => mutate({ query })} />

            <Tabs defaultValue='results'>
               <Tabs.List>
                  <Tabs.Tab
                     value='results'
                     disabled={rows.length === 0}
                     leftSection={<IconTable size={16} />}
                  >
                     Results
                  </Tabs.Tab>
                  <Tabs.Tab
                     disabled
                     value='visualization'
                     leftSection={<IconChartLine size={16} />}
                  >
                     Visualization
                  </Tabs.Tab>
                  <Flex align='center' justify='center' ml='auto'>
                     <ActionIcon
                        color='gray'
                        onClick={open}
                        title='Settings'
                        variant='subtle'
                        disabled={rows.length === 0}
                     >
                        <IconAdjustments size={16} />
                     </ActionIcon>
                  </Flex>
               </Tabs.List>
               {rows.length > 0 && (
                  <Tabs.Panel value='results' pt={16}>
                     <Results />
                  </Tabs.Panel>
               )}
            </Tabs>
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
