import * as React from 'react'
import { cn } from 'cn'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'

function ScrollArea({
	className,
	children,
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
	return (
		<ScrollAreaPrimitive.Root
			data-slot="scroll-area"
			className={cn('relative overflow-hidden', className)}
			{...props}
		>
			<ScrollAreaPrimitive.Viewport
				data-slot="scroll-area-viewport"
				className="size-full rounded-[inherit] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				{children}
			</ScrollAreaPrimitive.Viewport>
			<ScrollAreaPrimitive.ScrollAreaScrollbar
				orientation="vertical"
				className="flex h-full w-2.5 touch-none border-l border-l-transparent p-px select-none"
			>
				<ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
			</ScrollAreaPrimitive.ScrollAreaScrollbar>
		</ScrollAreaPrimitive.Root>
	)
}

export { ScrollArea }
