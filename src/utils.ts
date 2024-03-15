import { Column } from './types'

export const chunk = <T>(array: T[], size: number): T[][] => {
	if (!array.length) {
		return []
	}
	const head = array.slice(0, size)
	const tail = array.slice(size)
	return [head, ...chunk(tail, size)]
}

export const prepareColumns = (data: { [key in string]: any }[]) => {
	const columns: Map<string, Column> = new Map([])
	const keys = Object.keys(data[0])

	keys.forEach(key => {
		if (!columns.has(key)) {
			columns.set(key, { id: key, title: key, data_type: 'text' })
		}
	})

	return columns
}
