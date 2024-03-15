export type Source = 'JSON' | 'CSV'

export type DataType = 'number' | 'date' | 'boolean' | 'text'

export type View = 'CHART' | 'TABLE'

export interface Column {
	id: string
	title: string
	data_type: DataType
}
