// What a waiting task is worth. A new view always goes before work for the old one.
export const PRIORITY = { query: 0, rows: 1, stats: 2, export: 3 } as const

type Task = { priority: number; run: () => void; superseded?: () => void }

// Runs one task, then hands control back so that messages which arrived meanwhile can add more urgent
// ones or replace what is waiting. `defer` must let the message queue run before it calls back.
export const createScheduler = (defer: (next: () => void) => void) => {
	const waiting: Task[] = []
	let scheduled = false

	const pump = () => {
		scheduled = false
		let best = 0
		for (let i = 1; i < waiting.length; i++) {
			if (waiting[i]!.priority < waiting[best]!.priority) best = i
		}

		const [task] = waiting.splice(best, 1)
		if (waiting.length > 0) schedule()
		task?.run()
	}

	const schedule = () => {
		if (scheduled) return
		scheduled = true
		defer(pump)
	}

	return {
		add(task: Task) {
			waiting.push(task)
			schedule()
		},
		// Drops waiting tasks that can be superseded, such as the query before this one and the stats
		// asked for it.
		supersede() {
			for (let i = waiting.length - 1; i >= 0; i--) {
				const { superseded } = waiting[i]!
				if (!superseded) continue
				waiting.splice(i, 1)
				superseded()
			}
		},
	}
}
