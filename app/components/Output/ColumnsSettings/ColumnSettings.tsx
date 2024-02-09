import { useForm } from '@mantine/form'
import { Button, Group, Input, Select, Stack, Switch } from '@mantine/core'

import { Column } from '@/types'
import { DATA_FORMAT_TYPES } from '@/constants'

type ColumnSettingsProps = {
   column: Column
   onSave: (values: Column) => void
}

type FormState = Omit<Column, 'id'>

const ColumnSettings = ({ column, onSave }: ColumnSettingsProps) => {
   const form = useForm<FormState>({
      initialValues: {
         hidden: column.hidden,
         title: column.title,
         type: column.type,
         formatType: column.formatType,
      },
   })
   return (
      <form onSubmit={form.onSubmit(values => onSave({ ...column, ...values }))}>
         <Stack>
            <Stack gap={4}>
               <Input.Label>Title</Input.Label>
               <Input placeholder='Enter the title' {...form.getInputProps('title')} />
            </Stack>
            <Stack gap={4}>
               <Input.Label>Data Type</Input.Label>
               <Input placeholder='Enter the title' disabled {...form.getInputProps('type')} />
            </Stack>
            <Stack gap={4}>
               <Input.Label>Format Type</Input.Label>
               <Select
                  clearable
                  searchable
                  data={DATA_FORMAT_TYPES}
                  checkIconPosition='right'
                  placeholder='Select a type'
                  nothingFoundMessage='No such type'
                  {...form.getInputProps('formatType')}
                  disabled={!['text', '_text'].includes(column.type ?? '')}
               />
            </Stack>
            <Switch label='Hide Column' {...form.getInputProps('hidden', { type: 'checkbox' })} />
            <Group justify='flex-end'>
               <Button type='submit'>Submit</Button>
            </Group>
         </Stack>
      </form>
   )
}

export default ColumnSettings
