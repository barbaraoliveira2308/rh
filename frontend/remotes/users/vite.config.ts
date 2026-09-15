import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'srhUsersRemote',
      filename: 'remoteEntry.js',
      exposes: {
        './UsersRemoteApp': './src/UsersRemoteApp.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        '@mui/material': { singleton: true },
        '@mui/icons-material': { singleton: true },
        '@emotion/react': { singleton: true },
        '@emotion/styled': { singleton: true },
        '@tanstack/react-query': { singleton: true },
        'react-router-dom': { singleton: true },
        zustand: { singleton: true },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      '@bridge351/srh-shared': path.resolve(__dirname, '../../../shared/src'),
    },
  },
  server: {
    host: true,
    port: 5174,
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
  },
});
