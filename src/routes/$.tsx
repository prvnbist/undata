import { createFileRoute, redirect } from '@tanstack/react-router'

// Any unknown path goes to `/`, whose guard decides between the results and `/setup`.
export const Route = createFileRoute('/$')({
	beforeLoad: () => {
		throw redirect({ to: '/' })
	},
})
