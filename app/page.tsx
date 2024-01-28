'use client'

import { useDisclosure } from '@mantine/hooks'
import { IconAdjustments, IconBug, IconChartLine, IconTable } from '@tabler/icons-react'
import { ActionIcon, Container, Drawer, Flex, Stack, Tabs, Text } from '@mantine/core'

import { Row } from '@/types'
import { trpc } from '@/utils/trpc'
import { prepareTableData } from '@/utils'
import useGlobalStore, { GlobalState } from '@/store/global'

import { ColumnsSettings, Editor, Results } from './components'

export default function Home() {
   const [rows, setColumns, setRows, setMetadata] = useGlobalStore(state => [
      state.rows,
      state.setColumns,
      state.setRows,
      state.setMetadata,
   ])

   const [tab, setTab] = useGlobalStore(state => [state.tab, state.setTab])
   const [error, setError] = useGlobalStore(state => [state.error, state.setError])

   const [opened, { open, close }] = useDisclosure(false)

   trpc.metadata.useQuery(undefined, {
      retry: 3,
      queryKey: ['metadata', undefined],
      onSuccess: data => setMetadata(data),
   })

   const { mutate } = trpc.query.useMutation({
      onSuccess: ({ status, data, message = '' }) => {
         if (status === 'ERROR') {
            setError(message)
            setTab('errors')
            return
         }

         const { results = [], columns: schema } = data ?? {}

         setError('')
         setTab('results')
         prepareTableData(
            schema!,
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
            <Tabs
               value={tab}
               onChange={value => setTab((value as GlobalState['tab']) ?? 'results')}
            >
               <Tabs.List>
                  <Tabs.Tab
                     value='results'
                     disabled={rows.length === 0}
                     leftSection={<IconTable size={16} />}
                  >
                     Results
                  </Tabs.Tab>
                  <Tabs.Tab disabled={!error} value='errors' leftSection={<IconBug size={16} />}>
                     Errors
                  </Tabs.Tab>
                  <Tabs.Tab
                     disabled
                     value='visualizations'
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
               {error && (
                  <Tabs.Panel value='errors' p={16}>
                     <Text size='md'>{error}</Text>
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
