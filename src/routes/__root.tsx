import type { ReactNode } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import '@fontsource-variable/inter'
import '@fontsource-variable/bricolage-grotesque'
// Only weight 500 is loaded, so all monospace text renders at 500.
import '@fontsource/ibm-plex-mono/500.css'

import { ErrorScreen } from '@/components/shell/ErrorScreen'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{
				name: 'viewport',
				content: 'minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no',
			},
			{ title: 'Undata' },
		],
		links: [{ rel: 'stylesheet', href: appCss }],
	}),
	shellComponent: RootDocument,
	errorComponent: ErrorScreen,
})

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	)
}
