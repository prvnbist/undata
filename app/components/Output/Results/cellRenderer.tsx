import { format } from 'date-fns'
import TextEditor from '@monaco-editor/react'
import { IconArrowUpRight } from '@tabler/icons-react'

import { ActionIcon, Badge, Checkbox, Flex, Popover, Text } from '@mantine/core'

import { Column } from '@/types'
import { extractURLName, isURL } from '@/utils'
import {
   DATE_DATA_TYPES,
   DATE_TYPES_FORMAT,
   JSON_DATA_TYPES,
   JSON_TEXT_EDITOR_OPTIONS,
   NUMERIC_DATA_TYPES,
   TIME_DATA_TYPES,
} from '@/constants'

const BooleanRenderer = ({ value }: { value: boolean }) => (
   <Flex justify='center'>
      <Checkbox readOnly checked={value} color='teal' size='xs' />
   </Flex>
)

const NumericRenderer = ({ value }: { value: number }) => {
   const { language } = navigator
   return (
      <Flex justify='right'>
         {language ? new Intl.NumberFormat(language).format(value) : value}
      </Flex>
   )
}

const TimeRenderer = ({ value }: { value: string }) => <Flex justify='right'>{value}</Flex>

const DateRenderer = ({ value, type }: { value: string; type: keyof typeof DATE_TYPES_FORMAT }) => (
   <Flex justify='right'>{format(new Date(value), DATE_TYPES_FORMAT[type])}</Flex>
)

const JSONRenderer = ({ value }: { value: string }) => (
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

const SingleSelectRenderer = ({ value }: { value: string }) => {
   if (!value) return null
   return (
      <Badge variant='default' color='blue' size='sm'>
         {value}
      </Badge>
   )
}

const URLRenderer = ({ value }: { value: string }) => {
   if (!value) return null
   if (!isURL(value)) return value

   return (
      <Flex w='180px' justify='space-between' align='center'>
         <Text size='sm' truncate='end' c='blue' title={value}>
            {extractURLName(value)}
         </Text>
         <a href={value} target='_blank' rel='noopener noreferrer' style={{ height: '22px' }}>
            <ActionIcon size='sm' variant='subtle' color='blue'>
               <IconArrowUpRight size={14} />
            </ActionIcon>
         </a>
      </Flex>
   )
}

const cellRenderer = (cell: any, type: Column['type'], formatType: Column['formatType']) => {
   const value = cell.getValue()

   if (!type) return value

   switch (true) {
      case formatType === 'select':
         return <SingleSelectRenderer value={value} />
      case formatType === 'url':
         return <URLRenderer value={value} />

      case type === 'bool':
         return <BooleanRenderer value={value} />
      case NUMERIC_DATA_TYPES.includes(type):
         return <NumericRenderer value={value} />
      case TIME_DATA_TYPES.includes(type):
         return <TimeRenderer value={value} />
      case DATE_DATA_TYPES.includes(type):
         return <DateRenderer value={value} type={type} />
      case JSON_DATA_TYPES.includes(type):
         return <JSONRenderer value={value} />
      default:
         return value
   }
}

export default cellRenderer
