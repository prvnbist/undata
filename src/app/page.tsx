import { Container, Flex, Space } from '@mantine/core'

import { Export, Settings } from '@/components'

import Output from './components/Output'

export default async function Index() {
	return (
		<Container fluid py={16}>
			<Flex h="100%" justify="end" align="center" gap={16}>
				<Export />
				<Settings />
			</Flex>
			<Space h={16} />
			<Output />
		</Container>
	)
}
