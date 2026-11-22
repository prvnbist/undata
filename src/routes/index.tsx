import { IconAdjustments, IconFileExport } from '@tabler/icons-react'
import { createFileRoute, redirect } from '@tanstack/react-router'

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
				{/* The sheets behind these buttons arrive in T8 and T10. */}
				<Button variant="outline" title="Export" disabled={!hasRows}>
					<IconFileExport /> Export
				</Button>
				<Button variant="outline" title="Settings" disabled={!hasRows}>
					<IconAdjustments /> Settings
				</Button>
			</div>
			{hasRows && <ResultsTable />}
		</main>
	)
}
