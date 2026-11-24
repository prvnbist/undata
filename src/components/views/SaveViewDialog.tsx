import { useId, useState } from 'react'
import type { FormEvent, RefObject } from 'react'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { nameProblem, renameView, saveNewView } from './actions'

export type Naming = { kind: 'save' } | { kind: 'rename'; id: string; name: string }

function NameForm({ naming, onDone }: { naming: Naming; onDone: () => void }) {
	const id = useId()
	const [name, setName] = useState(naming.kind === 'rename' ? naming.name : '')
	const [error, setError] = useState<string | null>(null)

	const submit = (event: FormEvent) => {
		event.preventDefault()
		const problem = nameProblem(name, naming.kind === 'rename' ? naming.id : null)
		if (problem) return setError(problem)
		void (naming.kind === 'save' ? saveNewView(name) : renameView(name))
		onDone()
	}

	return (
		<form onSubmit={submit} className="flex flex-col gap-3" noValidate>
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={`${id}-name`}>Name</Label>
				<Input
					id={`${id}-name`}
					value={name}
					autoFocus
					onFocus={event => event.currentTarget.select()}
					onChange={event => {
						setError(null)
						setName(event.target.value)
					}}
					aria-invalid={error !== null || undefined}
					aria-describedby={error ? `${id}-error` : undefined}
				/>
			</div>
			{error && (
				<p id={`${id}-error`} role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onDone}>
					Cancel
				</Button>
				<Button type="submit">{naming.kind === 'save' ? 'Save' : 'Rename'}</Button>
			</div>
		</form>
	)
}

// Names a new view, or the one on screen.
export function SaveViewDialog({
	naming,
	onClose,
	returnTo,
}: {
	naming: Naming | null
	onClose: () => void
	// Opened from a menu item that is gone by then, so focus goes back to the menu's button.
	returnTo: RefObject<HTMLButtonElement | null>
}) {
	return (
		<Dialog open={naming !== null} onOpenChange={open => !open && onClose()}>
			<DialogContent
				className="sm:max-w-sm"
				onCloseAutoFocus={event => {
					event.preventDefault()
					returnTo.current?.focus()
				}}
			>
				<DialogHeader>
					<DialogTitle>{naming?.kind === 'rename' ? 'Rename view' : 'Save view'}</DialogTitle>
					<DialogDescription>
						{naming?.kind === 'rename'
							? 'Only the name changes.'
							: 'Keeps the search, filters, sort, grouping and columns as they are now.'}
					</DialogDescription>
				</DialogHeader>
				{naming && <NameForm naming={naming} onDone={onClose} />}
			</DialogContent>
		</Dialog>
	)
}
