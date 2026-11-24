import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'storage/**', 'apify_storage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'apify',
              message: 'Domain layer must remain pure and have zero Apify SDK dependencies.',
            },
            {
              name: 'crawlee',
              message: 'Domain layer must remain pure and have zero Crawlee dependencies.',
            },
            {
              name: 'got-scraping',
              message: 'Domain layer must remain pure and have zero HTTP client dependencies.',
            },
            {
              name: '@modelcontextprotocol/sdk',
              message: 'Domain layer must remain pure and have zero MCP SDK dependencies.',
            },
          ],
          patterns: [
            {
              group: ['@modelcontextprotocol/sdk/*', '../shared/*'],
              message: 'Domain layer must remain pure and have zero platform/shared dependencies.',
            },
          ],
        },
      ],
    },
  },
);
