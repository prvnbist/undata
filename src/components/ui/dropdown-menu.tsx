import { IconCheck, IconChevronRight, IconCircleFilled } from '@tabler/icons-react'
import { cn } from 'cn'
import { Menu as MenuPrimitive } from '@base-ui/react/menu'

const popupClass =
	'max-h-(--available-height) min-w-[8rem] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-popover outline-none duration-150 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98] data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98]'

const itemClass =
	"relative flex min-h-7 cursor-default items-center gap-2 rounded-sm py-1 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"

type Placement = Pick<
	MenuPrimitive.Positioner.Props,
	'align' | 'side' | 'sideOffset' | 'alignOffset' | 'anchor'
>

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
	return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
	return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
	className,
	align = 'start',
	side = 'bottom',
	sideOffset = 4,
	alignOffset = 0,
	anchor,
	...props
}: MenuPrimitive.Popup.Props & Placement) {
	return (
		<MenuPrimitive.Portal>
			<MenuPrimitive.Positioner
				className="z-50 outline-none"
				align={align}
				side={side}
				sideOffset={sideOffset}
				alignOffset={alignOffset}
				anchor={anchor}
			>
				<MenuPrimitive.Popup
					data-slot="dropdown-menu-content"
					className={cn(popupClass, className)}
					{...props}
				/>
			</MenuPrimitive.Positioner>
		</MenuPrimitive.Portal>
	)
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
	return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuItem({
	className,
	inset,
	variant = 'default',
	...props
}: MenuPrimitive.Item.Props & {
	inset?: boolean
	variant?: 'default' | 'destructive'
}) {
	return (
		<MenuPrimitive.Item
			data-slot="dropdown-menu-item"
			data-inset={inset}
			data-variant={variant}
			className={cn(
				itemClass,
				"px-2 data-inset:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 [&_svg:not([class*='text-'])]:text-muted-foreground",
				className
			)}
			{...props}
		/>
	)
}

function DropdownMenuCheckboxItem({
	className,
	children,
	closeOnClick = true,
	...props
}: MenuPrimitive.CheckboxItem.Props) {
	return (
		<MenuPrimitive.CheckboxItem
			data-slot="dropdown-menu-checkbox-item"
			closeOnClick={closeOnClick}
			className={cn(itemClass, 'pr-2 pl-8', className)}
			{...props}
		>
			<span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
				<MenuPrimitive.CheckboxItemIndicator>
					<IconCheck className="size-3.5" />
				</MenuPrimitive.CheckboxItemIndicator>
			</span>
			{children}
		</MenuPrimitive.CheckboxItem>
	)
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
	return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
}

// Choosing closes the menu, as a plain item does.
function DropdownMenuRadioItem({
	className,
	children,
	closeOnClick = true,
	...props
}: MenuPrimitive.RadioItem.Props) {
	return (
		<MenuPrimitive.RadioItem
			data-slot="dropdown-menu-radio-item"
			closeOnClick={closeOnClick}
			className={cn(itemClass, 'pr-2 pl-8', className)}
			{...props}
		>
			<span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
				<MenuPrimitive.RadioItemIndicator>
					<IconCircleFilled className="size-2" />
				</MenuPrimitive.RadioItemIndicator>
			</span>
			{children}
		</MenuPrimitive.RadioItem>
	)
}

// A heading for the menu, or for the group it is in.
function DropdownMenuLabel({
	className,
	inset,
	...props
}: React.ComponentProps<'div'> & { inset?: boolean }) {
	return (
		<div
			data-slot="dropdown-menu-label"
			data-inset={inset}
			className={cn(
				'px-2 pt-1.5 pb-1 text-xs font-medium text-subtle-foreground data-inset:pl-8',
				className
			)}
			{...props}
		/>
	)
}

function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
	return (
		<MenuPrimitive.Separator
			data-slot="dropdown-menu-separator"
			className={cn('-mx-1 my-1 h-px bg-border', className)}
			{...props}
		/>
	)
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
	return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
	className,
	inset,
	children,
	...props
}: MenuPrimitive.SubmenuTrigger.Props & { inset?: boolean }) {
	return (
		<MenuPrimitive.SubmenuTrigger
			data-slot="dropdown-menu-sub-trigger"
			data-inset={inset}
			className={cn(
				itemClass,
				"px-2 data-inset:pl-8 data-popup-open:bg-accent data-popup-open:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground",
				className
			)}
			{...props}
		>
			{children}
			<IconChevronRight className="ml-auto size-3.5 text-subtle-foreground" />
		</MenuPrimitive.SubmenuTrigger>
	)
}

function DropdownMenuSubContent({
	className,
	align = 'start',
	side = 'inline-end',
	sideOffset = 0,
	alignOffset = -4,
	...props
}: MenuPrimitive.Popup.Props & Placement) {
	return (
		<MenuPrimitive.Portal>
			<MenuPrimitive.Positioner
				className="z-50 outline-none"
				align={align}
				side={side}
				sideOffset={sideOffset}
				alignOffset={alignOffset}
			>
				<MenuPrimitive.Popup
					data-slot="dropdown-menu-sub-content"
					className={cn(popupClass, className)}
					{...props}
				/>
			</MenuPrimitive.Positioner>
		</MenuPrimitive.Portal>
	)
}

export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
}
