import { defineConfig } from 'vite';

export default defineConfig({
    // Use relative base path for GitHub Pages subfolder support
    base: './',
    build: {
        // Ensure assets are handled correctly
        assetsDir: 'assets',
        // Increase chunk size warning limit for larger AI models
        chunkSizeWarningLimit: 1000,
    }
});
