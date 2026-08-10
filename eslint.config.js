import js from '@eslint/js'
import vue from 'eslint-plugin-vue'

export default [
  { ignores: ['dist/**'] },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        Blob: 'readonly',
        URL: 'readonly'
      }
    },
    rules: {
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
]
