import type { EngineError, EngineRequest, EngineResponse } from './protocol'

type OkResponse = Extract<EngineResponse, { ok: true }>
type Ok<T extends OkResponse['type']> = Extract<OkResponse, { type: T }>
type Pending = { resolve: (response: EngineResponse) => void; reject: (error: EngineError) => void }
type RequestBody = EngineRequest extends infer R
	? R extends unknown
		? Omit<R, 'id'>
		: never
	: never

// Nothing here runs at module scope: the SPA shell is prerendered where there is no `Worker`.
export const createEngineClient = () => {
	const worker = new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' })
	const pending = new Map<number, Pending>()
	let next = 0

	worker.onmessage = ({ data }: MessageEvent<EngineResponse>) => {
		const entry = pending.get(data.id)
		if (!entry) return

		pending.delete(data.id)
		if (data.ok) entry.resolve(data)
		else entry.reject(data.error)
	}

	const call = <T extends OkResponse['type']>(body: RequestBody) =>
		new Promise<Ok<T>>((resolve, reject) => {
			const id = next++
			pending.set(id, { resolve: resolve as Pending['resolve'], reject })
			worker.postMessage({ ...body, id })
		})

	return {
		open: (file: File) => call<'opened'>({ type: 'open', file }),
		rows: async (start: number, end: number) =>
			(await call<'rows'>({ type: 'rows', start, end })).rows,
		terminate: () => worker.terminate(),
	}
}
