import { ActionIcon, Group, Paper, Stack, Text } from '@mantine/core'
import { Dropzone, FileWithPath } from '@mantine/dropzone'
import { IconFile, IconPhoto, IconTrash, IconUpload, IconX } from '@tabler/icons-react'

const ICON_STATES = {
	accept: <IconUpload size={64} style={{ color: 'var(--mantine-color-blue-6)' }} stroke={1.5} />,
	reject: <IconX size={64} style={{ color: 'var(--mantine-color-red-6)' }} stroke={1.5} />,
	idle: <IconPhoto size={64} style={{ color: 'var(--mantine-color-dimmed)' }} stroke={1.5} />,
}

const FileUpload = ({
	accept,
	onFileSelect,
}: {
	onFileSelect: (file: FileWithPath) => void
	accept: { [key: string]: string[] } | string[]
}) => (
	<Dropzone
		accept={accept}
		multiple={false}
		maxSize={1024 ** 2}
		onDrop={files => onFileSelect(files[0])}
	>
		<Stack justify='center' align='center' gap='md' mih={220} style={{ pointerEvents: 'none' }}>
			<Dropzone.Accept>{ICON_STATES.accept}</Dropzone.Accept>
			<Dropzone.Reject>{ICON_STATES.reject}</Dropzone.Reject>
			<Dropzone.Idle>{ICON_STATES.idle}</Dropzone.Idle>
			<Stack align='center' gap='xs'>
				<Text size='xl' inline>
					Drag file here or click to select a file
				</Text>
				<Text size='sm' c='dimmed' inline mt={7}>
					File should not exceed 1mb
				</Text>
			</Stack>
		</Stack>
	</Dropzone>
)

const JSONSource = ({
	file,
	setFile,
}: {
	file: FileWithPath | null
	setFile: (file: FileWithPath | null) => void
}) => {
	if (file) {
		return (
			<Paper shadow='xs' radius='sm' withBorder p='md'>
				<Group justify='space-between'>
					<Group gap={4}>
						<IconFile size={18} />
						<Text>{file.name}</Text>
					</Group>
					<ActionIcon
						color='red.4'
						variant='subtle'
						title='Remove File'
						onClick={() => setFile(null)}
					>
						<IconTrash size={16} />
					</ActionIcon>
				</Group>
			</Paper>
		)
	}
	return <FileUpload accept={['application/json']} onFileSelect={setFile} />
}

const CSVSource = ({
	file,
	setFile,
}: {
	file: FileWithPath | null
	setFile: (file: FileWithPath | null) => void
}) => {
	if (file) {
		return (
			<Paper shadow='xs' radius='sm' withBorder p='md'>
				<Group justify='space-between'>
					<Group gap={4}>
						<IconFile size={18} />
						<Text>{file.name}</Text>
					</Group>
					<ActionIcon
						color='red.4'
						variant='subtle'
						title='Remove File'
						onClick={() => setFile(null)}
					>
						<IconTrash size={16} />
					</ActionIcon>
				</Group>
			</Paper>
		)
	}
	return <FileUpload accept={['text/csv']} onFileSelect={setFile} />
}

export { JSONSource, CSVSource }
