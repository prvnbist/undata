import type { CSSProperties } from 'react'
import { IconBrandGithub, IconFileUpload } from '@tabler/icons-react'

import { Features } from '@/components/landing/Features'
import { Stats, Steps } from '@/components/landing/Highlights'
import { Preview } from '@/components/landing/Preview'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { SAMPLE_NAME, makeSample } from '@/lib/import/sample'
import { Logo } from './Logo'
import { OpenFileButton } from './OpenFileButton'
import { modKey } from './platform'
import { Recents } from './Recents'
import { useOpenDataset } from './useOpenDataset'

const REPOSITORY = 'https://github.com/prvnbist/undata'
const CHOOSE_FILE = 'choose-file'

// The hero rises in, one piece after another.
const RISE = 'motion-safe:animate-rise'
const after = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` })

// The landing page and the start screen at once. Opening a file, and the recent ones, come first,
// so a returning visitor never scrolls. What Undata does follows for a first-time one.
export function StartScreen() {
	const open = useOpenDataset()

	return (
		<div className="relative isolate flex min-h-dvh flex-col overflow-x-clip">
			<div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[56rem]">
				<div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
				<div className="absolute -top-40 left-1/2 h-[28rem] w-[60rem] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl" />
				<div className="absolute top-40 right-[-10rem] h-[24rem] w-[32rem] rounded-full bg-[#ffa94d]/[0.06] blur-3xl" />
			</div>

			<header className="mx-auto flex w-full max-w-6xl items-center gap-2.5 px-4 py-4">
				<Logo className="size-5" />
				<span className="text-base font-semibold">Undata</span>
				<span className="ml-auto flex items-center gap-1.5 text-xs text-subtle-foreground max-sm:hidden">
					<Kbd>{modKey()}</Kbd>
					<Kbd>K</Kbd>
					for commands
				</span>
			</header>

			<main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-28 px-4 pt-[7dvh] pb-24">
				<div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-12">
					<div className="flex min-w-0 flex-col gap-8">
						<div className="space-y-5">
							<p
								className={`inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] py-1 pr-3 pl-2 text-xs font-medium text-foreground ${RISE}`}
							>
								<span className="relative flex size-2">
									<span className="absolute inset-0 rounded-full bg-primary motion-safe:animate-ping" />
									<span className="relative size-2 rounded-full bg-primary" />
								</span>
								Runs entirely in your browser
							</p>
							<h1
								className={`text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.05] ${RISE}`}
								style={after(80)}
							>
								Open a data file and{' '}
								<span className="text-gradient-primary">understand it.</span>
							</h1>
							<p
								className={`max-w-md text-base text-muted-foreground sm:text-[15px] sm:leading-relaxed ${RISE}`}
								style={after(160)}
							>
								Sort, filter, profile and query CSV, JSON and Excel files of millions of
								rows. Nothing leaves your browser, and nothing in the file is changed.
							</p>
						</div>

						<div
							className={`rounded-xl bg-gradient-to-b from-primary/45 via-primary/10 to-border p-px shadow-[0_20px_60px_-24px_rgb(255_212_59/0.35)] ${RISE}`}
							style={after(240)}
						>
							<section
								aria-label="Open a file"
								className="flex flex-col gap-5 rounded-[calc(var(--radius-xl)-1px)] bg-card p-6"
							>
								<div className="flex items-start gap-4">
									<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/50 bg-primary/10">
										<IconFileUpload className="size-5 text-primary" stroke={1.75} />
									</div>
									<div className="space-y-1">
										<p className="text-base font-medium">
											Drop a CSV, TSV, JSON, NDJSON or Excel file anywhere
										</p>
										<p className="text-muted-foreground">
											or paste data, or cells copied from a spreadsheet, with{' '}
											<Kbd>{modKey()}</Kbd> <Kbd>V</Kbd>
										</p>
									</div>
								</div>
								<div className="flex flex-wrap gap-2 pl-14 max-sm:pl-0">
									<OpenFileButton
										id={CHOOSE_FILE}
										size="lg"
										className="motion-safe:animate-glow"
									>
										Choose a file
									</OpenFileButton>
									<Button
										variant="outline"
										size="lg"
										onClick={() =>
											open({ blob: new Blob([makeSample()]), name: SAMPLE_NAME })
										}
									>
										Try sample data
									</Button>
								</div>
							</section>
						</div>

						<div className={RISE} style={after(320)}>
							<Recents />
						</div>
					</div>

					<Preview className={`lg:mt-6 ${RISE}`} style={after(200)} />
				</div>

				<Stats />

				<Features />

				<Steps />

				<section
					aria-labelledby="get-started"
					className="relative isolate flex flex-col items-center gap-5 overflow-hidden rounded-2xl border border-primary/20 bg-card px-6 py-16 text-center"
				>
					<div
						aria-hidden
						className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_60%_80%_at_50%_100%,black,transparent)]"
					/>
					<div
						aria-hidden
						className="absolute -bottom-40 left-1/2 -z-10 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
					/>
					<Logo className="size-8 drop-shadow-[0_0_16px_rgb(255_212_59/0.5)]" />
					<h2 id="get-started" className="text-2xl font-semibold text-balance sm:text-3xl">
						Have a look inside your file
					</h2>
					<p className="max-w-sm text-base text-muted-foreground">
						Drop it anywhere on this page, paste it, or choose it. It opens in a moment and
						stays on your device.
					</p>
					<Button size="lg" onClick={() => document.getElementById(CHOOSE_FILE)?.click()}>
						Open a file
					</Button>
				</section>
			</main>

			<footer className="border-t">
				<div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-5 text-xs text-subtle-foreground">
					<Logo className="size-3.5" />
					<span>Undata reads files locally. Nothing is sent anywhere.</span>
					<a
						href={REPOSITORY}
						target="_blank"
						rel="noreferrer"
						className="ml-auto inline-flex items-center gap-1.5 rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
					>
						<IconBrandGithub className="size-3.5" aria-hidden />
						Source on GitHub
					</a>
				</div>
			</footer>
		</div>
	)
}
