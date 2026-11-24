import { useNavigate } from '@tanstack/react-router'
import { IconTable } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { chooseSheet, closeDataset } from '@/store/session'
import { Notice } from './Notice'

// A workbook of several sheets: one is opened, and the others can be opened later in its place.
export function SheetPicker({ name, sheets }: { name: string; sheets: string[] }) {
	const navigate = useNavigate()

	return (
		<Notice
			title="Which sheet?"
			actions={
				<Button
					variant="outline"
					onClick={() => {
						closeDataset()
						void navigate({ to: '/' })
					}}
				>
					Cancel
				</Button>
			}
		>
			<p>
				<span className="font-mono break-all text-muted-foreground">{name}</span> has{' '}
				{sheets.length} sheets. Undata opens one at a time.
			</p>
			<ul role="group" aria-label={`Sheets in ${name}`} className="flex flex-col gap-1 pt-2">
				{sheets.map((sheet, i) => (
					<li key={sheet}>
						<Button
							variant="ghost"
							className="w-full justify-start"
							autoFocus={i === 0}
							onClick={() => void chooseSheet(sheet)}
						>
							<IconTable aria-hidden />
							<span className="truncate">{sheet}</span>
						</Button>
					</li>
				))}
			</ul>
		</Notice>
	)
}
