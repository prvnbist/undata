'use client'

import dynamic from 'next/dynamic'
import { IconFileExport } from '@tabler/icons-react'

import { useDisclosure } from '@mantine/hooks'
import { Button, Drawer } from '@mantine/core'

import { useProject } from '@/providers/project'

const Content = dynamic(() => import('./content'))

const Export = () => {
	const rows = useProject(state => state.rows)

	const [isOpen, { open, close }] = useDisclosure(false)
	return (
		<>
			<Button
				title="Export"
				onClick={open}
				variant="default"
				disabled={rows.length === 0}
				leftSection={<IconFileExport size={16} />}
			>
				Export
			</Button>
			<Drawer
				offset={8}
				radius="md"
				opened={isOpen}
				onClose={close}
				position="right"
				title="Export Results"
			>
				{isOpen && <Content />}
			</Drawer>
		</>
	)
}

export default Export
