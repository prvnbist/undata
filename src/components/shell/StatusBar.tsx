import { IconCloudOff } from '@tabler/icons-react'

import { Kbd } from '@/components/ui/kbd'
import { useWorkspace } from '@/store/workspace'
import { ImportNotice } from './ImportNotice'
import { modKey } from './platform'

const inEnglish = new Intl.NumberFormat('en')

export function StatusBar() {
	const total = useWorkspace(state => state.dataset?.rowCount ?? 0)
	const found = useWorkspace(state => state.query?.rowCount ?? 0)
	const narrowed = useWorkspace(state => state.view.search !== '' || state.view.filters.length > 0)
	const groups = useWorkspace(state =>
		(state.view.grouping?.by.length ?? 0) > 0 ? (state.groups?.groupCount ?? null) : null
	)
	const unsaved = useWorkspace(state => state.saved === 'unsaved')

	return (
		<footer className="flex h-7 shrink-0 items-center gap-3 border-t px-3 text-xs text-subtle-foreground tabular">
			{/* Read out politely as the search and filters change it. */}
			<p role="status">
				{groups !== null &&
					`${inEnglish.format(groups)} ${groups === 1 ? 'group' : 'groups'} from ${narrowed ? `${inEnglish.format(found)} of ` : ''}`}
				{groups === null && narrowed && `${inEnglish.format(found)} of `}
				{inEnglish.format(total)} {total === 1 ? 'row' : 'rows'}
			</p>
			{unsaved && (
				<p
					title="Storage is full or blocked, so this dataset is gone once you leave"
					className="flex items-center gap-1 text-muted-foreground"
				>
					<IconCloudOff className="size-3.5" aria-hidden /> Not saved
				</p>
			)}
			<ImportNotice />
			<p className="ml-auto flex items-center gap-1.5 max-sm:hidden">
				<Kbd>{modKey()}</Kbd>
				<Kbd>K</Kbd>
				<span>Commands</span>
			</p>
		</footer>
	)
}
