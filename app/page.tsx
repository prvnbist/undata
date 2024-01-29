'use client'

import { Container } from '@mantine/core'

import { trpc } from '@/utils/trpc'
import useGlobalStore from '@/store/global'

import { Editor, Header, Output, Schema } from './components'

export default function Home() {
   const setMetadata = useGlobalStore(state => state.setMetadata)

   trpc.metadata.useQuery(undefined, {
      retry: 3,
      queryKey: ['metadata', undefined],
      onSuccess: data => setMetadata(data),
   })

   return (
      <Container fluid h='100vh' p={16} className='container'>
         <header className='header'>
            <Header />
         </header>
         <section className='editor'>
            <Editor />
         </section>
         <aside className='schema'>
            <Schema />
         </aside>
         <main className='output'>
            <Output />
         </main>
      </Container>
   )
}
