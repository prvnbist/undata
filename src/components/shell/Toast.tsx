import { useEffect } from 'react'
import { IconX } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { useWorkspace, workspace } from '@/store/workspace'

const VISIBLE_MS = 10_000

const dismiss = () => workspace.set({ notice: null })

// Short messages about what just happened. The region is always there, so that they are announced.
export function Toast() {
	const notice = useWorkspace(state => state.notice)

	useEffect(() => {
		if (!notice) return
		const timer = setTimeout(dismiss, VISIBLE_MS)
		return () => clearTimeout(timer)
	}, [notice])

	return (
		<div
			role="status"
			className="pointer-events-none fixed inset-x-0 bottom-12 z-90 flex justify-center px-4"
		>
			{notice && (
				<div className="pointer-events-auto flex items-center gap-2 rounded-md border bg-popover py-2 pr-2 pl-4 text-sm shadow-lg">
					<p>{notice}</p>
					<Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={dismiss}>
						<IconX />
					</Button>
				</div>
			)}
		</div>
	)
}
