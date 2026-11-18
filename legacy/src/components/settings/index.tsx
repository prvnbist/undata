'use client'

import dynamic from 'next/dynamic'
import { IconAdjustments } from '@tabler/icons-react'

import { useDisclosure } from '@mantine/hooks'
import { Button, Drawer } from '@mantine/core'

import { useProject } from '@/providers/project'

const ColumnsSettings = dynamic(() => import('./ColumnsSettings'))

export const Settings = () => {
	const rows = useProject(state => state.rows)

	const [isOpen, { open, close }] = useDisclosure(false)
	return (
		<>
			<Button
				onClick={open}
				title="Settings"
				variant="default"
				disabled={rows.length === 0}
				leftSection={<IconAdjustments size={16} />}
			>
				Settings
			</Button>
			<Drawer
				offset={8}
				radius="md"
				title="Settings"
				position="right"
				opened={isOpen}
				onClose={close}
			>
				{isOpen && <ColumnsSettings />}
			</Drawer>
		</>
	)
}

export default Settings
