import { format } from 'date-fns'
import { json2csv } from 'json-2-csv'
import { useMemo, useState } from 'react'
import { IconCodeDots, IconDownload, IconTable } from '@tabler/icons-react'

import { Button, Checkbox, List, ScrollArea, Space, Tabs, Text } from '@mantine/core'

import { processDataForExport } from 'utils'
import { useProject } from 'providers/project'
import type { Column } from 'providers/project'

const ColumnList = ({ columns }: { columns: Column[] }) => {
	return (
		<>
			<Text size="sm">Following columns will exported</Text>
			<Space h={16} />
			<ScrollArea
				h={240}
				py={16}
				style={{
					borderRadius: 4,
					border: '1px solid var(--mantine-color-gray-7)',
				}}
			>
				<List size="sm" type="ordered" withPadding>
					{columns.map(column => (
						<ColumnItem key={column.key} column={column} />
					))}
				</List>
			</ScrollArea>
		</>
	)
}

const ColumnItem = ({ column }: { column: Column }) => (
	<List.Item
		opacity={column.hidden ? 0.5 : 1}
		icon={<Checkbox.Indicator size="xs" checked={!column.hidden} />}
	>
		{column.title}
		{`${column.title !== column.key ? `(${column.key})` : ''}`}
	</List.Item>
)

type Tab = 'json' | 'csv'

const Content = () => {
	const [activeTab, setActiveTab] = useState<Tab>('json')

	const [shouldUseColumnTitle, setShouldUseColumnTitle] = useState(false)
	const [columns, rows] = useProject(state => [[...state.columns.values()], state.rows])

	const data = useMemo(
		() => processDataForExport(columns, rows, { useTitle: shouldUseColumnTitle }),
		[columns, rows, shouldUseColumnTitle]
	)

	const download = (type: Tab) => {
		let output = ''
		if (type === 'json') {
			output = JSON.stringify(data, null, 3)
		} else if (type === 'csv') {
			output = json2csv(data, { expandNestedObjects: false })
		}

		const blob = new Blob([output], { type: `text/${type}` })
		const a = document.createElement('a')
		a.href = window.URL.createObjectURL(blob)
		a.download = `undata_export_${format(new Date(), 'yyyy-MM-dd')}.${type}`
		const clickEvt = new MouseEvent('click', {
			view: window,
			bubbles: true,
			cancelable: true,
		})
		a.dispatchEvent(clickEvt)
		a.remove()
	}

	return (
		<Tabs value={activeTab} onChange={value => setActiveTab(value as Tab)}>
			<Tabs.List>
				<Tabs.Tab value="json" leftSection={<IconCodeDots size={18} />}>
					JSON
				</Tabs.Tab>
				<Tabs.Tab value="csv" leftSection={<IconTable size={16} />}>
					CSV
				</Tabs.Tab>
			</Tabs.List>
			<Space h={16} />
			<ColumnList columns={columns} />
			<Space h={16} />
			<Checkbox
				defaultChecked
				checked={shouldUseColumnTitle}
				label="Use custom title as column name"
				onChange={event => setShouldUseColumnTitle(event.currentTarget.checked)}
			/>
			<Space h={16} />
			<Button
				ml="auto"
				size="xs"
				color="green"
				variant="filled"
				onClick={() => download(activeTab)}
				leftSection={<IconDownload size={16} stroke={2} />}
			>
				Export
			</Button>
		</Tabs>
	)
}

export default Content
