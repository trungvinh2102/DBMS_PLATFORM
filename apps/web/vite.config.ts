import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Development-only middleware serving the /__test/error-panel visual fixture.
 * The fixture HTML references exactly one module script
 * (/src/app/dev/error-panel-fixture/entry.tsx); every other request is
 * delegated via next(). Registered only when command === 'serve', so the
 * plugin never exists in production builds and Rollup cannot emit any
 * fixture route/module/chunk. The fixture page module itself stays out of
 * the production graph because nothing under src/app/dev is imported by
 * application code (see entry.tsx header comment).
 */
function errorPanelFixturePlugin() {
  const FIXTURE_URL = '/__test/error-panel';
  const FIXTURE_ENTRY_SRC = '/src/app/dev/error-panel-fixture/entry.tsx';

  return {
    name: 'quriodb-dev-error-panel-fixture',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url !== FIXTURE_URL) {
          next();
          return;
        }

        const html = [
          '<!doctype html>',
          '<html lang="en">',
          '  <head>',
          '    <meta charset="UTF-8" />',
          '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
          '    <title>ErrorPanel fixture</title>',
          `    <script type="module" src="${FIXTURE_ENTRY_SRC}"></script>`,
          '  </head>',
          '  <body>',
          '    <div id="root"></div>',
          '  </body>',
          '</html>',
        ].join('\n');

        // transformIndexHtml returns a promise (injects the Vite client and
        // react-refresh preamble), so respond asynchronously.
        server
          .transformIndexHtml(FIXTURE_URL, html)
          .then((transformed) => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(transformed);
          })
          .catch(next);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths(),
      // Dev-server-only registration: absent from build/preview graphs.
      ...(command === 'serve' ? [errorPanelFixturePlugin()] : []),
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
      watch: {
        ignored: ['**/.turbo/**'],
      },
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
