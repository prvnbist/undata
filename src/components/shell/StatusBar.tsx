import { useWorkspace } from '@/store/workspace'
import { ImportNotice } from './ImportNotice'

const inEnglish = new Intl.NumberFormat('en')

export function StatusBar() {
	const rowCount = useWorkspace(state => state.dataset?.rowCount ?? 0)

	return (
		<footer className="flex h-8 shrink-0 items-center gap-2 border-t px-4 text-xs">
			<p>
				{inEnglish.format(rowCount)} {rowCount === 1 ? 'row' : 'rows'}
			</p>
			<ImportNotice />
		</footer>
	)
}
