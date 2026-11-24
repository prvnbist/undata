// Read at call time, never at module scope, because the shell prerenders outside a browser.
export const isMac = () =>
	typeof navigator !== 'undefined' && /Mac|iP(?:hone|ad|od)/.test(navigator.platform)

// The modifier key shortcuts use here: ⌘ on Apple devices, Ctrl elsewhere.
export const modKey = () => (isMac() ? '⌘' : 'Ctrl')
