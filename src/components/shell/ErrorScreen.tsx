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
					<Button variant="outline" asChild>
						{/* A full load, because whatever broke may still be in memory. */}
						<a href="/">Back to start</a>
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
