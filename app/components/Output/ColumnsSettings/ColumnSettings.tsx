import { useForm } from '@mantine/form'
import { Button, Group, Input, Select, Stack, Switch } from '@mantine/core'

import { Column } from '@/types'
import { DATA_TYPES } from '@/constants'

type ColumnSettingsProps = {
   column: Column
   onSave: (values: Column) => void
}

const ColumnSettings = ({ column, onSave }: ColumnSettingsProps) => {
   const form = useForm({
      initialValues: {
         title: column.title,
         hidden: column.hidden,
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
               <Input.Label>Type</Input.Label>
               <Select
                  disabled
                  clearable
                  searchable
                  data={DATA_TYPES}
                  value={column.type}
                  checkIconPosition='right'
                  placeholder='Select a type'
                  nothingFoundMessage='No such type'
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
