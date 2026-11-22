import { format } from 'date-fns'

import { DATE_TYPES_FORMAT } from '@/lib/constants'

// With no language, the value is shown as it is.
export const formatNumber = (value: number, language?: string) =>
	language ? new Intl.NumberFormat(language).format(value) : String(value)

// Throws a RangeError when the value isn't a valid date. Plan question 2 keeps this legacy behaviour.
export const formatDate = (value: string | number, type: keyof typeof DATE_TYPES_FORMAT) =>
	format(new Date(value), DATE_TYPES_FORMAT[type])
