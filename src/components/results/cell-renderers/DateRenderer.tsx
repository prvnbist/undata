import { formatDate } from '@/lib/format'
import type { DATE_DATA_TYPES } from '@/lib/constants'

export function DateRenderer({
	value,
	type,
}: {
	value: string
	type: keyof typeof DATE_DATA_TYPES
}) {
	return <div className="flex justify-end text-sm">{formatDate(value, type)}</div>
}
