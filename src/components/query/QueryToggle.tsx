import { lazy, Suspense } from 'react'
import { IconSql } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { nextNonce, useWorkspace, workspace } from '@/store/workspace'

export const QUERY_TOGGLE = 'query-toggle'

// The parser and editor are loaded the first time they are opened, not with the workspace.
const QueryPanel = lazy(() =>
	import('./QueryPanel').then(module => ({ default: module.QueryPanel }))
)

export function QueryToggle() {
	const open = useWorkspace(state => state.queryOpen)
	return (
		<Button
			id={QUERY_TOGGLE}
			variant="ghost"
			size="sm"
			aria-pressed={open}
			aria-label="SQL query"
			className="aria-pressed:bg-accent aria-pressed:text-foreground"
			onClick={() =>
				workspace.set(
					open ? { queryOpen: false } : { queryOpen: true, queryFocus: nextNonce() }
				)
			}
		>
			<IconSql />
			<span className="max-sm:sr-only">SQL</span>
		</Button>
	)
}

export function QuerySlot() {
	const open = useWorkspace(state => state.queryOpen)
	if (!open) return null
	return (
		<Suspense fallback={null}>
			<QueryPanel />
		</Suspense>
	)
}
