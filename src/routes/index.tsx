import { createFileRoute } from '@tanstack/react-router'

import { StartScreen } from '@/components/shell/StartScreen'

export const Route = createFileRoute('/')({ component: StartScreen })
