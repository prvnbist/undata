export const SAMPLE_NAME = 'sample-orders.csv'

const CUSTOMERS = [
	'Ada Lovelace',
	'Grace Hopper',
	'Linus Torvalds',
	'Margaret Hamilton',
	'Dennis Ritchie',
	'Barbara Liskov',
	'Edsger Dijkstra',
	'Radia Perlman',
]
const STATUSES = ['paid', 'paid', 'paid', 'shipped', 'shipped', 'refunded', 'pending']
const CITIES = ['Lisbon', 'Nairobi', 'Oslo', 'Pune', 'Quito', 'Toronto']
const TAGS = ['gift', 'express', 'repeat', 'wholesale']

const quote = (text: string) => `"${text.replaceAll('"', '""')}"`

// Always the same numbers, so the sample is the same for everyone.
const createRandom = (seed: number) => () => {
	seed = (seed * 1664525 + 1013904223) % 4294967296
	return seed / 4294967296
}

// Orders with a little of everything: types, gaps, and one bad batch whose amounts
// do not fit. The batch is between the places inference looks at, as it would be in real life.
export const makeSample = (rows = 2500) => {
	const random = createRandom(7)
	const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!
	const lines = ['order_id,customer,status,amount,paid,ordered_at,website,tags,address']

	for (let i = 0; i < rows; i++) {
		const customer = pick(CUSTOMERS)
		const status = pick(STATUSES)
		const amount =
			i > 400 && i < 900 && random() < 0.02 ? 'n/a' : (5 + random() ** 3 * 900).toFixed(2)
		const day = new Date(Date.UTC(2024, 0, 1) + Math.floor(random() * 365 * 86_400) * 1000)
		const tags = TAGS.filter(() => random() < 0.3)
		const address = JSON.stringify({
			city: pick(CITIES),
			zip: String(10_000 + Math.floor(random() * 80_000)),
			gate: random() < 0.5 ? null : { code: Math.floor(random() * 900) + 100, floor: 1 },
		})

		lines.push(
			[
				String(i + 1).padStart(5, '0'),
				customer,
				random() < 0.04 ? '' : status,
				amount,
				status === 'pending' ? 'false' : 'true',
				random() < 0.03 ? '' : day.toISOString(),
				`https://example.com/customers/${customer.split(' ')[0]!.toLowerCase()}`,
				tags.length === 0 ? '' : quote(`[${tags.map(tag => `'${tag}'`).join(', ')}]`),
				quote(address),
			].join(',')
		)
	}

	return lines.join('\n') + '\n'
}
