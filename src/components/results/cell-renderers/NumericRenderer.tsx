import { formatNumber } from '@/lib/format'

export function NumericRenderer({ value }: { value: number }) {
	return (
		<div className="flex justify-end">
			<span className="font-mono text-sm">{formatNumber(value, navigator.language)}</span>
		</div>
	)
}
