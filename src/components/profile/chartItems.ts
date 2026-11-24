import type { DataType } from '@/lib/constants'
import type { ColumnStats } from '@/lib/engine/stats'
import type { Filter } from '@/lib/engine/view'

export type ChartItem = {
	key: string
	// What the bar is, for its tooltip and for assistive tech.
	label: string
	count: number
	// Height against the tallest bar, 0 to 1.
	share: number
	tone: 'value' | 'empty' | 'malformed'
	filter: Filter
}

const TOP = 8
const inEnglish = new Intl.NumberFormat('en')
const rows = (count: number) => `${inEnglish.format(count)} ${count === 1 ? 'row' : 'rows'}`

const SHOWN = 24
const quote = (text: string) =>
	`“${text.length > SHOWN ? `${text.slice(0, SHOWN).trimEnd()}…` : text}”`

// The bars of a column's chart: its histogram, or its most common values, and then its empty and
// malformed cells. Each one is the filter a click on it adds.
export const chartItems = (stats: ColumnStats, type: DataType, columnId: string): ChartItem[] => {
	if (stats.rows === 0) return []
	const items: Omit<ChartItem, 'share'>[] = stats.histogram
		? stats.histogram.map(({ min, max, includeMax, count }, i) => ({
				key: `bin:${i}`,
				label: `${min} to ${max}: ${rows(count)}`,
				count,
				tone: 'value',
				filter: { columnId, op: 'between', min, max, includeMax },
			}))
		: stats.top.slice(0, TOP).map(({ value, count }) => ({
				key: `top:${value}`,
				label: `${quote(value)}: ${rows(count)}`,
				count,
				tone: 'value',
				filter: { columnId, op: 'anyOf', values: [value] },
			}))

	if (stats.empty > 0) {
		items.push({
			key: 'empty',
			label: `Empty: ${rows(stats.empty)}`,
			count: stats.empty,
			tone: 'empty',
			filter: { columnId, op: 'empty' },
		})
	}
	if (stats.malformed > 0 && type !== 'text') {
		items.push({
			key: 'malformed',
			label: `Not valid: ${rows(stats.malformed)}`,
			count: stats.malformed,
			tone: 'malformed',
			filter: { columnId, op: 'malformed' },
		})
	}

	const tallest = Math.max(1, ...items.map(item => item.count))
	return items.map(item => ({ ...item, share: item.count / tallest }))
}

const percent = (part: number, whole: number) => {
	const value = (part / whole) * 100
	return value > 0 && value < 1 ? '<1%' : `${Math.round(value)}%`
}

// The chart in a sentence, for those who cannot see it.
export const chartSummary = (stats: ColumnStats) => {
	if (stats.rows === 0) return 'No rows.'
	const parts: string[] = []
	if (stats.range) parts.push(`From ${stats.range.min} to ${stats.range.max}.`)
	else if (stats.distinct > 0) {
		const common = stats.top[0] ? `, most often ${quote(stats.top[0].value)}` : ''
		parts.push(
			`${inEnglish.format(stats.distinct)} distinct ${stats.distinct === 1 ? 'value' : 'values'}${common}.`
		)
	}
	if (stats.empty > 0) parts.push(`${percent(stats.empty, stats.rows)} empty.`)
	if (stats.malformed > 0) parts.push(`${percent(stats.malformed, stats.rows)} not valid.`)
	return parts.join(' ') || 'All empty.'
}
