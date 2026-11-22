import { describe, expect, test } from 'vite-plus/test'

import { createScheduler, PRIORITY } from './scheduler'

const setup = () => {
	const deferred: (() => void)[] = []
	const log: string[] = []
	const scheduler = createScheduler(next => deferred.push(next))
	const task = (name: string, priority: number, canDrop = false) => ({
		priority,
		run: () => void log.push(name),
		...(canDrop ? { superseded: () => void log.push(`drop ${name}`) } : {}),
	})

	return {
		log,
		scheduler,
		task,
		step: () => deferred.shift()?.(),
		drain: () => {
			while (deferred.length > 0) deferred.shift()!()
		},
	}
}

describe('createScheduler', () => {
	test('runs the most urgent first, and in order within a priority', () => {
		const { log, scheduler, task, drain } = setup()
		scheduler.add(task('export', PRIORITY.export))
		scheduler.add(task('stats', PRIORITY.stats))
		scheduler.add(task('q1', PRIORITY.query))
		scheduler.add(task('q2', PRIORITY.query))
		drain()

		expect(log).toEqual(['q1', 'q2', 'stats', 'export'])
	})

	test('a query that arrives between stats goes next', () => {
		const { log, scheduler, task, step, drain } = setup()
		for (const name of ['s1', 's2', 's3']) scheduler.add(task(name, PRIORITY.stats))
		step()
		scheduler.add(task('query', PRIORITY.query))
		drain()

		expect(log).toEqual(['s1', 'query', 's2', 's3'])
	})

	test('superseding drops what allows it and keeps the rest', () => {
		const { log, scheduler, task, drain } = setup()
		scheduler.add(task('old query', PRIORITY.query, true))
		scheduler.add(task('set types', PRIORITY.query))
		scheduler.supersede()
		scheduler.add(task('new query', PRIORITY.query, true))
		drain()

		expect(log).toEqual(['drop old query', 'set types', 'new query'])
	})

	test('a task that throws does not stop the ones after it', () => {
		const { log, scheduler, task, step, drain } = setup()
		scheduler.add({
			priority: 0,
			run: () => {
				throw new Error('x')
			},
		})
		scheduler.add(task('after', 1))

		expect(step).toThrow('x')
		drain()
		expect(log).toEqual(['after'])
	})
})
