import * as React from 'react'
import { cn } from 'cn'

// A key or shortcut, such as ⌘K. Each child string is one key cap.
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
	return (
		<kbd
			data-slot="kbd"
			className={cn(
				'inline-flex h-4.5 min-w-4.5 items-center justify-center gap-0.5 rounded-[4px] border border-foreground/10 bg-foreground/5 px-1 font-sans text-[11px] leading-none font-medium text-muted-foreground',
				className
			)}
			{...props}
		/>
	)
}

export { Kbd }
