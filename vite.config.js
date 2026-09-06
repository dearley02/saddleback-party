import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    // userEvent types a character at a time through jsdom, so a form-filling
    // test can genuinely exceed the 5s default on a slower machine.
    testTimeout: 20000,
  },
})
