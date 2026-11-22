import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/setup')({ component: Setup })

function Setup() {
	return (
		<main className="space-y-4 p-4">
			<h1 className="text-2xl">Setup (placeholder)</h1>
			<Button>Create Project</Button>
		</main>
	)
}
