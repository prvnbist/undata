import * as React from 'react'
import { cn } from 'cn'
import { IconX } from '@tabler/icons-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay
				data-slot="dialog-overlay"
				className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
			/>
			<DialogPrimitive.Content
				data-slot="dialog-content"
				className={cn(
					'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border bg-popover p-5 shadow-popover outline-none duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] sm:max-w-md',
					className
				)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						className="absolute top-3.5 right-3.5 flex size-6 items-center justify-center rounded-sm text-subtle-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
						aria-label="Close"
					>
						<IconX className="size-4" />
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</DialogPrimitive.Portal>
	)
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div data-slot="dialog-header" className={cn('flex flex-col gap-2', className)} {...props} />
	)
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn('text-base leading-none font-medium tracking-tight', className)}
			{...props}
		/>
	)
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	)
}

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle }
