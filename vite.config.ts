import { defineConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [tanstackStart({ spa: { enabled: true } }), viteReact(), tailwindcss()],
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					environment: 'node',
					include: ['src/**/*.test.ts'],
				},
			},
			{
				extends: true,
				test: {
					name: 'browser',
					include: ['tests/**/*.browser.test.tsx'],
					// Lazy chunks pull these in late. Without this, Vite re-optimises mid-run and reloads.
					optimizeDeps: {
						include: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities', 'date-fns'],
					},
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }],
					},
				},
			},
		],
	},
	fmt: {
		useTabs: true,
		tabWidth: 3,
		printWidth: 100,
		singleQuote: true,
		jsxSingleQuote: false,
		semi: false,
		trailingComma: 'es5',
		arrowParens: 'avoid',
		ignorePatterns: ['legacy/**', 'src/routeTree.gen.ts', 'pnpm-lock.yaml', '**/*.md'],
	},
	lint: {
		ignorePatterns: ['legacy/**', 'src/routeTree.gen.ts', 'dist/**'],
		options: { typeAware: true, typeCheck: true },
	},
})
