import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveLinkHandler } from './server/resolveLink';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'maps-resolve-stub',
      configureServer(server) {
        server.middlewares.use('/api/maps/resolve-link', async (req, res, next) => {
          if (req.method !== 'POST') {
            next();
            return;
          }

          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(chunk));
          req.on('end', async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
                url?: string;
              };
              const result = await resolveLinkHandler(body.url ?? '');
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = result.ok ? 200 : 400;
              res.end(JSON.stringify(result));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: false,
                  error: err instanceof Error ? err.message : '서버 오류',
                }),
              );
            }
          });
        });
      },
    },
  ],
});
