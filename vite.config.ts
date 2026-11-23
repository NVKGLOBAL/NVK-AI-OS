import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/NVK-AI-OS/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.BANNED_KEY),
        'process.env.BANNED_KEY': JSON.stringify(env.BANNED_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: true,
        emptyOutDir: true,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/') || id.includes('@radix-ui')) {
                  return 'vendor-react';
                }
                if (id.includes('@mlc-ai/web-llm')) {
                  return 'vendor-webllm';
                }
                if (id.includes('motion') || id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
                  return 'vendor-ui';
                }
                if (id.includes('dexie') || id.includes('yjs') || id.includes('y-websocket') || id.includes('socket.io')) {
                  return 'vendor-state';
                }
                // Everything else in node_modules — three, @react-three/fiber,
                // @react-three/drei, @monogrid/gainmap-js, zustand, suspend-react,
                // react-reconciler and the rest — goes into ONE chunk, vendor-three.
                // DO NOT split this group again. three/fiber/drei/gainmap form a
                // circular import graph (gainmap's Loader extends three's Loader;
                // fiber needs zustand/suspend-react helpers), and splitting them
                // across chunks made ES-module evaluation throw
                // "ReferenceError: Cannot access 'Bn' before initialization"
                // during module evaluation, before React ever mounted — the
                // black page on the live site (diagnosed 2026-11-22). Keeping
                // the cycle inside a single chunk lets Rollup order the class
                // definitions so three's Loader initializes first.
                return 'vendor-three';
              }
            }
          }
        }
      }
    };
});
