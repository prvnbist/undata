import type { ReactNode } from 'react'

import { ImageRenderer } from './ImageRenderer'
import { JSONRenderer } from './JSONRenderer'
import { TagRenderer } from './TagRenderer'
import { BooleanRenderer } from './BooleanRenderer'
import { DateRenderer } from './DateRenderer'
import { NumericRenderer } from './NumericRenderer'
import { TimeRenderer } from './TimeRenderer'
import { URLRenderer } from './URLRenderer'
import {
	DATE_DATA_TYPES,
	JSON_DATA_TYPES,
	NUMERIC_DATA_TYPES,
	TIME_DATA_TYPES,
} from '@/lib/constants'
import type { Column, Row } from '@/store/project'

// Dispatches on the column's data type. Types without a renderer yet show the raw value.
export function renderCell(value: Row[string], type: Column['data_type']): ReactNode {
	if (!type) return String(value ?? '')

	if (type === 'text') return <span className="text-sm text-nowrap">{String(value ?? '')}</span>
	if (type === 'url') return <URLRenderer value={String(value ?? '')} />
	if (type === 'tag') return <TagRenderer value={value} />
	if (type === 'image') return <ImageRenderer value={String(value ?? '')} />
	if (type in JSON_DATA_TYPES) return <JSONRenderer value={value} />
	if (type === 'boolean') return <BooleanRenderer value={value === true || value === 'true'} />
	if (type in NUMERIC_DATA_TYPES) return <NumericRenderer value={Number(value)} />
	if (type in TIME_DATA_TYPES) return <TimeRenderer value={String(value ?? '')} />
	if (type in DATE_DATA_TYPES) {
		return (
			<DateRenderer value={String(value ?? '')} type={type as keyof typeof DATE_DATA_TYPES} />
		)
	}

	return String(value ?? '')
}
