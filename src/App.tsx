import { IconPlus } from '@tabler/icons-react'

import { modals, ModalsProvider } from '@mantine/modals'
import { Button, Container, Divider, MantineProvider, Space, Title } from '@mantine/core'

import '@fontsource-variable/inter'
import '@fontsource-variable/unbounded'
import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css'
import '@mantine/charts/styles.css'

import { theme } from '@/theme'
import { AddCellModal, Cells } from '@/components'

export default function App() {
	return (
		<MantineProvider theme={theme} defaultColorScheme='dark'>
			<ModalsProvider>
				<Container pt={80} size='lg'>
					<Title order={2}>Greetings👋🏽</Title>
					<Space h={24} />
					<Cells />
					<Space h={16} />
					<Divider
						labelPosition='center'
						label={
							<Button
								size='xs'
								variant='subtle'
								rightSection={<IconPlus size={18} />}
								onClick={() => {
									modals.open({
										size: 'xl',
										title: 'Add Cell',
										children: <AddCellModal />,
									})
								}}
							>
								Add Cell
							</Button>
						}
					/>
				</Container>
			</ModalsProvider>
		</MantineProvider>
	)
}
