import { Suspense, lazy } from 'react'
import { IconMaximize } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { JSON_TEXT_EDITOR_OPTIONS } from '@/lib/constants'

// Monaco is only fetched when a popover opens, and never during the SPA shell prerender.
const TextEditor = lazy(() => import('@monaco-editor/react'))

export function JSONRenderer({ value }: { value: unknown }) {
	return (
		<div className="flex w-45 items-center justify-between">
			<span className="truncate text-sm">{JSON.stringify(value)}</span>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="ghost" size="icon-xs" title="View JSON" aria-label="View JSON">
						<IconMaximize size={14} />
					</Button>
				</PopoverTrigger>
				<PopoverContent side="bottom" className="w-85 p-0">
					<Suspense fallback={<div className="h-60" />}>
						<TextEditor
							height={240}
							theme="vs-dark"
							defaultLanguage="json"
							options={JSON_TEXT_EDITOR_OPTIONS}
							value={JSON.stringify(value, null, 3)}
						/>
					</Suspense>
				</PopoverContent>
			</Popover>
		</div>
	)
}
