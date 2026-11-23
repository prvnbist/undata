import { IconCloudOff } from '@tabler/icons-react'

import { useWorkspace } from '@/store/workspace'
import { ImportNotice } from './ImportNotice'

const inEnglish = new Intl.NumberFormat('en')

export function StatusBar() {
	const rowCount = useWorkspace(state => state.dataset?.rowCount ?? 0)
	const unsaved = useWorkspace(state => state.saved === 'unsaved')

	return (
		<footer className="flex h-8 shrink-0 items-center gap-2 border-t px-4 text-xs">
			<p>
				{inEnglish.format(rowCount)} {rowCount === 1 ? 'row' : 'rows'}
			</p>
			{unsaved && (
				<p
					title="Storage is full or blocked, so this dataset is gone once you leave"
					className="flex items-center gap-1 text-foreground/70"
				>
					<IconCloudOff className="size-3.5" aria-hidden /> Not saved
				</p>
			)}
			<ImportNotice />
		</footer>
	)
}
