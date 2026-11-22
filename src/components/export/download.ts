export function downloadFile(filename: string, content: string, mimeType: string) {
	const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	link.click()
	link.remove()
	URL.revokeObjectURL(url)
}
