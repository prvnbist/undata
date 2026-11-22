const URL_REGEX = /^(?:(https?:\/\/)?(?:www\.)?)?([\w-]+(\.[\w-]+)+\/?)([^\s]*)$/

export const isURL = (input: string) => URL_REGEX.test(input)

export const extractURLName = (input: string) => {
	const match = input.match(/\/([^/]+)$/)
	return match ? match[1] : null
}
