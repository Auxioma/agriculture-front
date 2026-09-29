// Learn more about Vitest configuration options at https://vitest.dev/config/

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Empêche le localStorage natif expérimental de Node de masquer celui de jsdom
    execArgv: ['--no-experimental-webstorage'],
    isolate: true,
  },
});
