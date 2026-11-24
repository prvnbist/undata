import type { ErrorComponentProps } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Notice } from './Notice'

// Shown in place of a screen that could not be drawn.
export function ErrorScreen({ error, reset }: ErrorComponentProps) {
	return (
		<Notice
			alert
			title="Something went wrong"
			actions={
				<>
					<Button onClick={reset}>Try again</Button>
					{/* A full load, because whatever broke may still be in memory. */}
					<Button variant="outline" render={<a href="/" />}>
						Back to start
					</Button>
				</>
			}
		>
			<p>Your file has not been changed. You can try again, or go back and open it anew.</p>
			<p className="font-mono break-words text-muted-foreground">
				{error instanceof Error ? error.message : String(error)}
			</p>
		</Notice>
	)
}
