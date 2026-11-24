import * as React from 'react'
import { cn } from 'cn'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				'h-8 w-full min-w-0 rounded-md border border-input bg-secondary/60 px-2.5 py-1 text-sm transition-[color,background-color,border-color,box-shadow] duration-150 outline-none selection:bg-primary/25 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-subtle-foreground hover:border-foreground/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
				'focus-visible:border-ring/60 focus-visible:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/20',
				'aria-invalid:border-destructive aria-invalid:ring-destructive/30',
				className
			)}
			{...props}
		/>
	)
}

export { Input }
