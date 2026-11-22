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
