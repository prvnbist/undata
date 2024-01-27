import { format } from 'sql-formatter'
import TextEditor from '@monaco-editor/react'

import { IconCopy, IconPlayerPlayFilled, IconSparkles } from '@tabler/icons-react'
import { ActionIcon, Button, CopyButton, Divider, Flex, Grid, Group, Stack } from '@mantine/core'

import useGlobalStore from '@/store/global'
import { QUERY_FORMAT_OPTIONS } from '@/constants'

import TableOrViewItem from './TableOrViewItem'

type EditorProps = {
   onRun: (query: string) => void
}

const Editor = ({ onRun }: EditorProps) => {
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
                  <ActionIcon size='lg' title='Copy' color='gray' onClick={copy} variant='default'>
                     <IconCopy size={16} />
                  </ActionIcon>
               )}
            </CopyButton>
            <ActionIcon
               size='lg'
               title='Format'
               color='gray'
               variant='default'
               onClick={() => setQuery(format(query!, QUERY_FORMAT_OPTIONS))}
            >
               <IconSparkles size={16} />
            </ActionIcon>
            <Button
               color='gray'
               variant='default'
               title='Run Query'
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
                  onChange={value => setQuery(value || '')}
               />
            </Grid.Col>
            <Grid.Col span={3}>
               <Stack gap={2} h='100%' bg='dark.8' p={16} style={{ borderRadius: 8 }}>
                  <Divider my={4} label='Tables' labelPosition='left' />
                  {metadata.tables.map(item => (
                     <TableOrViewItem item={item} key={item.name} />
                  ))}
                  <Divider my={4} label='Views' labelPosition='left' />
                  {metadata.views.map(item => (
                     <TableOrViewItem item={item} key={item.name} type='view' />
                  ))}
               </Stack>
            </Grid.Col>
         </Grid>
      </Flex>
   )
}

export default Editor
