// Serves dist-bench, opens it in headless Chromium, and prints the result. Run with `pnpm bench`.
import { execFileSync } from 'node:child_process'
import { createReadStream, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

import { chromium } from 'playwright'

const root = join(process.cwd(), 'dist-bench')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }
const rows = process.env.BENCH_ROWS ?? '1000000'
const kind = process.env.BENCH_KIND ?? 'csv'

const server = createServer((req, res) => {
	const path = normalize(new URL(req.url, 'http://x').pathname)
	const file = join(
		root,
		path.startsWith('/tests') || path.startsWith('/assets') ? path : '/tests/bench/index.html'
	)
	if (!file.startsWith(root) || !existsSync(file)) {
		res.writeHead(404).end()
		return
	}
	res.writeHead(200, {
		'content-type': types[extname(file)] ?? 'application/octet-stream',
	})
	createReadStream(file).pipe(res)
}).listen(0)

const browser = await chromium.launch({ args: ['--remote-debugging-port=9333'] })
const page = await browser.newPage()
page.on('pageerror', error => console.error('page error:', error.message))

await page.goto(`http://localhost:${server.address().port}/?rows=${rows}&kind=${kind}`)
await page.waitForFunction(() => window.__bench, null, { timeout: 15 * 60_000, polling: 1000 })
const result = await page.evaluate(() => window.__bench)

// Workers are separate targets, so their heap is read over a raw DevTools connection. The engine
// worker is still alive and holds the whole imported table.
// All of Chromium's processes together, just after the work.
const pids = execFileSync('ps', ['-axo', 'pid=,ppid=,rss='], { encoding: 'utf8' })
	.trim()
	.split('\n')
	.map(line => line.trim().split(/\s+/).map(Number))
const tree = new Set([process.pid])
for (let grew = true; grew;) {
	grew = false
	for (const [pid, ppid] of pids) {
		if (tree.has(ppid) && !tree.has(pid)) grew = !!tree.add(pid)
	}
}
tree.delete(process.pid)
result.chromiumRssMB = Math.round(
	pids.reduce((sum, [pid, , rss]) => (tree.has(pid) ? sum + rss : sum), 0) / 1000
)

const { webSocketDebuggerUrl } = await (await fetch('http://localhost:9333/json/version')).json()
const socket = new WebSocket(webSocketDebuggerUrl)
await new Promise(resolve => socket.addEventListener('open', resolve))
let seq = 0
const waiting = new Map()
socket.addEventListener('message', ({ data }) => {
	const message = JSON.parse(data)
	waiting.get(message.id)?.(message.result ?? message.error)
})
const send = (method, params = {}, sessionId) =>
	new Promise(resolve => {
		const id = ++seq
		waiting.set(id, resolve)
		socket.send(JSON.stringify({ id, method, params, sessionId }))
	})

const { targetInfos } = await send('Target.getTargets')
const worker = targetInfos.find(
	target => target.type === 'worker' && target.url.includes('engine.worker')
)
if (worker) {
	const { sessionId } = await send('Target.attachToTarget', {
		targetId: worker.targetId,
		flatten: true,
	})
	await send('HeapProfiler.collectGarbage', {}, sessionId)
	const usage = await send('Runtime.getHeapUsage', {}, sessionId)
	result.workerHeapMB = Math.round(usage.usedSize / 1e6)
}
socket.close()

console.log(JSON.stringify(result, null, 2))

await browser.close()
server.close()
