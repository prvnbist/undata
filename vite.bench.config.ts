import { defineConfig } from 'vite-plus'

// Builds the benchmark page on its own, without the TanStack Start plugin, so `pnpm bench` measures
// the engine and not the app shell.
export default defineConfig({
	resolve: { tsconfigPaths: true },
	build: {
		outDir: 'dist-bench',
		emptyOutDir: true,
		rollupOptions: { input: 'tests/bench/index.html' },
	},
})
