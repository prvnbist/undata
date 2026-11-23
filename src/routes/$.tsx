import { createFileRoute, redirect } from '@tanstack/react-router'

// Any unknown path, `/setup` and `/start` from before included, goes to the start screen.
export const Route = createFileRoute('/$')({
	beforeLoad: () => {
		throw redirect({ to: '/' })
	},
})
