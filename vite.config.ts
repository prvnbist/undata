import { defineConfig } from 'vite-plus'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [tanstackStart({ spa: { enabled: true } }), viteReact(), tailwindcss()],
	test: { passWithNoTests: true },
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
