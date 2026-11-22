/// <reference lib="webworker" />
import Papa from 'papaparse'

import { createColumnStore } from '@/lib/engine/store'
import type { EngineRequest, EngineResponse } from './protocol'

let store = createColumnStore()

const reply = (response: EngineResponse) => postMessage(response)

const open = (id: number, file: File) => {
	if (file.size === 0) {
		reply({ id, ok: false, error: { code: 'empty', message: 'The file is empty' } })
		return
	}

	store = createColumnStore()

	// Papa only takes over `onmessage` inside its own blob worker, so it is safe to call from here.
	Papa.parse<string[]>(file, {
		worker: false,
		skipEmptyLines: true,
		chunk: ({ data }) => store.append(data),
		complete: () =>
			reply({
				id,
				ok: true,
				type: 'opened',
				headers: store.headers(),
				rowCount: store.rowCount(),
			}),
		error: error => reply({ id, ok: false, error: { code: 'parse', message: error.message } }),
	})
}

self.onmessage = ({ data }: MessageEvent<EngineRequest>) => {
	if (data.type === 'open') return open(data.id, data.file)

	reply({ id: data.id, ok: true, type: 'rows', rows: store.window(data.start, data.end) })
}
