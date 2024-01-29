import TextEditor from '@monaco-editor/react'

import { Center, Container, Loader } from '@mantine/core'

import useGlobalStore from '@/store/global'

const LoaderFn = () => (
   <Center w='100%' h='100%'>
      <Loader color='yellow' size='sm' />
   </Center>
)

const Editor = () => {
   const setIsEditorMounted = useGlobalStore(state => state.setIsEditorMounted)
   const [query, setQuery] = useGlobalStore(state => [state.query, state.setQuery])

   return (
      <TextEditor
         theme='vs-dark'
         defaultLanguage='sql'
         options={{
            fontLigatures: true,
            fontFamily: 'Fira Code',
            padding: { top: 16, bottom: 16 },
         }}
         value={query}
         onMount={() => setIsEditorMounted(true)}
         onChange={value => setQuery(value || '')}
         loading={
            <Container fluid w='100%' h='100%' bg='#1e1e1e' style={{ borderRadius: 8 }}>
               <LoaderFn />
            </Container>
         }
      />
   )
}

export default Editor
