import { createFileRoute, redirect } from '@tanstack/react-router'

import { Workspace } from '@/components/shell/Workspace'
import { loadDataset } from '@/lib/storage/datasets'
import { importDataset } from '@/store/session'
import { workspace } from '@/store/workspace'

// The dataset, if it was saved. Blocked storage is the same as not having it.
const stored = (id: string) => loadDataset(id).catch(() => null)

export const Route = createFileRoute('/d/$datasetId')({
	beforeLoad: async ({ params }) => {
		const { phase } = workspace.get()
		if (phase.kind !== 'idle' && phase.id === params.datasetId) return

		const found = await stored(params.datasetId)
		if (!found) throw redirect({ to: '/' })

		const { record, blob } = found
		importDataset({
			blob,
			name: record.name,
			id: record.id,
			options: record.options,
			setup: record.setup,
			view: record.view,
			known: true,
		})
	},
	component: Workspace,
})
