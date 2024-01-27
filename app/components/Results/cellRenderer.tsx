import { format } from 'date-fns'
import { editor } from 'monaco-editor'
import TextEditor from '@monaco-editor/react'
import { IconArrowUpRight } from '@tabler/icons-react'

import { ActionIcon, Checkbox, Flex, Popover, Text } from '@mantine/core'

import { DATE_TIME_TYPES_FORMAT, NUMERIC_DATA_TYPES } from '@/constants'

const JSON_TEXT_EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
   readOnly: true,
   lineNumbers: 'off',
   fontLigatures: true,
   fontFamily: 'Fira Code',
   minimap: { enabled: false },
   padding: { top: 16, bottom: 16 },
}

const cellRenderer = (cell: any, type: string) => {
   const value = cell.getValue()

   if (type === 'bool') {
      return (
         <Flex justify='center'>
            <Checkbox readOnly checked={value} color='teal' size='xs' />
         </Flex>
      )
   }

   if (NUMERIC_DATA_TYPES.includes(type)) return <Flex justify='right'>{value}</Flex>

   if (type in DATE_TIME_TYPES_FORMAT) {
      if (['time', 'timetz'].includes(type)) return <Flex justify='right'>{value}</Flex>
      return <Flex justify='right'>{format(new Date(value), DATE_TIME_TYPES_FORMAT[type])}</Flex>
   }

   if (['json', 'jsonb'].includes(type)) {
      return (
         <Flex w='180px' justify='space-between' align='center'>
            <Text size='sm' truncate='end'>
               {JSON.stringify(value)}
            </Text>
            <Popover withinPortal width={340} position='bottom' withArrow shadow='md'>
               <Popover.Target>
                  <ActionIcon size='sm' variant='subtle' color='gray'>
                     <IconArrowUpRight size={14} />
                  </ActionIcon>
               </Popover.Target>
               <Popover.Dropdown p={0}>
                  <TextEditor
                     height={240}
                     theme='vs-dark'
                     defaultLanguage='json'
                     options={JSON_TEXT_EDITOR_OPTIONS}
                     value={JSON.stringify(value, null, 3)}
                  />
               </Popover.Dropdown>
            </Popover>
         </Flex>
      )
   }

   return value
}

export default cellRenderer
