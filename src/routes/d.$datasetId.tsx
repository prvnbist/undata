import { createFileRoute, redirect } from '@tanstack/react-router'

import { Workspace } from '@/components/shell/Workspace'
import { workspace } from '@/store/workspace'

export const Route = createFileRoute('/d/$datasetId')({
	beforeLoad: ({ params }) => {
		const { phase } = workspace.get()
		if (phase.kind === 'idle' || phase.id !== params.datasetId) throw redirect({ to: '/start' })
	},
	component: Workspace,
})
