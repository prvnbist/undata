import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { importDataset } from '@/store/session'
import type { ImportRequest } from '@/store/session'

// Starts an import and goes to its workspace, where progress, errors and rows appear.
export const useOpenDataset = () => {
	const navigate = useNavigate()

	return useCallback(
		(request: ImportRequest) => {
			const { id } = importDataset(request)
			void navigate({ to: '/d/$datasetId', params: { datasetId: id } })
		},
		[navigate]
	)
}
