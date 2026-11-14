import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['node_modules/**', 'dist/**', 'tests/e2e/**', '.opencode/**'],
  },
  ...tseslint.config(
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        parserOptions: {
          project: ['./tsconfig.app.json', './tsconfig.node.json'],
          tsconfigRootDir: process.cwd(),
        },
      },
    },
    tseslint.configs.recommended
  ),
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  }
)
