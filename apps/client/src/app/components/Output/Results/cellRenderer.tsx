import { format } from 'date-fns'
import TextEditor from '@monaco-editor/react'
import { IconArrowUpRight, IconMaximize } from '@tabler/icons-react'

import { modals } from '@mantine/modals'
import {
	ActionIcon,
	BackgroundImage,
	Badge,
	Checkbox,
	Flex,
	Group,
	Popover,
	Text,
} from '@mantine/core'

import type { Column } from 'providers/project'
import { extractURLName, isURL } from 'utils'
import {
	DATE_DATA_TYPES,
	DATE_TYPES_FORMAT,
	JSON_DATA_TYPES,
	JSON_TEXT_EDITOR_OPTIONS,
	NUMERIC_DATA_TYPES,
	TIME_DATA_TYPES,
} from 'constants/index'

const BooleanRenderer = ({ value }: { value: boolean }) => (
	<Flex justify="center">
		<Checkbox readOnly checked={value} color="teal" size="xs" />
	</Flex>
)

const NumericRenderer = ({ value }: { value: number }) => {
	const { language } = navigator
	return (
		<Flex justify="right">
			{language ? new Intl.NumberFormat(language).format(value) : value}
		</Flex>
	)
}
const TimeRenderer = ({ value }: { value: string }) => <Flex justify="right">{value}</Flex>

const DateRenderer = ({ value, type }: { value: string; type: keyof typeof DATE_TYPES_FORMAT }) => (
	<Flex justify="right">{format(new Date(value), DATE_TYPES_FORMAT[type]!)}</Flex>
)

const JSONRenderer = ({ value }: { value: string }) => (
	<Flex w="180px" justify="space-between" align="center">
		<Text size="sm" truncate="end">
			{JSON.stringify(value)}
		</Text>
		<Popover withinPortal width={340} position="bottom" withArrow shadow="md">
			<Popover.Target>
				<ActionIcon size="sm" variant="subtle" color="gray" title="View JSON">
					<IconMaximize size={14} />
				</ActionIcon>
			</Popover.Target>
			<Popover.Dropdown p={0}>
				<TextEditor
					height={240}
					theme="vs-dark"
					defaultLanguage="json"
					options={JSON_TEXT_EDITOR_OPTIONS}
					value={JSON.stringify(value, null, 3)}
				/>
			</Popover.Dropdown>
		</Popover>
	</Flex>
)

const TagRenderer = ({ value }: { value: any[] }) => {
	let list: Array<any> = []

	if (!Array.isArray(value)) list = [value]

	if (list.length === 0) return null

	const firstThree = list.slice(0, 3)
	const remaining = list.slice(3)

	return (
		<Group w="240px" gap={4} py={3}>
			{firstThree.map(item => (
				<Badge key={item} variant="default" color="blue" size="sm">
					{item}
				</Badge>
			))}
			{remaining.length > 0 && (
				<Popover withinPortal width={280} position="bottom-end" shadow="md">
					<Popover.Target>
						<ActionIcon size="sm" variant="subtle" color="gray" title="View Options">
							<IconMaximize size={14} />
						</ActionIcon>
					</Popover.Target>
					<Popover.Dropdown p={4} px={4}>
						<Flex gap={4}>
							{remaining.map(item => (
								<Badge key={item} variant="default" color="blue" size="sm">
									{item}
								</Badge>
							))}
						</Flex>
					</Popover.Dropdown>
				</Popover>
			)}
		</Group>
	)
}

const URLRenderer = ({ value }: { value: string }) => {
	if (!value) return null
	if (!isURL(value)) return value

	return (
		<Flex w="180px" justify="space-between" align="center">
			<Text size="sm" truncate="end" c="blue" title={value}>
				{extractURLName(value)}
			</Text>
			<a href={value} target="_blank" rel="noopener noreferrer" style={{ height: '22px' }}>
				<ActionIcon size="sm" variant="subtle" color="blue">
					<IconArrowUpRight size={14} />
				</ActionIcon>
			</a>
		</Flex>
	)
}

const ImageRenderer = ({ value }: { value: string }) => {
	if (!value) return null

	const open = () => {
		modals.open({
			title: 'Image Preview',
			children: (
				<BackgroundImage
					src={value}
					radius="sm"
					style={{
						width: '100%',
						height: 280,
						backgroundSize: 'contain',
						backgroundRepeat: 'no-repeat',
					}}
				/>
			),
		})
	}
	return (
		<Flex align="center" py={4}>
			<BackgroundImage
				src={value}
				radius="sm"
				onClick={open}
				style={{ width: 28, height: 28 }}
			/>
		</Flex>
	)
}

const cellRenderer = (cell: any, type: Column['data_type']) => {
	const value = cell.getValue()

	if (!type) return value

	switch (true) {
		case type === 'text':
			return value
		case type === 'tag':
			return <TagRenderer value={value} />
		case type === 'url':
			return <URLRenderer value={value} />
		case type === 'image':
			return <ImageRenderer value={value} />
		case type === 'boolean':
			return <BooleanRenderer value={value} />
		case type in NUMERIC_DATA_TYPES:
			return <NumericRenderer value={value} />
		case type in TIME_DATA_TYPES:
			return <TimeRenderer value={value} />
		case type in DATE_DATA_TYPES:
			return <DateRenderer value={value} type={type} />
		case type in JSON_DATA_TYPES:
			return <JSONRenderer value={value} />
		default:
			return value
	}
}

export default cellRenderer
