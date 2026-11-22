export type EngineErrorCode = 'empty' | 'parse' | 'no-dataset'

export type EngineError = { code: EngineErrorCode; message: string }

export type EngineRequest =
	| { id: number; type: 'open'; file: File }
	| { id: number; type: 'rows'; start: number; end: number }

export type EngineResponse =
	| { id: number; ok: true; type: 'opened'; headers: string[]; rowCount: number }
	| { id: number; ok: true; type: 'rows'; rows: string[][] }
	| { id: number; ok: false; error: EngineError }
