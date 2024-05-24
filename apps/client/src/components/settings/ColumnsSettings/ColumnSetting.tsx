import { useForm } from '@mantine/form'
import { Button, Group, Input, Select, Stack, Switch } from '@mantine/core'

import type { Column } from 'providers/project'
import { DATA_FORMAT_TYPES } from 'constants/index'

type ColumnSettingsProps = {
	column: Column
	onSave: (values: Column) => void
}

type FormState = Omit<Column, 'key'>

const ColumnSetting = ({ column, onSave }: ColumnSettingsProps) => {
	console.log(column)
	const form = useForm<FormState>({
		initialValues: {
			hidden: column.hidden,
			title: column.title,
			data_type: column.data_type,
			format_type: column.format_type,
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
					<Input placeholder="Enter the title" disabled {...form.getInputProps('data_type')} />
				</Stack>
				<Stack gap={4}>
					<Input.Label>Format Type</Input.Label>
					<Select
						clearable
						searchable
						data={DATA_FORMAT_TYPES}
						checkIconPosition="right"
						placeholder="Select a type"
						nothingFoundMessage="No such type"
						{...form.getInputProps('format_type')}
						disabled={!['text', '_text'].includes(column.data_type ?? '')}
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
