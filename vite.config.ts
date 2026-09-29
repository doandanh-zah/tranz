import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
export default defineConfig({root:'apps/extension',plugins:[react()],base:'./',server:{host:'127.0.0.1',port:5173,strictPort:true},build:{outDir:'../../dist/extension',emptyOutDir:true,rollupOptions:{input:{panel:resolve('apps/extension/index.html'),offscreen:resolve('apps/extension/offscreen.html')}}}});
