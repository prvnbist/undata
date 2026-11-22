const UNITS = ['B', 'KB', 'MB', 'GB'] as const

// Powers of ten, as file managers on most systems count.
export const formatBytes = (bytes: number) => {
	let value = bytes
	let unit = 0
	while (value >= 999.5 && unit < UNITS.length - 1) {
		value /= 1000
		unit++
	}
	return `${unit > 0 && value < 9.95 ? value.toFixed(1) : Math.round(value)} ${UNITS[unit]}`
}
