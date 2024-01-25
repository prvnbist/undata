'use client'

import TextEditor from '@monaco-editor/react'
import { FormatOptionsWithLanguage, format } from 'sql-formatter'

import { Button, Group } from '@mantine/core'
import { IconPlayerPlayFilled, IconSparkles } from '@tabler/icons-react'

import useGlobalStore from '@/store/global'

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
   const [query, setQuery] = useGlobalStore(state => [state.query, state.setQuery])
   return (
      <>
         <Group justify='end'>
            <Button
               variant='default'
               color='gray'
               leftSection={<IconSparkles size={16} />}
               onClick={() => setQuery(format(query!, FORMAT_OPTIONS))}
            >
               Format
            </Button>
            <Button
               color='gray'
               variant='default'
               onClick={() => onRun(query)}
               leftSection={<IconPlayerPlayFilled size={16} />}
            >
               Run
            </Button>
         </Group>
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
      </>
   )
}

export default Editor
