import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5200,
    host: '127.0.0.1',
    fs: {
      allow: ['..', '/home/stefanbsch/Schreibtisch/0x1']
    }
  }
});
