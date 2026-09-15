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
        react: {},
        'react-dom': {},
        '@mui/material': {},
        '@mui/icons-material': {},
        '@emotion/react': {},
        '@emotion/styled': {},
        '@tanstack/react-query': {},
        'react-router-dom': {},
        zustand: {},
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
