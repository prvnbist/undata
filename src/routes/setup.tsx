import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { CSVReader } from '@/components/setup/CSVReader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { useProject } from '@/store/project'
import type { Source } from '@/store/project'

export const Route = createFileRoute('/setup')({ component: Setup })

function Setup() {
	const navigate = useNavigate()
	const [source, setSource] = useState<Source>('csv')
	const initProject = useProject(state => state.initProject)

	return (
		<main className="flex justify-center px-4 pt-20">
			<Card className="w-full max-w-120">
				<CardHeader>
					<CardTitle className="text-2xl">Project Setup</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="source">Data Source</Label>
						<Select
							value={source ?? undefined}
							onValueChange={value => setSource(value as Source)}
						>
							<SelectTrigger id="source" className="w-full">
								<SelectValue placeholder="Select a data source" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="csv">CSV</SelectItem>
							</SelectContent>
						</Select>
					</div>
					{source === 'csv' && (
						<CSVReader
							onUpload={({ columns, rows }) => {
								initProject(source, columns, rows)
								void navigate({ to: '/' })
							}}
						/>
					)}
				</CardContent>
			</Card>
		</main>
	)
}
