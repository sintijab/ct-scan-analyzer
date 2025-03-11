import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite'

export default defineConfig({
  plugins: [solidPlugin(), devtools({ autoname: true })],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
  resolve: {
    // This alias allows you to import from "@/..." without worrying about extensions.
    alias: {
      '@': '/src',
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
});
