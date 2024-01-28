import { modals } from '@mantine/modals'
import { useHover } from '@mantine/hooks'
import { ActionIcon, Flex, Text } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'

import TableInfo from './TableInfo'

type TableOrViewItemProps = {
   item: { name: string }
   type?: 'table' | 'view'
}

const TableOrViewItem = ({ item, type = 'table' }: TableOrViewItemProps) => {
   const { hovered, ref } = useHover()

   const openModal = () => {
      modals.open({
         title: 'Table Details',
         children: <TableInfo table={item.name} />,
      })
   }
   return (
      <Flex align='center' h={32} gap={8} justify='space-between' ref={ref}>
         <Text size='sm'>{item.name}</Text>
         {hovered && (
            <ActionIcon
               size='sm'
               color='gray'
               variant='subtle'
               title={`${type === 'table' ? 'Table' : 'View'} Info`}
               onClick={openModal}
            >
               <IconInfoCircle size={16} />
            </ActionIcon>
         )}
      </Flex>
   )
}

export default TableOrViewItem
