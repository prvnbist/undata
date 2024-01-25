'use client'

import { useState } from 'react'

import { useDisclosure } from '@mantine/hooks'
import { IconAdjustments, IconChartLine, IconTable } from '@tabler/icons-react'
import { ActionIcon, Container, Drawer, Flex, Space, Stack, Table, Tabs } from '@mantine/core'

import { Column, Row } from '@/types'
import { prepareTableData, trpc } from '@/utils'

import { ColumnSettings, Editor, Results } from './components'

export default function Home() {
   const [rows, setRows] = useState<Row[]>([])
   const [columns, setColumns] = useState<Column[]>([])

   const [opened, { open, close }] = useDisclosure(false)

   const [query, setQuery] = useState<string>(
      'select * from public.transactions order by date desc limit 10;'
   )
   const { mutate } = trpc.query.useMutation({
      onSuccess: data => {
         prepareTableData(
            data as Row[],
            rows => setRows(rows),
            columns => setColumns(columns)
         )
      },
   })

   return (
      <Container fluid p={16} h='100vh'>
         <Stack>
            <Editor query={query} setQuery={setQuery} mutate={mutate} />
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
                        <Results rows={rows} columns={columns} />
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
            <ColumnSettings columns={columns} setColumns={setColumns} />
         </Drawer>
      </Container>
   )
}
