module.exports = {
	extends: ['mantine'],
	parserOptions: {
		project: './tsconfig.json',
	},
	rules: {
		'react/react-in-jsx-scope': 'off',
		'import/extensions': 'off',
		'no-tabs': 'off',
		'@typescript-eslint/semi': 'off',
		'react/jsx-indent-props': 'off',
		'jsx-quotes': 'off',
		'max-len': 'off',
	},
}
