import { useState } from 'react'
import { format } from 'sql-formatter'
import TextEditor from '@monaco-editor/react'

import { IconCopy, IconPlayerPlayFilled, IconSparkles } from '@tabler/icons-react'
import {
   ActionIcon,
   Button,
   Center,
   Container,
   CopyButton,
   Divider,
   Flex,
   Grid,
   Group,
   Loader,
   Stack,
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
            <Grid.Col span={9}>
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
            <Grid.Col span={3}>
               <Stack gap={2} h='100%' bg='#1e1e1e' p={16} style={{ borderRadius: 8 }}>
                  {metadata.tables.length > 0 && metadata.views.length > 0 ? (
                     <>
                        <Divider my={4} label='Tables' labelPosition='left' />
                        {metadata.tables.map(item => (
                           <TableOrViewItem item={item} key={item.name} />
                        ))}
                        <Divider my={4} label='Views' labelPosition='left' />
                        {metadata.views.map(item => (
                           <TableOrViewItem item={item} key={item.name} type='view' />
                        ))}
                     </>
                  ) : (
                     <LoaderFn />
                  )}
               </Stack>
            </Grid.Col>
         </Grid>
      </Flex>
   )
}

export default Editor
