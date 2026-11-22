import type { ReactNode } from 'react'

import type { Column, Row } from '@/store/project'

// Dispatches on the column's data type. Types without a renderer yet show the raw value.
export function renderCell(value: Row[string], type: Column['data_type']): ReactNode {
	switch (type) {
		case 'text':
			return <span className="text-sm text-nowrap">{String(value ?? '')}</span>
		default:
			return String(value ?? '')
	}
}
