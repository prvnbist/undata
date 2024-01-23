module.exports = {
   extends: ['mantine', 'plugin:@next/next/recommended', 'plugin:jest/recommended'],
   plugins: ['testing-library', 'jest'],
   overrides: [
      {
         files: ['**/?(*.)+(spec|test).[jt]s?(x)'],
         extends: ['plugin:testing-library/react'],
      },
   ],
   parserOptions: {
      project: './tsconfig.json',
   },
   rules: {
      'react/react-in-jsx-scope': 'off',
      'import/extensions': 'off',
      '@typescript-eslint/semi': 'off',
      'jsx-quotes': 0,
      'react/jsx-indent-props': 0,
   },
}
