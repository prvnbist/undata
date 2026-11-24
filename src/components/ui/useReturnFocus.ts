import { useCallback, useLayoutEffect, useRef } from 'react'

// A dialog opened without its own Trigger gives focus back to nothing when it closes. This keeps what
// had focus as it opened (a layout effect runs before the dialog moves focus inside) and returns it.
export const useReturnFocus = (open: boolean) => {
	const returnTo = useRef<HTMLElement | null>(null)

	useLayoutEffect(() => {
		if (open && document.activeElement instanceof HTMLElement) {
			returnTo.current = document.activeElement
		}
	}, [open])

	// For `onCloseAutoFocus`. `keep` is false when focus has been put somewhere else on purpose.
	return useCallback((event: Event, keep = true) => {
		event.preventDefault()
		const target = returnTo.current
		returnTo.current = null
		if (keep && target?.isConnected) target.focus()
	}, [])
}
