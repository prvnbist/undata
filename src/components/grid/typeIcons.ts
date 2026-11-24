import {
	IconBraces,
	IconCalendar,
	IconCalendarClock,
	IconClock,
	IconHash,
	IconLetterCase,
	IconLink,
	IconPhoto,
	IconTag,
	IconToggleLeft,
} from '@tabler/icons-react'

import type { DataType } from '@/lib/constants'

// The icon a column's type shows with.
export const TYPE_ICONS: Record<DataType, typeof IconHash> = {
	text: IconLetterCase,
	boolean: IconToggleLeft,
	number: IconHash,
	time: IconClock,
	timetz: IconClock,
	date: IconCalendar,
	timestamp: IconCalendarClock,
	timestamptz: IconCalendarClock,
	json: IconBraces,
	url: IconLink,
	image: IconPhoto,
	tag: IconTag,
}
