import { useState } from 'react'
import { IconMaximize } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { parseJsonTree } from '@/lib/json/tree'
import { JsonTree } from './JsonTree'

// The text in the cell, and the tree only once it is asked for.
export function JsonCell({ text }: { text: string }) {
	const [open, setOpen] = useState(false)
	const node = open ? parseJsonTree(text) : null

	return (
		<div className="flex min-w-0 flex-1 items-center justify-between gap-1">
			<span className="truncate font-mono text-xs">{text.slice(0, 500)}</span>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					render={
						<Button variant="ghost" size="icon-xs" aria-label="View JSON" title="View JSON" />
					}
				>
					<IconMaximize />
				</PopoverTrigger>
				<PopoverContent side="bottom" align="start" className="max-h-80 w-96 overflow-auto p-2">
					{node && <JsonTree node={node} />}
				</PopoverContent>
			</Popover>
		</div>
	)
}
