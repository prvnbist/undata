import { useDisclosure } from '@mantine/hooks'
import { ActionIcon, Drawer, Flex, Tabs, Text } from '@mantine/core'
import { IconAdjustments, IconBug, IconChartLine, IconTable } from '@tabler/icons-react'

import useGlobalStore, { GlobalState } from '@/store/global'

import Results from './Results'
import ColumnsSettings from './ColumnsSettings'

const Output = () => {
   const [opened, { open, close }] = useDisclosure(false)

   const [rows, error] = useGlobalStore(state => [state.rows, state.error])
   const [tab, setTab] = useGlobalStore(state => [state.tab, state.setTab])

   return (
      <>
         <Tabs value={tab} onChange={value => setTab((value as GlobalState['tab']) ?? 'results')}>
            <Tabs.List>
               <Tabs.Tab
                  value='results'
                  disabled={rows.length === 0}
                  leftSection={<IconTable size={16} />}
               >
                  Results
               </Tabs.Tab>
               <Tabs.Tab disabled={!error} value='errors' leftSection={<IconBug size={16} />}>
                  Errors
               </Tabs.Tab>
               <Tabs.Tab disabled value='visualizations' leftSection={<IconChartLine size={16} />}>
                  Visualization
               </Tabs.Tab>
               <Flex align='center' justify='center' ml='auto'>
                  <ActionIcon
                     color='gray'
                     onClick={open}
                     title='Settings'
                     variant='subtle'
                     disabled={rows.length === 0}
                  >
                     <IconAdjustments size={16} />
                  </ActionIcon>
               </Flex>
            </Tabs.List>
            {rows.length > 0 && (
               <Tabs.Panel value='results' py={16}>
                  <Results />
               </Tabs.Panel>
            )}
            {error && (
               <Tabs.Panel value='errors' p={16}>
                  <Text size='md'>{error}</Text>
               </Tabs.Panel>
            )}
         </Tabs>
         <Drawer
            offset={8}
            radius='md'
            opened={opened}
            onClose={close}
            title='Settings'
            position='right'
         >
            <ColumnsSettings />
         </Drawer>
      </>
   )
}

export default Output
