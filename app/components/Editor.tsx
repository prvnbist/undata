'use client'

import { FormatOptionsWithLanguage, format } from 'sql-formatter'
import TextEditor from '@monaco-editor/react'

import { Button, Group } from '@mantine/core'
import { IconPlayerPlayFilled, IconSparkles } from '@tabler/icons-react'

type EditorProps = {
   query: string
   setQuery: (value: string) => void
   mutate: ({ query }: { query: string }) => void
}

const FORMAT_OPTIONS = {
   tabWidth: 2,
   keywordCase: 'upper',
   language: 'postgresql',
   linesBetweenQueries: 2,
} as FormatOptionsWithLanguage

const Editor = ({ mutate, setQuery, query }: EditorProps) => {
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
               onClick={() => mutate({ query })}
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
