import { cn } from 'cn'
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

// A native button, so a sibling `<label htmlFor>` names it.
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			nativeButton
			render={<button type="button" />}
			className={cn(
				'peer inline-flex h-4 w-7 shrink-0 items-center rounded-full border border-transparent transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary data-unchecked:bg-foreground/20',
				className
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className="pointer-events-none block size-3 rounded-full bg-white shadow-sm ring-0 transition-transform data-checked:translate-x-[calc(100%+1px)] data-unchecked:translate-x-px"
			/>
		</SwitchPrimitive.Root>
	)
}

export { Switch }
