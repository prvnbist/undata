import { Checkbox } from '@/components/ui/checkbox'

export function BooleanRenderer({ value }: { value: boolean }) {
	return (
		<div className="flex justify-center">
			<Checkbox
				checked={value}
				aria-readonly
				tabIndex={-1}
				className="pointer-events-none"
				onCheckedChange={() => {}}
			/>
		</div>
	)
}
