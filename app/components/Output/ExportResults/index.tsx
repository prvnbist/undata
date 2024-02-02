import { format } from 'date-fns'
import { json2csv } from 'json-2-csv'
import { useMemo, useState } from 'react'
import { IconCheck, IconCodeDots, IconDownload, IconTable, IconX } from '@tabler/icons-react'
import { Button, Checkbox, Flex, List, ScrollArea, Space, Tabs, Text } from '@mantine/core'

import { Column, Row } from '@/types'
import useGlobalStore from '@/store/global'

const processData = (columns: Column[], rows: Row[], { useTitle }: { useTitle: boolean }) => {
   const columnMap = new Map(columns.map(column => [column.id, column]))

   const data = rows.map(row => {
      const result: Row = {}
      columnMap.forEach((column, key) => {
         const header = useTitle ? column.title ?? key : key
         if (!column?.hidden) result[header] = row[key]
      })

      return result
   })

   return data
}

const ColumnsToExport = () => {
   const columns = useGlobalStore(state => state.columns)

   return (
      <>
         <Text size='sm'>Following columns will exported</Text>
         <Space h={16} />
         <ScrollArea
            h={240}
            py={16}
            style={{
               borderRadius: 4,
               border: '1px solid var(--mantine-color-gray-7)',
            }}
         >
            <List size='sm' type='ordered' withPadding>
               {columns.map(column => (
                  <List.Item
                     key={column.id}
                     opacity={column.hidden ? 0.5 : 1}
                     icon={
                        column.hidden ? (
                           <IconX stroke={3} style={{ width: 16, height: 16, display: 'block' }} />
                        ) : (
                           <IconCheck
                              stroke={3}
                              style={{ width: 16, height: 16, display: 'block' }}
                           />
                        )
                     }
                  >
                     {column.title}
                     {`${column.title !== column.id ? `(${column.id})` : ''}`}
                  </List.Item>
               ))}
            </List>
         </ScrollArea>
      </>
   )
}

const ExportResults = () => {
   const [shouldUseColumnTitle, setShouldUseColumnTitle] = useState(false)
   const [columns, rows] = useGlobalStore(state => [state.columns, state.rows])

   const data = useMemo(
      () => processData(columns, rows, { useTitle: shouldUseColumnTitle }),
      [columns, rows, shouldUseColumnTitle]
   )

   const download = (type: 'json' | 'csv') => {
      let output = ''
      if (type === 'json') {
         output = JSON.stringify(data, null, 3)
      } else if (type === 'csv') {
         output = json2csv(data, { expandNestedObjects: false })
      }

      const blob = new Blob([output], { type: `text/${type}` })
      const a = document.createElement('a')
      a.href = window.URL.createObjectURL(blob)
      a.download = `undata_export_${format(new Date(), 'yyyy-MM-dd')}.${type}`
      const clickEvt = new MouseEvent('click', {
         view: window,
         bubbles: true,
         cancelable: true,
      })
      a.dispatchEvent(clickEvt)
      a.remove()
   }

   return (
      <Tabs defaultValue='json'>
         <Tabs.List>
            <Tabs.Tab value='json' leftSection={<IconCodeDots size={18} />}>
               JSON
            </Tabs.Tab>
            <Tabs.Tab value='csv' leftSection={<IconTable size={16} />}>
               CSV
            </Tabs.Tab>
         </Tabs.List>
         <Tabs.Panel value='json' pt={16}>
            <Flex direction='column'>
               <ColumnsToExport />
               <Space h={16} />
               <Checkbox
                  defaultChecked
                  checked={shouldUseColumnTitle}
                  label='Use custom title as column name'
                  onChange={event => setShouldUseColumnTitle(event.currentTarget.checked)}
               />
               <Space h={16} />
               <Button
                  ml='auto'
                  size='xs'
                  color='green'
                  variant='filled'
                  onClick={() => download('json')}
                  leftSection={<IconDownload size={16} stroke={2} />}
               >
                  Export
               </Button>
            </Flex>
         </Tabs.Panel>
         <Tabs.Panel value='csv' pt={16}>
            <Flex direction='column'>
               <ColumnsToExport />
               <Space h={16} />
               <Checkbox
                  checked={shouldUseColumnTitle}
                  label='Use custom title as column name'
                  onChange={event => setShouldUseColumnTitle(event.currentTarget.checked)}
               />
               <Space h={16} />
               <Button
                  ml='auto'
                  size='xs'
                  color='green'
                  variant='filled'
                  onClick={() => download('csv')}
                  leftSection={<IconDownload size={16} stroke={2} />}
               >
                  Export
               </Button>
            </Flex>
         </Tabs.Panel>
      </Tabs>
   )
}

export default ExportResults
