import { cn } from 'cn'
import { Popover as PopoverPrimitive } from '@base-ui/react/popover'

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
	className,
	align = 'center',
	side = 'bottom',
	sideOffset = 4,
	alignOffset = 0,
	...props
}: PopoverPrimitive.Popup.Props &
	Pick<PopoverPrimitive.Positioner.Props, 'align' | 'side' | 'sideOffset' | 'alignOffset'>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner
				className="z-50"
				align={align}
				side={side}
				sideOffset={sideOffset}
				alignOffset={alignOffset}
			>
				<PopoverPrimitive.Popup
					data-slot="popover-content"
					className={cn(
						'w-72 origin-(--transform-origin) rounded-lg border bg-popover p-3 text-popover-foreground shadow-popover outline-hidden duration-150 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98]',
						className
					)}
					{...props}
				/>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	)
}

export { Popover, PopoverContent, PopoverTrigger }
