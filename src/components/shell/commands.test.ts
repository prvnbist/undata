import { describe, expect, test, vi } from 'vite-plus/test'

import { buildCommands, matchCommands } from './commands'

const actions = () => ({
	open: vi.fn(),
	sample: vi.fn(),
	exportView: vi.fn(),
	goToColumn: vi.fn(),
	sort: vi.fn(),
	setHidden: vi.fn(),
	inspectColumn: vi.fn(),
})

const columns = [
	{ id: 'a', title: 'amount', hidden: false },
	{ id: 'b', title: 'status', hidden: true },
]

describe('buildCommands', () => {
	test('without a dataset, only ways to open one', () => {
		expect(buildCommands(actions(), null).map(command => command.id)).toEqual(['open', 'sample'])
	})

	test('with one, export and each column’s go to, details, sort and hide or show', () => {
		const ids = buildCommands(actions(), columns).map(command => command.id)
		expect(ids).toEqual([
			'open',
			'export',
			'go:a',
			'details:a',
			'asc:a',
			'desc:a',
			'hide:a',
			'go:b',
			'details:b',
			'asc:b',
			'desc:b',
			'show:b',
		])
	})

	test('commands call their action with the column', () => {
		const spies = actions()
		const commands = buildCommands(spies, columns)
		commands.find(command => command.id === 'desc:a')!.run()
		commands.find(command => command.id === 'show:b')!.run()
		commands.find(command => command.id === 'go:b')!.run()
		commands.find(command => command.id === 'details:a')!.run()
		expect(spies.inspectColumn).toHaveBeenCalledWith('a')
		expect(spies.sort).toHaveBeenCalledWith('a', true)
		expect(spies.setHidden).toHaveBeenCalledWith('b', false)
		expect(spies.goToColumn).toHaveBeenCalledWith('b')
	})
})

describe('matchCommands', () => {
	const commands = buildCommands(actions(), columns)
	const labels = (query: string) => matchCommands(commands, query).map(command => command.label)

	test('every word must match, in any order', () => {
		expect(labels('amount desc')).toEqual(['Sort by amount, descending'])
		expect(labels('desc amount')).toEqual(['Sort by amount, descending'])
		expect(labels('nothing')).toEqual([])
	})

	test('labels that start with the query come first, then keyword matches', () => {
		expect(labels('go')[0]).toBe('Go to amount')
		expect(labels('csv')).toEqual(['Export…'])
	})

	test('an empty query lists everything, up to the limit', () => {
		expect(matchCommands(commands, '  ')).toHaveLength(commands.length)
		expect(matchCommands(commands, '', 3)).toHaveLength(3)
	})
})
