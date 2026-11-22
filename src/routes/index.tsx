import { IconFileExport } from '@tabler/icons-react'
import { createFileRoute, redirect } from '@tanstack/react-router'

import { SettingsSheet } from '@/components/settings/SettingsSheet'
import { ResultsTable } from '@/components/results/ResultsTable'
import { Button } from '@/components/ui/button'
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
				{/* The sheet behind Export arrives in T10. */}
				<Button variant="outline" title="Export" disabled={!hasRows}>
					<IconFileExport /> Export
				</Button>
				<SettingsSheet />
			</div>
			{hasRows && <ResultsTable />}
		</main>
	)
}
