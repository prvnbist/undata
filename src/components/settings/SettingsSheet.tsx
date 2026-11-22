import { Suspense, lazy, useState } from 'react'
import { IconAdjustments } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { useProject } from '@/store/project'

const ColumnsSettings = lazy(() => import('./ColumnsSettings'))

export function SettingsSheet() {
	const hasRows = useProject(state => state.rows.length > 0)
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button
				variant="outline"
				title="Settings"
				disabled={!hasRows}
				onClick={() => setOpen(true)}
			>
				<IconAdjustments /> Settings
			</Button>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent className="overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Settings</SheetTitle>
						<SheetDescription className="sr-only">
							Reorder, hide and configure columns
						</SheetDescription>
					</SheetHeader>
					{open && (
						<Suspense fallback={null}>
							<ColumnsSettings />
						</Suspense>
					)}
				</SheetContent>
			</Sheet>
		</>
	)
}
