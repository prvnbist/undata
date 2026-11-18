import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Index })

function Index() {
	return <main className="p-4 text-2xl font-bold text-amber-500">Results (placeholder)</main>
}
