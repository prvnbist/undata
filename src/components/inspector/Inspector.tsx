import { useWorkspace } from '@/store/workspace'
import { RowPanel } from './RowPanel'

// The side panel, showing whatever was opened in it.
export function Inspector() {
	const inspector = useWorkspace(state => state.inspector)
	if (!inspector) return null
	if (inspector.kind === 'row') return <RowPanel row={inspector.row} />
	return null
}
