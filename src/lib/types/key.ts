import type { DataType } from '@/lib/constants'

const pad = (value: number, length = 2) => String(value).padStart(length, '0')

const clock = (seconds: number) => {
	// Whole milliseconds, so that 0.1 + 0.2 does not become a seventeen-digit fraction.
	const ms = Math.round(seconds * 1000)
	const whole = Math.floor(ms / 1000)
	const fraction = ms % 1000
	const text = `${pad(Math.floor(whole / 3600))}:${pad(Math.floor(whole / 60) % 60)}:${pad(whole % 60)}`
	return fraction === 0 ? text : `${text}.${pad(fraction, 3)}`
}

// The opposite of parsing: text that reads back as this key under this type.
export const keyToText = (type: DataType, key: number): string => {
	switch (type) {
		case 'boolean':
			return key === 1 ? 'true' : 'false'
		case 'date':
			return new Date(key).toISOString().slice(0, 10)
		case 'timestamp':
			return new Date(key)
				.toISOString()
				.replace('T', ' ')
				.replace(/(\.000)?Z$/, '')
		case 'timestamptz':
			return new Date(key).toISOString().replace('T', ' ').replace('.000Z', 'Z')
		case 'time':
			return clock(key)
		case 'timetz':
			return `${clock(key)}Z`
		default:
			return String(key)
	}
}
