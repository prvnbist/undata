import { useState } from 'react'

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'

// The URL is data, so the background image is the one place an inline style is needed.
const backdrop = (src: string) => ({ backgroundImage: `url("${src.replace(/["\\\n]/g, '\\$&')}")` })

export function ImageRenderer({ value }: { value: string }) {
	const [open, setOpen] = useState(false)

	if (!value) return null

	return (
		<>
			<button
				type="button"
				title="Preview"
				aria-label="Open image preview"
				onClick={() => setOpen(true)}
				className="my-1 block size-7 cursor-pointer rounded-md bg-cover bg-center"
				style={backdrop(value)}
			/>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Image Preview</DialogTitle>
						<DialogDescription className="sr-only">
							A larger view of the image
						</DialogDescription>
					</DialogHeader>
					<div
						role="img"
						aria-label="Image preview"
						className="h-70 w-full rounded-md bg-contain bg-center bg-no-repeat"
						style={backdrop(value)}
					/>
				</DialogContent>
			</Dialog>
		</>
	)
}
