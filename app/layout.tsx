'use client'

import React from 'react'

import { ColorSchemeScript, MantineProvider } from '@mantine/core'

import { theme } from 'theme'

import '@mantine/core/styles.css'
import 'styles/global.css'
import { TrpcProvider } from '@/utils/provider'

export default function RootLayout({ children }: { children: any }) {
   return (
      <html lang='en'>
         <head>
            <ColorSchemeScript defaultColorScheme='dark' />
            <title>Ledger</title>
            <meta
               name='viewport'
               content='minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no'
            />
         </head>
         <body>
            <TrpcProvider>
               <MantineProvider theme={theme} defaultColorScheme='dark'>
                  {children}
               </MantineProvider>
            </TrpcProvider>
         </body>
      </html>
   )
}
