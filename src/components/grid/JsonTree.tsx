import type { ReactNode } from 'react'

import { cn } from 'cn'
import type { JsonNode } from '@/lib/json/tree'
import { summarise } from '@/lib/json/tree'

// More than this in one branch is listed as a count, so a huge array cannot freeze the page.
const MAX_CHILDREN = 200

const leafClass: Record<string, string> = {
	number: 'text-sky-300',
	string: 'text-emerald-300',
	boolean: 'text-primary',
	null: 'text-muted-foreground',
}

function Branch({ label, node, open }: { label: ReactNode; node: JsonNode; open: boolean }) {
	if (node.kind !== 'object' && node.kind !== 'array') {
		return (
			<li className="flex gap-2 py-0.5 pl-4">
				{label}
				<span className={cn('break-all', leafClass[node.kind])}>{summarise(node)}</span>
			</li>
		)
	}

	const children: [ReactNode, JsonNode][] =
		node.kind === 'object'
			? node.entries.map(([key, child]) => [
					<span className="text-muted-foreground">{key}:</span>,
					child,
				])
			: node.items.map((child, i) => [
					<span className="text-muted-foreground">{i}:</span>,
					child,
				])
	const hidden = children.length - MAX_CHILDREN

	return (
		<li>
			<details open={open} className="group">
				<summary className="flex cursor-pointer gap-2 rounded-sm py-0.5 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50">
					{label}
					<span className="text-muted-foreground">{summarise(node)}</span>
				</summary>
				<ul className="ml-2 border-l border-border/60 pl-1">
					{children.slice(0, MAX_CHILDREN).map(([childLabel, child], i) => (
						<Branch key={i} label={childLabel} node={child} open={false} />
					))}
					{hidden > 0 && (
						<li className="py-0.5 pl-4 text-muted-foreground">… {hidden} more</li>
					)}
				</ul>
			</details>
		</li>
	)
}

// A JSON value as a tree that opens a level at a time. The top level starts open.
export function JsonTree({ node, className }: { node: JsonNode; className?: string }) {
	return (
		<ul aria-label="JSON value" className={cn('font-mono text-xs', className)}>
			<Branch label={null} node={node} open />
		</ul>
	)
}
