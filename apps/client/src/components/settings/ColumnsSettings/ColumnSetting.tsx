import { useForm } from '@mantine/form'
import { Button, Group, Input, Select, Stack, Switch } from '@mantine/core'

import type { Column } from 'providers/project'
import { DATA_TYPES } from 'constants/index'

type ColumnSettingsProps = {
	column: Column
	onSave: (values: Column) => void
}

type FormState = Omit<Column, 'key'>

const ColumnSetting = ({ column, onSave }: ColumnSettingsProps) => {
	const form = useForm<FormState>({
		initialValues: {
			hidden: column.hidden,
			title: column.title,
			data_type: column.data_type,
		},
	})
	return (
		<form onSubmit={form.onSubmit(values => onSave({ ...column, ...values }))}>
			<Stack>
				<Stack gap={4}>
					<Input.Label>Title</Input.Label>
					<Input placeholder="Enter the title" {...form.getInputProps('title')} />
				</Stack>
				<Stack gap={4}>
					<Input.Label>Data Type</Input.Label>
					<Select
						searchable
						data={DATA_TYPES}
						allowDeselect={false}
						checkIconPosition="right"
						placeholder="Select a type"
						nothingFoundMessage="No such type"
						{...form.getInputProps('data_type')}
					/>
				</Stack>
				<Switch label="Hide Column" {...form.getInputProps('hidden', { type: 'checkbox' })} />
				<Group justify="flex-end">
					<Button type="submit">Submit</Button>
				</Group>
			</Stack>
		</form>
	)
}

export default ColumnSetting
