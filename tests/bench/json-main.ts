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

export const runJsonBench = async (rows: number, kind: 'json' | 'ndjson') => {
	const file = makeJsonFixture(rows, kind)
	await new Promise(resolve => setTimeout(resolve, 50))

	const worker = new Worker(new URL('./json.worker.ts', import.meta.url), { type: 'module' })
	const result = await new Promise<Record<string, unknown>>(resolve => {
		worker.onmessage = ({ data }) => resolve(data)
		worker.postMessage({ file, kind })
	})
	return { kind, fileMB: Math.round(file.size / 1e6), ...result }
}
