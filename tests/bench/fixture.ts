export const FIXTURE_HEADER = 'id,name,city,amount,active,joined,url,note'

// 8 columns of mixed data, about 106 MB at 1M rows. Built in parts so no single string is huge.
export const makeFixture = (rows: number) => {
	const parts: string[] = [FIXTURE_HEADER + '\n']
	const step = 10_000

	for (let from = 0; from < rows; from += step) {
		let part = ''
		for (let i = from; i < Math.min(rows, from + step); i++) {
			part += `${i},Person ${i},City${i % 500},${((i * 1.37) % 9999).toFixed(2)},${i % 2 === 0},2024-0${(i % 9) + 1}-1${i % 9},https://example.com/p/${i},"some, quoted text ${i % 1000}"\n`
		}
		parts.push(part)
	}

	return new File(parts, 'fixture.csv', { type: 'text/csv' })
}

// 10 keys with a nested list and 1% integers too big for a double. About 116 MB at 560k records.
export const makeJsonFixture = (rows: number, kind: 'json' | 'ndjson') => {
	const parts: string[] = [kind === 'json' ? '[\n' : '']
	const step = 10_000

	for (let from = 0; from < rows; from += step) {
		let part = ''
		for (let i = from; i < Math.min(rows, from + step); i++) {
			const record = `{"id":${i},"name":"Person ${i}","city":"City${i % 500}","amount":${((i * 1.37) % 9999).toFixed(2)},"active":${i % 2 === 0},"joined":"2024-0${(i % 9) + 1}-1${i % 9}","url":"https://example.com/p/${i}","note":"some, quoted text ${i % 1000}","tags":["a","b${i % 7}"],"big":${i % 100 === 0 ? '12345678901234567890' : i}}`
			part += kind === 'json' ? (i === 0 ? '' : ',\n') + record : record + '\n'
		}
		parts.push(part)
	}

	if (kind === 'json') parts.push('\n]')
	return new File(parts, `fixture.${kind}`, { type: 'application/json' })
}
