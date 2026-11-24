import { cn } from 'cn'

// The mark: a yellow square with a grid cut into it.
export function Logo({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 16 16"
			aria-hidden
			className={cn('size-4 shrink-0 text-primary', className)}
			fill="currentColor"
			fillRule="evenodd"
		>
			<path d="M3 1h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2Zm0 4.5V7h4.25V5.5H3Zm5.75 0V7H13V5.5H8.75ZM3 8.5V10h4.25V8.5H3Zm5.75 0V10H13V8.5H8.75Z" />
		</svg>
	)
}
