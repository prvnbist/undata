import { json2csv } from 'json-2-csv'

import type { Column, Row } from '@/store/project'

export type ExportFormat = 'json' | 'csv'

export const processDataForExport = (
	columns: Column[],
	rows: Row[],
	{ useTitle }: { useTitle: boolean }
) =>
	rows.map(row => {
		const result: Row = {}

		for (const { key, title, hidden } of columns) {
			if (!hidden) result[useTitle ? (title ?? key) : key] = row[key] ?? ''
		}

		return result
	})

export const serialize = (data: Row[], format: ExportFormat) =>
	format === 'json'
		? JSON.stringify(data, null, 3)
		: json2csv(data, { expandNestedObjects: false })
