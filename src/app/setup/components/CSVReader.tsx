import { useState } from 'react'
import { csv2json } from 'json-2-csv'
import { IconPhoto, IconTrash, IconUpload, IconX } from '@tabler/icons-react'

import { Dropzone } from '@mantine/dropzone'
import type { FileWithPath } from '@mantine/dropzone'
import { ActionIcon, Button, Card, Center, Group, Space, Stack, Text, rem } from '@mantine/core'

import { extractColumns } from '@/utils'
import type { Column, Row } from '@/providers/project'

const CSVReader = ({
	onUpload,
}: {
	onUpload: (data: { columns: Map<string, Column>; rows: Array<Row> }) => void
}) => {
	const [file, setFile] = useState<FileWithPath | null>(null)

	const create = () => {
		if (!file) return

		const reader = new FileReader()

		reader.onloadend = evt => {
			const content = (evt.target?.result as string) ?? ''

			try {
				const parsed = csv2json(content, { preventCsvInjection: true }) as Array<Row>

				if (!Array.isArray(parsed) || parsed.length === 0) return

				const columns = extractColumns(parsed[0]!)

				onUpload({ columns, rows: parsed })
			} catch (error) {
				console.log(error)
			}
		}

		reader.readAsText(file)
	}

	return (
		<>
			<Dropzone
				accept={['text/csv']}
				maxSize={1024 ** 2}
				onDrop={files => setFile(files?.[0] ?? null)}
			>
				<Center mih={220}>
					<Stack align="center" style={{ pointerEvents: 'none' }}>
						<Dropzone.Accept>
							<IconUpload
								style={{
									width: rem(52),
									height: rem(52),
									color: 'var(--mantine-color-blue-6)',
								}}
								stroke={1.5}
							/>
						</Dropzone.Accept>
						<Dropzone.Reject>
							<IconX
								style={{
									width: rem(52),
									height: rem(52),
									color: 'var(--mantine-color-red-6)',
								}}
								stroke={1.5}
							/>
						</Dropzone.Reject>
						<Dropzone.Idle>
							<IconPhoto
								style={{
									width: rem(52),
									height: rem(52),
									color: 'var(--mantine-color-dimmed)',
								}}
								stroke={1.5}
							/>
						</Dropzone.Idle>
						<Stack gap={4} align="center">
							<Text size="xl" inline>
								Drag file here
							</Text>
							<Text size="sm" c="dimmed" inline mt={7}>
								Upload a CSV file of size upto 1MB
							</Text>
						</Stack>
					</Stack>
				</Center>
			</Dropzone>
			{file && (
				<>
					<Space h={16} />
					<Card withBorder shadow="md">
						<Group justify="space-between">
							<Text>{file.name}</Text>
							<ActionIcon variant="default" title="Clear" onClick={() => setFile(null)}>
								<IconTrash size={18} />
							</ActionIcon>
						</Group>
					</Card>
				</>
			)}
			<Space h={16} />
			<Button fullWidth onClick={create} disabled={!file}>
				Create Project
			</Button>
		</>
	)
}

export default CSVReader
