import type { Column } from '@/store/project'

export const extractColumns = (data: Record<string, unknown>) => {
	const columns = new Map<string, Column>()

	for (const key of Object.keys(data)) {
		columns.set(key, { key, title: key, data_type: 'text', hidden: false })
	}

	return columns
}
