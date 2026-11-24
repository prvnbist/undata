import { useWorkspace, workspace } from '@/store/workspace'
import { INSPECTOR_TITLE } from './InspectorFrame'
import { ColumnPanel } from './ColumnPanel'
import { RowPanel } from './RowPanel'

// The side panel, showing whatever was opened in it.
export function Inspector() {
	const inspector = useWorkspace(state => state.inspector)
	if (!inspector) return null
	if (inspector.kind === 'row') return <RowPanel row={inspector.row} />
	return <ColumnPanel key={inspector.columnId} columnId={inspector.columnId} />
}

// Opens a column's details and puts focus on them, once they are on the page.
export const inspectColumn = (columnId: string) => {
	workspace.set({ inspector: { kind: 'column', columnId } })
	requestAnimationFrame(() => document.getElementById(INSPECTOR_TITLE)?.focus())
}
