import type { Column, Row } from 'providers/project'

export const extractColumns = (data: Record<string, any>) => {
	const columns: Map<string, Column> = new Map([])

	const keys = Object.keys(data)

	for (const key of keys) {
		if (!columns.has(key)) {
			columns.set(key, { key, title: key, data_type: 'text', hidden: false })
		}
	}

	return columns
}

const URL_REGEX = /^(?:(https?:\/\/)?(?:www\.)?)?([\w-]+(\.[\w-]+)+\/?)([^\s]*)$/

export const isURL = (input: string) => URL_REGEX.test(input)

export const extractURLName = (input: string) => {
	const match = input.match(/\/([^/]+)$/)
	return match ? match[1] : null
}

export const processDataForExport = (
	columns: Column[],
	rows: Row[],
	{ useTitle }: { useTitle: boolean }
) => {
	const columnMap = new Map(columns.map(column => [column.key, column]))

	const data = rows.map(row => {
		const result: Row = {}
		columnMap.forEach((column, key) => {
			const header = useTitle ? column.title ?? key : key
			if (!column?.hidden) result[header] = row[key] ?? ''
		})

		return result
	})

	return data
}
