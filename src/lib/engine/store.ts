// Column-major store of source text. Cells are never converted, so what is read back is what was read in.
export const createColumnStore = () => {
	let headers: string[] | null = null
	let columns: string[][] = []
	let rows = 0

	return {
		append(records: string[][]) {
			let start = 0

			if (headers === null) {
				if (records.length === 0) return
				headers = records[0]!
				columns = headers.map(() => [])
				start = 1
			}

			for (let r = start; r < records.length; r++) {
				const record = records[r]!
				for (let c = 0; c < columns.length; c++) columns[c]!.push(record[c] ?? '')
				rows++
			}
		},
		rowCount: () => rows,
		column: (index: number) => columns[index] ?? [],
		headers: () => headers ?? [],
		window(start: number, end: number) {
			const from = Math.max(0, start)
			const to = Math.min(rows, end)
			const out: string[][] = []

			for (let r = from; r < to; r++) out.push(columns.map(column => column[r]!))

			return out
		},
	}
}
