import { Outlet } from '@tanstack/react-router'

import { GlobalDrop } from './GlobalDrop'
import { Toast } from './Toast'
import { usePasteImport } from './usePasteImport'

// What every screen has around it.
export function AppFrame() {
	usePasteImport()

	return (
		<>
			<Outlet />
			<GlobalDrop />
			<Toast />
		</>
	)
}
