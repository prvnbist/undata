import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { csv2json } from 'json-2-csv'
import { IconPhoto, IconTrash, IconUpload, IconX } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { extractColumns } from '@/lib/columns'
import type { Column, Row } from '@/store/project'

export function CSVReader({
	onUpload,
}: {
	onUpload: (data: { columns: Map<string, Column>; rows: Array<Row> }) => void
}) {
	const [file, setFile] = useState<File | null>(null)

	const { getRootProps, getInputProps, isDragAccept, isDragReject } = useDropzone({
		// The extension is listed too, because some systems report CSV as application/vnd.ms-excel.
		accept: { 'text/csv': ['.csv'] },
		maxSize: 1024 ** 2,
		multiple: false,
		onDrop: files => setFile(files[0] ?? null),
	})

	const create = async () => {
		if (!file) return

		try {
			const parsed = csv2json(await file.text(), { preventCsvInjection: true }) as Array<Row>

			if (!Array.isArray(parsed) || parsed.length === 0) return

			onUpload({ columns: extractColumns(parsed[0]!), rows: parsed })
		} catch (error) {
			console.log(error)
		}
	}

	const Icon = isDragReject ? IconX : isDragAccept ? IconUpload : IconPhoto

	return (
		<div className="space-y-4">
			<div
				{...getRootProps()}
				data-state={isDragReject ? 'reject' : isDragAccept ? 'accept' : 'idle'}
				className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-center transition-colors hover:bg-accent/30 data-[state=accept]:border-primary data-[state=accept]:text-primary data-[state=reject]:border-destructive data-[state=reject]:text-destructive"
			>
				<input {...getInputProps()} data-testid="csv-input" />
				<Icon className="size-13" stroke={1.5} />
				<p className="text-xl">Drag file here</p>
				<p className="text-sm text-muted-foreground">Upload a CSV file of size upto 1MB</p>
			</div>
			{file && (
				<Card className="flex-row items-center justify-between px-4 py-3">
					<span>{file.name}</span>
					<Button variant="outline" size="icon" title="Clear" onClick={() => setFile(null)}>
						<IconTrash size={18} />
					</Button>
				</Card>
			)}
			<Button className="w-full" onClick={create} disabled={!file}>
				Create Project
			</Button>
		</div>
	)
}
