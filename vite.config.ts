import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      {
        name: 'api-verify-dev-middleware',
        configureServer(server) {
          server.middlewares.use('/api/verify-access', (req, res) => {
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk) => {
                body += chunk;
              });
              req.on('end', () => {
                try {
                  const parsed = JSON.parse(body || '{}');
                  const configuredKey = (
                    env.VITE_ACCESS_KEY ||
                    env.ACCESS_KEY ||
                    process.env.VITE_ACCESS_KEY ||
                    process.env.ACCESS_KEY ||
                    'EG-SIM-2026-VIP'
                  ).trim();
                  const entered = (parsed.key || '').trim();
                  const valid = entered === configuredKey;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ valid }));
                } catch {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
              });
            } else {
              res.statusCode = 405;
              res.end(JSON.stringify({ error: 'Method not allowed' }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    test: {
      globals: true,
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
