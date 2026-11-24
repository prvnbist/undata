import { useRef } from 'react'
import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { useOpenDataset } from './useOpenDataset'

// A button that asks for a file and opens it.
export function OpenFileButton({ children, ...props }: ComponentProps<typeof Button>) {
	const input = useRef<HTMLInputElement>(null)
	const open = useOpenDataset()

	return (
		<>
			<Button {...props} onClick={() => input.current?.click()}>
				{children}
			</Button>
			<input
				ref={input}
				type="file"
				aria-label="Data file"
				className="sr-only"
				tabIndex={-1}
				onChange={event => {
					const file = event.target.files?.[0]
					// Cleared so that choosing the same file again is a change.
					event.target.value = ''
					if (file) open({ blob: file, name: file.name })
				}}
			/>
		</>
	)
}
