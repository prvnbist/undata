import { useCallback, useLayoutEffect, useRef } from 'react'

// A dialog opened without its own Trigger keeps what had focus as it opened (a layout effect runs
// before the dialog moves focus inside) and gives focus back to it on close.
export const useReturnFocus = (open: boolean) => {
	const returnTo = useRef<HTMLElement | null>(null)

	useLayoutEffect(() => {
		if (open && document.activeElement instanceof HTMLElement) {
			returnTo.current = document.activeElement
		}
	}, [open])

	// For `finalFocus`. `keep` is false when focus is being put somewhere else on purpose.
	return useCallback((keep = true): HTMLElement | boolean => {
		const target = returnTo.current
		returnTo.current = null
		if (!keep) return false
		return target?.isConnected ? target : true
	}, [])
}
