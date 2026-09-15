import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'srhShell',
      remotes: {
        srhUsersRemote: 'http://localhost:5174/assets/remoteEntry.js',
      },
      shared: {
        react: {},
        'react-dom': {},
        '@mui/material': {},
        '@mui/icons-material': {},
        '@emotion/react': {},
        '@emotion/styled': {},
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@bridge351/srh-shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
  },
});
