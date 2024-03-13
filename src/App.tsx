import { MantineProvider, Text, Title } from '@mantine/core'

import { theme } from './theme'
import '@fontsource-variable/inter'
import '@fontsource-variable/unbounded'
import '@mantine/core/styles.css'

export default function App() {
	return (
		<MantineProvider theme={theme} defaultColorScheme='dark'>
			<Title order={2}>Hello World!</Title>
			<Text>hi there!</Text>
		</MantineProvider>
	)
}
