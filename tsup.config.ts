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
  external: ['better-sqlite3'],
  banner: { js: '#!/usr/bin/env node' },
  noExternal: [
    '@modelcontextprotocol/sdk',
    'hono',
    '@hono/node-server',
    '@anthropic-ai/sdk',
    'simple-git',
    'pino',
  ],
});
