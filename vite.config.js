import { defineConfig } from 'vite';

export default defineConfig({
  base: './',                                  // relative URLs: works on Vercel, Netlify and GitHub Pages sub-paths
  build: {
    rollupOptions: {
      output: {
        // libraries change rarely → separate files the browser can cache between deploys
        manualChunks: { three: ['three'], motion: ['gsap', 'lenis'] }
      }
    },
    chunkSizeWarningLimit: 700                 // three.js alone is ~600 kB
  }
});
