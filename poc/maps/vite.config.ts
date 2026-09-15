import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/travel-planner-mvp-preview/maps-poc/',
  plugins: [react()],
  build: {
    outDir: '../../maps-poc',
    emptyOutDir: true,
  },
});
