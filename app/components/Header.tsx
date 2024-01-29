import { format } from 'sql-formatter'

import { ActionIcon, Button, CopyButton } from '@mantine/core'
import { IconCopy, IconPlayerPlayFilled, IconSparkles } from '@tabler/icons-react'

import { Row } from '@/types'
import { trpc } from '@/utils/trpc'
import { prepareTableData } from '@/utils'
import useGlobalStore from '@/store/global'
import { QUERY_FORMAT_OPTIONS } from '@/constants'

export const Header = () => {
   const isEditorMounted = useGlobalStore(state => state.isEditorMounted)
   const [query, setQuery] = useGlobalStore(state => [state.query, state.setQuery])

   const [setColumns, setRows, setTab, setError] = useGlobalStore(state => [
      state.setColumns,
      state.setRows,
      state.setTab,
      state.setError,
   ])

   const { mutate } = trpc.query.useMutation({
      onSuccess: ({ status, data, message = '' }) => {
         if (status === 'ERROR') {
            setError(message)
            setTab('errors')
            return
         }

         const { results = [], columns: schema } = data ?? {}

         setError('')
         setTab('results')
         prepareTableData(
            schema!,
            results as Row[],
            _rows => setRows(_rows),
            _columns => setColumns(_columns)
         )
      },
   })

   return (
      <header className='header'>
         <CopyButton value={query}>
            {({ copy }) => (
               <ActionIcon
                  size='lg'
                  title='Copy'
                  color='gray'
                  onClick={copy}
                  variant='default'
                  disabled={!isEditorMounted}
               >
                  <IconCopy size={16} />
               </ActionIcon>
            )}
         </CopyButton>
         <ActionIcon
            size='lg'
            title='Format'
            color='gray'
            variant='default'
            disabled={!isEditorMounted}
            onClick={() => setQuery(format(query!, QUERY_FORMAT_OPTIONS))}
         >
            <IconSparkles size={16} />
         </ActionIcon>
         <Button
            color='gray'
            variant='default'
            title='Run Query'
            disabled={!isEditorMounted}
            onClick={() => mutate({ query })}
            leftSection={<IconPlayerPlayFilled size={16} />}
         >
            Run
         </Button>
      </header>
   )
}

export default Header
