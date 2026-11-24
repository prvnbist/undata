import type { KeyboardEvent, ReactNode } from 'react'
import { IconX } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { workspace } from '@/store/workspace'

export const INSPECTOR_TITLE = 'inspector-title'

export const closeInspector = () => {
	workspace.set({ inspector: null })
	document.querySelector<HTMLElement>('[role="grid"]')?.focus()
}

// Docked beside the grid on a wide screen, and a sheet over the bottom of a narrow one.
export function InspectorFrame({
	label,
	title,
	actions,
	onKeyDown,
	children,
}: {
	label: string
	title: ReactNode
	actions?: ReactNode
	onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
	children: ReactNode
}) {
	return (
		<aside
			aria-label={label}
			onKeyDown={event => {
				onKeyDown?.(event)
				if (event.key === 'Escape' && !event.defaultPrevented) {
					event.preventDefault()
					closeInspector()
				}
			}}
			className="fixed inset-x-0 bottom-0 z-30 flex max-h-[60dvh] flex-col border-t bg-card shadow-lg lg:static lg:z-auto lg:max-h-none lg:w-96 lg:shrink-0 lg:border-t-0 lg:border-l lg:shadow-none"
		>
			<div className="flex h-11 shrink-0 items-center gap-1 border-b pr-2 pl-4">
				<h2
					id={INSPECTOR_TITLE}
					tabIndex={-1}
					className="min-w-0 flex-1 truncate text-sm font-medium outline-none"
				>
					{title}
				</h2>
				{actions}
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={`Close ${label.toLowerCase()}`}
					onClick={closeInspector}
				>
					<IconX />
				</Button>
			</div>
			{children}
		</aside>
	)
}
