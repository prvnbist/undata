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

	if (data.length === 0) return columns

	const keys = Object.keys(data[0])

	keys.forEach(key => {
		if (!columns.has(key)) {
			columns.set(key, { id: key, title: key, data_type: 'text' })
		}
	})

	return columns
}

export const greetings = () => {
	const timeNow = new Date().getHours()
	let greeting

	if (timeNow >= 5 && timeNow < 12) {
		greeting = 'Good Morning 🌅'
	} else if (timeNow >= 12 && timeNow < 18) {
		greeting = 'Good Afternoon ☀️'
	} else if (timeNow >= 18 && timeNow < 21) {
		greeting = 'Good Evening 🌄'
	} else if (timeNow >= 21) {
		greeting = 'Good Night 🌑'
	}
	return greeting
}
