'use client'

import React from 'react'

import { ModalsProvider } from '@mantine/modals'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'

import { theme } from 'theme'

import '@mantine/core/styles.css'
import 'styles/global.css'
import { TrpcProvider } from '@/utils/trpc/provider'

export default function RootLayout({ children }: { children: any }) {
   return (
      <html lang='en'>
         <head>
            <ColorSchemeScript defaultColorScheme='dark' />
            <title>Undata</title>
            <meta
               name='viewport'
               content='minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no'
            />
         </head>
         <body>
            <TrpcProvider>
               <MantineProvider theme={theme} defaultColorScheme='dark'>
                  <ModalsProvider>{children}</ModalsProvider>
               </MantineProvider>
            </TrpcProvider>
         </body>
      </html>
   )
}
