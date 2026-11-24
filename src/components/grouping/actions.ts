import { aggregateKey } from '@/lib/engine/group'
import type { GroupRow } from '@/lib/engine/group'
import type { AggregateFn, Filter, Grouping } from '@/lib/engine/view'
import { applyView } from '@/store/session'
import { workspace } from '@/store/workspace'

const NONE: Grouping = { by: [], aggregates: [], sort: [] }

// A grouping by no column is no grouping at all.
export const setGrouping = (change: (grouping: Grouping) => Grouping) => {
	const { view } = workspace.get()
	const next = change(view.grouping ?? NONE)
	return applyView({ ...view, grouping: next.by.length ? next : null })
}

export const ungroup = () => applyView({ ...workspace.get().view, grouping: null })

export const toggleGroupBy = (columnId: string) =>
	setGrouping(grouping =>
		grouping.by.includes(columnId)
			? {
					...grouping,
					by: grouping.by.filter(id => id !== columnId),
					sort: grouping.sort.filter(key => key.key !== columnId),
				}
			: { ...grouping, by: [...grouping.by, columnId] }
	)

export const toggleAggregate = (columnId: string, fn: AggregateFn) =>
	setGrouping(grouping => {
		const key = aggregateKey({ columnId, fn })
		const has = grouping.aggregates.some(aggregate => aggregateKey(aggregate) === key)
		return has
			? {
					...grouping,
					aggregates: grouping.aggregates.filter(aggregate => aggregateKey(aggregate) !== key),
					sort: grouping.sort.filter(sort => sort.key !== key),
				}
			: { ...grouping, aggregates: [...grouping.aggregates, { columnId, fn }] }
	})

// Ascending, descending, then back to the grouped columns' order.
export const cycleGroupSort = (key: string) =>
	setGrouping(grouping => {
		const current = grouping.sort.length === 1 ? grouping.sort[0] : undefined
		const sort =
			current?.key !== key ? [{ key, desc: false }] : current.desc ? [] : [{ key, desc: true }]
		return { ...grouping, sort }
	})

// The filters that find a group's rows: its text in each grouped column, or that column empty.
export const groupFilters = (by: string[], row: GroupRow): Filter[] =>
	by.map((columnId, i) =>
		row.empty[i] ? { columnId, op: 'empty' } : { columnId, op: 'anyOf', values: [row.keys[i]!] }
	)

// The group to focus once the summary is back.
let returning: number | null = null
export const takeReturning = () => {
	const index = returning
	returning = null
	return index
}

// Added to the filters there are, so the rows are those of the group as it was shown.
export const openGroup = (row: GroupRow) => {
	const { view } = workspace.get()
	if (!view.grouping) return Promise.resolve()
	const known = new Set(view.filters.map(filter => JSON.stringify(filter)))
	const added = groupFilters(view.grouping.by, row).filter(
		filter => !known.has(JSON.stringify(filter))
	)
	const done = applyView({ ...view, filters: [...view.filters, ...added], grouping: null })
	workspace.set({ drilledFrom: view })
	returning = row.index
	return done
}

export const backToGroups = () => {
	const { drilledFrom } = workspace.get()
	return drilledFrom ? applyView(drilledFrom) : Promise.resolve()
}
