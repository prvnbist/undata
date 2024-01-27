'use client'

import TextEditor from '@monaco-editor/react'
import { FormatOptionsWithLanguage, format } from 'sql-formatter'

import { modals } from '@mantine/modals'
import { useHover } from '@mantine/hooks'
import {
   ActionIcon,
   Button,
   CopyButton,
   Divider,
   Flex,
   Grid,
   Group,
   Stack,
   Text,
} from '@mantine/core'
import {
   IconCopy,
   IconEye,
   IconInfoCircle,
   IconPlayerPlayFilled,
   IconSparkles,
   IconTable,
} from '@tabler/icons-react'

import useGlobalStore from '@/store/global'

import TableInfo from './TableInfo'

type EditorProps = {
   onRun: (query: string) => void
}

const FORMAT_OPTIONS = {
   tabWidth: 2,
   keywordCase: 'upper',
   language: 'postgresql',
   linesBetweenQueries: 2,
} as FormatOptionsWithLanguage

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
               onClick={() => setQuery(format(query!, FORMAT_OPTIONS))}
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
                     <ListItem item={item} key={item.name} />
                  ))}
                  <Divider my={4} label='Views' labelPosition='left' />
                  {metadata.views.map(item => (
                     <ListItem item={item} key={item.name} type='view' />
                  ))}
               </Stack>
            </Grid.Col>
         </Grid>
      </Flex>
   )
}

export default Editor

type ListItemProps = {
   item: { name: string }
   type?: 'table' | 'view'
}

const ListItem = ({ item, type = 'table' }: ListItemProps) => {
   const { hovered, ref } = useHover()

   const openModal = () => {
      modals.open({
         title: 'Table Details',
         children: <TableInfo table={item.name} />,
      })
   }
   return (
      <Flex align='center' h={28} gap={8} justify='space-between' ref={ref}>
         <Group gap={8}>
            {type === 'table' ? <IconTable size={16} /> : <IconEye size={16} />}
            <Text size='sm'>{item.name}</Text>
         </Group>
         {hovered && (
            <ActionIcon
               size='sm'
               color='gray'
               variant='subtle'
               title={`${type === 'table' ? 'Table' : 'View'} Info`}
               onClick={openModal}
            >
               <IconInfoCircle size={16} />
            </ActionIcon>
         )}
      </Flex>
   )
}
