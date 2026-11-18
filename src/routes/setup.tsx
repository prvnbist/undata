import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/setup')({ component: Setup })

function Setup() {
	return <main className="p-4 text-2xl font-bold text-amber-500">Setup (placeholder)</main>
}
