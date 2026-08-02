import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: ['dagre'],
    },
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: env.VITE_API_URL ? new URL(env.VITE_API_URL).origin : 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@xyflow/react') || id.includes('@xyflow/system')) {
              return 'vendor-xyflow';
            }
            if (id.includes('monaco-editor') || id.includes('@monaco-editor/react')) {
              return 'vendor-monaco';
            }
            if (id.includes('@tanstack/react-query') || id.includes('@tanstack/react-table') || id.includes('@tanstack/react-virtual') || id.includes('@tanstack/react-form')) {
              return 'vendor-tanstack';
            }
            if (id.includes('node_modules/zustand') || id.includes('node_modules/use-sync-external-store')) {
              return 'vendor-state';
            }
            return undefined;
          },
        },
      },
    },
  };
});
