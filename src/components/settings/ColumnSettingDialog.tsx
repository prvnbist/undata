import { useState } from 'react'
import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DATA_TYPES } from '@/lib/constants'
import type { Column } from '@/store/project'

function ColumnSettingForm({
	column,
	onSave,
}: {
	column: Column
	onSave: (column: Column) => void
}) {
	const [title, setTitle] = useState(column.title)
	const [dataType, setDataType] = useState(column.data_type)
	const [hidden, setHidden] = useState(column.hidden)

	const submit = (event: FormEvent) => {
		event.preventDefault()
		onSave({ ...column, title, data_type: dataType, hidden })
	}

	return (
		<form onSubmit={submit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="column-title">Title</Label>
				<Input
					id="column-title"
					placeholder="Enter the title"
					value={title}
					onChange={event => setTitle(event.target.value)}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="column-type">Data Type</Label>
				<Combobox
					id="column-type"
					value={dataType}
					options={DATA_TYPES}
					placeholder="Select a type"
					emptyMessage="No such type"
					onValueChange={setDataType}
				/>
			</div>
			<div className="flex items-center gap-2">
				<Switch id="column-hidden" checked={hidden} onCheckedChange={setHidden} />
				<Label htmlFor="column-hidden">Hide Column</Label>
			</div>
			<div className="flex justify-end">
				<Button type="submit">Submit</Button>
			</div>
		</form>
	)
}

export function ColumnSettingDialog({
	column,
	onSave,
	onClose,
}: {
	column: Column | null
	onSave: (column: Column) => void
	onClose: () => void
}) {
	return (
		<Dialog open={column !== null} onOpenChange={open => !open && onClose()}>
			<DialogContent>
				{column && (
					<>
						<DialogHeader>
							<DialogTitle>Column Settings: {column.key}</DialogTitle>
							<DialogDescription className="sr-only">
								Change the title, data type and visibility of this column
							</DialogDescription>
						</DialogHeader>
						<ColumnSettingForm
							column={column}
							onSave={next => {
								onSave(next)
								onClose()
							}}
						/>
					</>
				)}
			</DialogContent>
		</Dialog>
	)
}
