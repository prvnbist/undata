import * as React from 'react'
import { cn } from 'cn'
import { IconX } from '@tabler/icons-react'
import { Dialog as SheetPrimitive } from 'radix-ui'

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Content>) {
	return (
		<SheetPrimitive.Portal>
			<SheetPrimitive.Overlay
				data-slot="sheet-overlay"
				className="fixed inset-0 z-50 bg-black/60 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
			/>
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(
					'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-4 border-l bg-background p-6 shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right sm:max-w-md',
					className
				)}
				{...props}
			>
				{children}
				<SheetPrimitive.Close
					className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					aria-label="Close"
				>
					<IconX className="size-4" />
				</SheetPrimitive.Close>
			</SheetPrimitive.Content>
		</SheetPrimitive.Portal>
	)
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div data-slot="sheet-header" className={cn('flex flex-col gap-1.5', className)} {...props} />
	)
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn('font-heading text-xl', className)}
			{...props}
		/>
	)
}

function SheetDescription({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	)
}

export { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle }
