import type { DataType } from '@/lib/constants'
import { generateTags } from '@/lib/tags'

// Empty text is checked before parsing, so an empty value is never reported as malformed.
export type ParseResult<T> = { ok: true; value: T } | { ok: false }

const ok = <T>(value: T): ParseResult<T> => ({ ok: true, value })
const bad: ParseResult<never> = { ok: false }

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/
const BOOLEANS = new Map([
	...['true', 't', 'yes', 'y', '1'].map(word => [word, true] as const),
	...['false', 'f', 'no', 'n', '0'].map(word => [word, false] as const),
])

const TIME = String.raw`(\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?`
const ZONE = String.raw`(Z|[+-]\d{2}(?::?\d{2})?)`
// A bare time may omit the leading zero of the hour. Inside a timestamp it may not.
const LOOSE_TIME = TIME.replace(String.raw`(\d{2})`, String.raw`(\d{1,2})`)
const TIME_ONLY = new RegExp(`^${LOOSE_TIME}$`)
const TIME_ZONED = new RegExp(`^${LOOSE_TIME}${ZONE}$`)
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/
const STAMP = new RegExp(String.raw`^(\d{4})-(\d{2})-(\d{2})[T ]${TIME}$`)
const STAMP_ZONED = new RegExp(String.raw`^(\d{4})-(\d{2})-(\d{2})[T ]${TIME}${ZONE}$`)

// Date.UTC reads years 0 to 99 as 1900 to 1999, so the year is set separately.
const utcDay = (year: number, month: number, day: number) =>
	new Date(0).setUTCFullYear(year, month - 1, day)

const daysIn = (year: number, month: number) => new Date(utcDay(year, month + 1, 0)).getUTCDate()

const validDate = (year: number, month: number, day: number) =>
	month >= 1 && month <= 12 && day >= 1 && day <= daysIn(year, month)

// Seconds may carry a fraction. 24:00 and a 60th minute are rejected.
const secondsOfDay = (hours: string, minutes: string, seconds = '0') => {
	const h = Number(hours)
	const m = Number(minutes)
	const s = Number(seconds)
	return h < 24 && m < 60 && s < 60 ? h * 3600 + m * 60 + s : null
}

// The offset in seconds east of UTC, or null if it cannot exist.
const offsetSeconds = (zone: string) => {
	if (zone === 'Z') return 0
	const digits = zone.slice(1).replace(':', '')
	const hours = Number(digits.slice(0, 2))
	const minutes = Number(digits.slice(2) || '0')
	if (hours > 23 || minutes > 59) return null
	return (zone[0] === '-' ? -1 : 1) * (hours * 3600 + minutes * 60)
}

const parseTime = (text: string): ParseResult<number> => {
	const match = TIME_ONLY.exec(text)
	const seconds = match && secondsOfDay(match[1]!, match[2]!, match[3])
	return seconds === null || seconds === undefined || !match ? bad : ok(seconds)
}

const parseTimeZoned = (text: string): ParseResult<number> => {
	const match = TIME_ZONED.exec(text)
	if (!match) return bad
	const seconds = secondsOfDay(match[1]!, match[2]!, match[3])
	const offset = offsetSeconds(match[4]!)
	if (seconds === null || offset === null) return bad
	return ok((((seconds - offset) % 86400) + 86400) % 86400)
}

const parseDate = (text: string): ParseResult<number> => {
	const match = DATE_ONLY.exec(text)
	if (!match) return bad
	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
	return validDate(year, month, day) ? ok(utcDay(year, month, day)) : bad
}

// Without a zone the wall-clock time is read as UTC, so sorting needs no local zone. With one, the
// value is the instant.
const parseStamp = (text: string, zoned: boolean): ParseResult<number> => {
	const match = (zoned ? STAMP_ZONED : STAMP).exec(text)
	if (!match) return bad
	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
	const seconds = secondsOfDay(match[4]!, match[5]!, match[6])
	const offset = zoned ? offsetSeconds(match[7]!) : 0
	if (seconds === null || offset === null || !validDate(year, month, day)) return bad
	return ok(utcDay(year, month, day) + Math.round((seconds - offset) * 1000))
}

const parseJson = (text: string): ParseResult<unknown> => {
	if (!/^[[{]/.test(text)) return bad
	try {
		return ok(JSON.parse(text))
	} catch {
		return bad
	}
}

// Only http and https are links. A bare domain is read as https, so `javascript:`, `data:` and
// friends can never reach an href or an img src.
const parseLink = (text: string): ParseResult<string> => {
	const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text)
	if (hasScheme && !/^https?:\/\//i.test(text)) return bad
	if (!hasScheme && !/^(?:[\w-]+\.)+[a-z\w-]{2,}(?:[/?#]\S*)?$/i.test(text)) return bad

	try {
		const url = new URL(hasScheme ? text : `https://${text}`)
		return url.protocol === 'http:' || url.protocol === 'https:' ? ok(url.href) : bad
	} catch {
		return bad
	}
}

const parseTags = (text: string): ParseResult<string[]> =>
	text === ''
		? bad
		: ok(
				generateTags(text).map(tag =>
					typeof tag === 'string' ? tag : (JSON.stringify(tag) ?? '')
				)
			)

// Total: never throws. A value that does not fit the type is `ok: false`.
export const parse = (type: DataType, input: string): ParseResult<unknown> => {
	if (type === 'text') return ok(input)

	const text = input.trim()
	if (text === '') return bad

	switch (type) {
		case 'number': {
			const value = Number(text)
			if (!NUMBER.test(text) || !Number.isFinite(value)) return bad
			// An integer a double cannot hold is an id, and reading it as a number would lose digits. With
			// an exponent it is a measurement, and was never exact to the digit.
			const lossy = Number.isInteger(value) && !Number.isSafeInteger(value) && !/e/i.test(text)
			return lossy ? bad : ok(value)
		}
		case 'boolean': {
			const value = BOOLEANS.get(text.toLowerCase())
			return value === undefined ? bad : ok(value)
		}
		case 'time':
			return parseTime(text)
		case 'timetz':
			return parseTimeZoned(text)
		case 'date':
			return parseDate(text)
		case 'timestamp':
			return parseStamp(text, false)
		case 'timestamptz':
			return parseStamp(text, true)
		case 'json':
			return parseJson(text)
		case 'url':
		case 'image':
			return parseLink(text)
		case 'tag':
			return parseTags(text)
	}
}
