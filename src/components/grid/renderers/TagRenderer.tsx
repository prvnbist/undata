import { IconDots } from '@tabler/icons-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { generateTags } from '@/lib/tags'

const label = (item: unknown) => (typeof item === 'string' ? item : JSON.stringify(item))

export function TagRenderer({ value }: { value: unknown }) {
	const list = generateTags(value)

	if (list.length === 0) return null

	const firstThree = list.slice(0, 3)
	const remaining = list.slice(3)

	return (
		<div className="flex w-60 flex-wrap items-center gap-1 py-0.5">
			{firstThree.map((item, index) => (
				<Badge key={`${label(item)}-${index}`} variant="outline">
					{label(item)}
				</Badge>
			))}
			{remaining.length > 0 && (
				<Popover>
					<PopoverTrigger
						render={
							<Button
								variant="ghost"
								size="icon-xs"
								title="View Options"
								aria-label="View Options"
							/>
						}
					>
						<IconDots size={14} />
					</PopoverTrigger>
					<PopoverContent align="end" className="flex w-70 flex-wrap gap-1 p-1">
						{remaining.map((item, index) => (
							<Badge key={`${label(item)}-${index}`} variant="outline">
								{label(item)}
							</Badge>
						))}
					</PopoverContent>
				</Popover>
			)}
		</div>
	)
}
