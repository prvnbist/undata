import { createFileRoute, redirect } from '@tanstack/react-router'

import { ExportSheet } from '@/components/export/ExportSheet'
import { SettingsSheet } from '@/components/settings/SettingsSheet'
import { ResultsTable } from '@/components/results/ResultsTable'
import { useProject } from '@/store/project'

export const Route = createFileRoute('/')({
	beforeLoad: () => {
		if (!useProject.getState().metadata.source) throw redirect({ to: '/setup' })
	},
	component: Index,
})

function Index() {
	const hasRows = useProject(state => state.rows.length > 0)

	return (
		<main className="space-y-4 p-4">
			<div className="flex justify-end gap-2">
				<ExportSheet />
				<SettingsSheet />
			</div>
			{hasRows && <ResultsTable />}
		</main>
	)
}
