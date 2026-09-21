import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
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
                if (id.includes('three') || id.includes('@react-three')) {
                  return 'vendor-three';
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
                return 'vendor-utils';
              }
            }
          }
        }
      }
    };
});
