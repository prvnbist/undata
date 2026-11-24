import type { ReactNode } from 'react'

// A screen with one thing to say and something to do about it.
export function Notice({
	title,
	children,
	actions,
	alert = false,
}: {
	title: string
	children?: ReactNode
	actions: ReactNode
	alert?: boolean
}) {
	return (
		<main className="flex min-h-dvh items-center justify-center p-4">
			<section role={alert ? 'alert' : undefined} className="w-full max-w-lg space-y-4">
				<h1 className="text-xl font-semibold">{title}</h1>
				<div className="space-y-2 text-sm">{children}</div>
				<div className="flex flex-wrap gap-2 pt-2">{actions}</div>
			</section>
		</main>
	)
}
