import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { server: 'src/server/main.ts' },
  format: ['esm'],
  outDir: 'dist',
  outExtension: () => ({ js: '.mjs' }),
  target: 'node18',
  platform: 'node',
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: false,
  shims: true,
  external: ['better-sqlite3'],
  banner: {
    js: '#!/usr/bin/env node\nimport { createRequire } from "module";\nconst require = createRequire(import.meta.url);',
  },
  noExternal: [
    '@modelcontextprotocol/sdk',
    'hono',
    '@hono/node-server',
    'pino',
    'simple-git',
    '@anthropic-ai/sdk',
    'zod',
  ],
});
