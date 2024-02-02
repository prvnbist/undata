import { useDisclosure } from '@mantine/hooks'
import { ActionIcon, Drawer, Flex, Tabs, Text } from '@mantine/core'
import {
   IconAdjustments,
   IconBug,
   IconChartLine,
   IconFileExport,
   IconTable,
} from '@tabler/icons-react'

import useGlobalStore, { GlobalState } from '@/store/global'

import Results from './Results'
import ExportResults from './ExportResults'
import ColumnsSettings from './ColumnsSettings'

const Output = () => {
   const [
      isColumnSettingsModalOpen,
      { open: openColumnSettingsModal, close: closeColumnSettingsModal },
   ] = useDisclosure(false)
   const [
      isExportResultsModalOpen,
      { open: openExportResultsModal, close: closeExportResultsModal },
   ] = useDisclosure(false)

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
               <Flex align='center' justify='center' gap={4} ml='auto'>
                  <ActionIcon
                     color='gray'
                     title='Export'
                     variant='subtle'
                     disabled={rows.length === 0}
                     onClick={openExportResultsModal}
                  >
                     <IconFileExport size={16} />
                  </ActionIcon>
                  <ActionIcon
                     color='gray'
                     title='Settings'
                     variant='subtle'
                     disabled={rows.length === 0}
                     onClick={openColumnSettingsModal}
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
            position='right'
            title='Export Results'
            opened={isExportResultsModalOpen}
            onClose={closeExportResultsModal}
         >
            <ExportResults />
         </Drawer>
         <Drawer
            offset={8}
            radius='md'
            title='Settings'
            position='right'
            opened={isColumnSettingsModalOpen}
            onClose={closeColumnSettingsModal}
         >
            <ColumnsSettings />
         </Drawer>
      </>
   )
}

export default Output
