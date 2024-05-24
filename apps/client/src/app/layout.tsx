import React from 'react'
import type { PropsWithChildren } from 'react'

import { ModalsProvider } from '@mantine/modals'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'

import '@mantine/core/styles.css'

import theme from 'theme'
import ProjectProvider from 'providers/project'

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		<html lang="en">
			<head>
				<title>Undata</title>
				<ColorSchemeScript defaultColorScheme="dark" />
				<meta
					name="viewport"
					content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
				/>
			</head>
			<body>
				<MantineProvider defaultColorScheme="dark" theme={theme}>
					<ModalsProvider>
						<ProjectProvider>{children}</ProjectProvider>
					</ModalsProvider>
				</MantineProvider>
			</body>
		</html>
	)
}
