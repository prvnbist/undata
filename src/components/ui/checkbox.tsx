import { cn } from 'cn'
import { IconCheck } from '@tabler/icons-react'
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'

// A native button, so a sibling `<label htmlFor>` names it.
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			nativeButton
			render={<button type="button" />}
			className={cn(
				'peer size-3.5 shrink-0 rounded-[4px] border border-foreground/25 transition-[background-color,border-color,box-shadow] duration-150 outline-none hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground',
				className
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="flex items-center justify-center text-current"
			>
				<IconCheck className="size-3" stroke={3} />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	)
}

export { Checkbox }
