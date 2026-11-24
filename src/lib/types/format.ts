import type { DataType } from '@/lib/constants'

import { parse } from './parse'

const PLAIN_NUMBER = /^[+-]?\d+(?:\.(\d+))?$/
const EXPONENT_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)[eE][+-]?\d+$/

// Digits are kept exactly as written. A number is regrouped only when a double holds it without
// loss, otherwise the written text is shown.
const formatNumber = (text: string, language?: string) => {
	if (!language) return text
	const value = Number(text)

	try {
		const plain = PLAIN_NUMBER.exec(text)
		if (plain) {
			const decimals = plain[1]?.length ?? 0
			if (text.replace(/\D/g, '').length > 15 || decimals > 20) return text
			return new Intl.NumberFormat(language, {
				minimumFractionDigits: decimals,
				maximumFractionDigits: decimals,
			}).format(value)
		}
		if (EXPONENT_NUMBER.test(text) && Number.isFinite(value)) {
			return new Intl.NumberFormat(language, { maximumFractionDigits: 20 }).format(value)
		}
	} catch {
		// An unknown language falls through to the written text.
	}
	return text
}

const pad = (text: string) => text.padStart(2, '0')

// The text a cell shows. Total: a value that does not fit its type is shown as written. Dates and
// times keep the zone they were written in, so nothing depends on the browser's time zone.
export const formatValue = (type: DataType, input: string, language?: string): string => {
	const result = parse(type, input)
	if (!result.ok) return input

	const text = input.trim()
	switch (type) {
		case 'number':
			return formatNumber(text, language)
		case 'boolean':
			return String(result.value)
		case 'time':
		case 'timetz': {
			const [, hours, rest] = /^(\d{1,2}):(.*)$/.exec(text) ?? []
			return hours ? `${pad(hours)}:${rest}` : text
		}
		case 'timestamp':
		case 'timestamptz':
			return text.replace('T', ' ')
		default:
			return input
	}
}
