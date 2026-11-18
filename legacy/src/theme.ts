'use client'

import { IBM_Plex_Mono, Inter, Bricolage_Grotesque } from 'next/font/google'

import { createTheme } from '@mantine/core'
import type { MantineThemeOverride } from '@mantine/core'

const inter = Inter({ subsets: ['latin'] })
const bricolage_grotesque = Bricolage_Grotesque({ subsets: ['latin'] })
const ibm_plex_mono = IBM_Plex_Mono({ weight: '500', subsets: ['latin'] })

const theme: MantineThemeOverride = createTheme({
	primaryShade: 4,
	autoContrast: true,
	primaryColor: 'yellow',
	fontFamily: inter.style.fontFamily,
	fontFamilyMonospace: ibm_plex_mono.style.fontFamily,
	headings: {
		fontWeight: '400',
		fontFamily: bricolage_grotesque.style.fontFamily,
	},
})

export default theme
