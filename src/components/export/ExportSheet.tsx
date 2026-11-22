import { Suspense, lazy, useState } from 'react'
import { IconFileExport } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet'
import { useProject } from '@/store/project'

const ExportContent = lazy(() => import('./ExportContent'))

export function ExportSheet() {
	const hasRows = useProject(state => state.rows.length > 0)
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button variant="outline" title="Export" disabled={!hasRows} onClick={() => setOpen(true)}>
				<IconFileExport /> Export
			</Button>
			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent className="overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Export Results</SheetTitle>
						<SheetDescription className="sr-only">
							Download the results as JSON or CSV
						</SheetDescription>
					</SheetHeader>
					{open && (
						<Suspense fallback={null}>
							<ExportContent />
						</Suspense>
					)}
				</SheetContent>
			</Sheet>
		</>
	)
}
