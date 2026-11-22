import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { IconCodeDots, IconDownload, IconTable } from '@tabler/icons-react'

import { downloadFile } from './download'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { processDataForExport, serialize } from '@/lib/export'
import type { ExportFormat } from '@/lib/export'
import { useProject } from '@/store/project'
import type { Column } from '@/store/project'

function ColumnItem({ column }: { column: Column }) {
	return (
		<li className={column.hidden ? 'opacity-50' : undefined}>
			<span className="inline-flex items-center gap-2">
				<Checkbox
					checked={!column.hidden}
					aria-readonly
					tabIndex={-1}
					className="pointer-events-none size-3.5"
				/>
				<span>
					{column.title}
					{column.title !== column.key && ` (${column.key})`}
				</span>
			</span>
		</li>
	)
}

export default function ExportContent() {
	const [activeTab, setActiveTab] = useState<ExportFormat>('json')
	const [useTitle, setUseTitle] = useState(false)

	// Select the stored references only; the array is derived below.
	const columnMap = useProject(state => state.columns)
	const rows = useProject(state => state.rows)
	const columns = useMemo(() => [...columnMap.values()], [columnMap])

	const data = useMemo(
		() => processDataForExport(columns, rows, { useTitle }),
		[columns, rows, useTitle]
	)

	const download = () =>
		downloadFile(
			`undata_export_${format(new Date(), 'yyyy-MM-dd')}.${activeTab}`,
			serialize(data, activeTab),
			`text/${activeTab}`
		)

	return (
		<div className="space-y-4">
			<Tabs value={activeTab} onValueChange={value => setActiveTab(value as ExportFormat)}>
				<TabsList>
					<TabsTrigger value="json">
						<IconCodeDots /> JSON
					</TabsTrigger>
					<TabsTrigger value="csv">
						<IconTable /> CSV
					</TabsTrigger>
				</TabsList>
			</Tabs>
			<p className="text-sm">Following columns will be exported</p>
			<ScrollArea className="h-60 rounded-md border">
				<ol className="list-decimal space-y-1 py-4 pr-4 pl-10 text-sm marker:text-muted-foreground">
					{columns.map(column => (
						<ColumnItem key={column.key} column={column} />
					))}
				</ol>
			</ScrollArea>
			<div className="flex items-center gap-2">
				<Checkbox
					id="use-title"
					checked={useTitle}
					onCheckedChange={value => setUseTitle(value === true)}
				/>
				<Label htmlFor="use-title">Use custom title as column name</Label>
			</div>
			<div className="flex justify-end">
				<Button size="sm" onClick={download}>
					<IconDownload /> Export
				</Button>
			</div>
		</div>
	)
}
