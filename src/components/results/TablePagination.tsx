import {
	IconChevronLeft,
	IconChevronRight,
	IconChevronsLeft,
	IconChevronsRight,
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type TablePaginationProps = {
	pageIndex: number
	pageCount: number
	onPageChange: (pageIndex: number) => void
}

export function TablePagination({ pageIndex, pageCount, onPageChange }: TablePaginationProps) {
	const canPrevious = pageIndex > 0
	const canNext = pageIndex < pageCount - 1

	return (
		<div className="flex flex-wrap items-center justify-between gap-4">
			<nav aria-label="Pagination" className="flex items-center gap-1.5">
				<Button
					variant="outline"
					size="icon"
					aria-label="First page"
					disabled={!canPrevious}
					onClick={() => onPageChange(0)}
				>
					<IconChevronsLeft />
				</Button>
				<Button
					variant="outline"
					size="icon"
					aria-label="Previous page"
					disabled={!canPrevious}
					onClick={() => onPageChange(pageIndex - 1)}
				>
					<IconChevronLeft />
				</Button>
				<span className="px-2 text-sm">
					Page {pageIndex + 1} of {pageCount.toLocaleString()}
				</span>
				<Button
					variant="outline"
					size="icon"
					aria-label="Next page"
					disabled={!canNext}
					onClick={() => onPageChange(pageIndex + 1)}
				>
					<IconChevronRight />
				</Button>
				<Button
					variant="outline"
					size="icon"
					aria-label="Last page"
					disabled={!canNext}
					onClick={() => onPageChange(pageCount - 1)}
				>
					<IconChevronsRight />
				</Button>
			</nav>
			<div className="flex items-center gap-2">
				<Label htmlFor="go-to-page">Go to page</Label>
				<Input
					id="go-to-page"
					type="number"
					min={1}
					max={pageCount}
					className="w-20"
					value={pageIndex + 1}
					onChange={event => {
						const page = Number(event.target.value)
						onPageChange(Math.min(Math.max(Number.isNaN(page) ? 1 : page, 1), pageCount) - 1)
					}}
				/>
			</div>
		</div>
	)
}
