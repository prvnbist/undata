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
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
	return (
		<DialogPrimitive.Portal>
			<DialogPrimitive.Overlay
				data-slot="dialog-overlay"
				className="fixed inset-0 z-50 bg-black/60 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
			/>
			<DialogPrimitive.Content
				data-slot="dialog-content"
				className={cn(
					'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-md border bg-background p-6 shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:max-w-md',
					className
				)}
				{...props}
			>
				{children}
				<DialogPrimitive.Close
					className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					aria-label="Close"
				>
					<IconX className="size-4" />
				</DialogPrimitive.Close>
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
			className={cn('font-heading text-lg leading-none', className)}
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
