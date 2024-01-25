import { useForm } from '@mantine/form'
import { Button, Group, Input, Stack, Switch } from '@mantine/core'

import { Column } from '@/types'

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
               <Input.Label required>Title</Input.Label>
               <Input placeholder='Enter the title' {...form.getInputProps('title')} />
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
