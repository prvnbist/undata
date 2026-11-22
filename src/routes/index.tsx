import { createFileRoute, redirect } from '@tanstack/react-router'

import { useProject } from '@/store/project'

export const Route = createFileRoute('/')({
	beforeLoad: () => {
		if (!useProject.getState().metadata.source) throw redirect({ to: '/setup' })
	},
	component: Index,
})

function Index() {
	return <main className="p-4 text-2xl font-bold text-amber-500">Results (placeholder)</main>
}
