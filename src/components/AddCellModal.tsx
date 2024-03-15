import { v4 as uuidv4 } from 'uuid'
import { useMemo, useState } from 'react'

import { closeAllModals } from '@mantine/modals'
import { FileWithPath } from '@mantine/dropzone'
import { Button, Group, Select, Stepper } from '@mantine/core'

import { SOURCES } from '@/constants'
import useGlobalStore from '@/store'
import type { Column, Source } from '@/types'

import { CSVSource, JSONSource } from './Sources'
import DataConfiguration from './DataConfiguration'

const AddCellModal = () => {
	const [active, setActive] = useState(0)

	const [file, setFile] = useState<FileWithPath | null>(null)
	const [source, setSource] = useState<Source | null>(null)
	const [data, setData] = useState<{ [key in string]: any }[]>([])
	const [columns, setColumns] = useState<Map<string, Column>>(new Map([]))

	const addCell = useGlobalStore(state => state.addCell)

	const nextStep = () => {
		if (active === 2) {
			closeAllModals()
			addCell({
				id: uuidv4(),
				title: 'Cell Title',
				source: source!,
				view: 'TABLE',
				data: { rows: data, columns },
			})
			return
		}
		setActive(current => (current < 3 ? current + 1 : current))
	}
	const prevStep = () => setActive(current => (current > 0 ? current - 1 : current))

	const isNextAllowed = useMemo(() => {
		switch (true) {
			case active === 0 && !!source:
				return true
			case active === 1 && !!file:
				return true
			case active === 2 && !!data:
				return true
			default:
				return false
		}
	}, [active, source, data, file])

	return (
		<div>
			<Stepper
				size='sm'
				iconSize={28}
				active={active}
				onStepClick={setActive}
				allowNextStepsSelect={false}
			>
				<Stepper.Step label='Source'>
					<Select
						value={source}
						data={SOURCES}
						placeholder='Select data source'
						onChange={value => setSource(value as Source)}
					/>
				</Stepper.Step>
				<Stepper.Step label='Data Ingress'>
					{source === 'JSON' && <JSONSource file={file} setFile={setFile} />}
					{source === 'CSV' && <CSVSource file={file} setFile={setFile} />}
				</Stepper.Step>
				<Stepper.Step label='Configuration'>
					{!!source && !!file && (
						<DataConfiguration
							source={source}
							file={file}
							setData={setData}
							columns={columns}
							setColumns={setColumns}
						/>
					)}
				</Stepper.Step>
			</Stepper>
			<Group justify='center' mt='md'>
				<Button variant='default' onClick={prevStep}>
					Back
				</Button>
				<Button onClick={nextStep} disabled={!isNextAllowed}>
					{active === 2 ? 'Submit' : 'Next'}
				</Button>
			</Group>
		</div>
	)
}

export default AddCellModal
