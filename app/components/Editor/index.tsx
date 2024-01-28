import { useState } from 'react'
import { format } from 'sql-formatter'
import TextEditor from '@monaco-editor/react'

import {
   IconCopy,
   IconEye,
   IconPlayerPlayFilled,
   IconSparkles,
   IconTable,
} from '@tabler/icons-react'
import {
   ActionIcon,
   Box,
   Button,
   Center,
   Container,
   CopyButton,
   Flex,
   Grid,
   Group,
   Loader,
   ScrollArea,
   Tabs,
} from '@mantine/core'

import useGlobalStore from '@/store/global'
import { QUERY_FORMAT_OPTIONS } from '@/constants'

import TableOrViewItem from './TableOrViewItem'

type EditorProps = {
   onRun: (query: string) => void
}

const LoaderFn = () => (
   <Center w='100%' h='100%'>
      <Loader color='yellow' size='sm' />
   </Center>
)

const Editor = ({ onRun }: EditorProps) => {
   const [isEditorMounted, setIsEditorMounted] = useState(false)
   const [query, metadata, setQuery] = useGlobalStore(state => [
      state.query,
      state.metadata,
      state.setQuery,
   ])

   const hasTables = !!metadata.tables.length
   const hasViews = !!metadata.views.length
   const hasTablesOrViews = hasTables || hasViews
   return (
      <Flex direction='column' w='100%' gap={16}>
         <Group justify='end' gap={8}>
            <CopyButton value={query}>
               {({ copy }) => (
                  <ActionIcon
                     size='lg'
                     title='Copy'
                     color='gray'
                     onClick={copy}
                     variant='default'
                     disabled={!isEditorMounted}
                  >
                     <IconCopy size={16} />
                  </ActionIcon>
               )}
            </CopyButton>
            <ActionIcon
               size='lg'
               title='Format'
               color='gray'
               variant='default'
               disabled={!isEditorMounted}
               onClick={() => setQuery(format(query!, QUERY_FORMAT_OPTIONS))}
            >
               <IconSparkles size={16} />
            </ActionIcon>
            <Button
               color='gray'
               variant='default'
               title='Run Query'
               disabled={!isEditorMounted}
               onClick={() => onRun(query)}
               leftSection={<IconPlayerPlayFilled size={16} />}
            >
               Run
            </Button>
         </Group>
         <Grid>
            <Grid.Col span={hasTablesOrViews ? 9 : 12}>
               <TextEditor
                  height={420}
                  theme='vs-dark'
                  defaultLanguage='sql'
                  options={{
                     fontLigatures: true,
                     fontFamily: 'Fira Code',
                     padding: { top: 16, bottom: 16 },
                  }}
                  value={query}
                  onMount={() => setIsEditorMounted(true)}
                  onChange={value => setQuery(value || '')}
                  loading={
                     <Container fluid w='100%' h='100%' bg='#1e1e1e' style={{ borderRadius: 8 }}>
                        <LoaderFn />
                     </Container>
                  }
               />
            </Grid.Col>
            {hasTablesOrViews && (
               <Grid.Col span={3}>
                  <Box h='100%' bg='#1e1e1e' style={{ overflow: 'hidden', borderRadius: 8 }}>
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
                  </Box>
               </Grid.Col>
            )}
         </Grid>
      </Flex>
   )
}

export default Editor
