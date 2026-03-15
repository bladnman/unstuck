import fs from 'node:fs/promises';

import chokidar from 'chokidar';
import cors from 'cors';
import express from 'express';

import { createServer as createViteServer } from 'vite';

import {
  CLIENT_DIST,
  DASHBOARD_HOST,
  DASHBOARD_PORT,
} from './config/appConfig.mjs';
import { discoverCliProviders, getFallbackProviders } from './ai/cliProviders.mjs';
import { CliSessionManager } from './ai/cliSessionManager.mjs';
import { ensureUnstuckHome, resolveUnstuckHome } from './data/unstuckHome.mjs';
import { registerApiRoutes } from './routes/registerApiRoutes.mjs';

const app = express();
const clients = new Set();
const currentHome = await resolveUnstuckHome();

await ensureUnstuckHome(currentHome);

const providers = await discoverCliProviders();
const sessionManager = new CliSessionManager(providers.length ? providers : getFallbackProviders());

app.use(cors());
app.use(express.json({ limit: '2mb' }));

function broadcastHomeRefresh() {
  const payload = JSON.stringify({ type: 'dashboard-refresh', at: new Date().toISOString() });
  for (const client of clients) {
    client.write(`data: ${payload}\n\n`);
  }
}

registerApiRoutes({
  app,
  getHome: async () => currentHome,
  broadcastHomeRefresh,
  sessionManager,
});

app.get('/api/events', (_request, response) => {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  clients.add(response);
  response.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  response.on('close', () => {
    clients.delete(response);
  });
});

const watcher = chokidar.watch(currentHome, {
  ignored: [/node_modules/, /\.DS_Store/],
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 300,
    pollInterval: 100,
  },
});

let refreshTimer = null;
watcher.on('all', () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    broadcastHomeRefresh();
  }, 250);
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(CLIENT_DIST));
  app.use('*', async (_request, response) => {
    response.send(await fs.readFile(`${CLIENT_DIST}/index.html`, 'utf8'));
  });
} else {
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
    },
    appType: 'spa',
  });

  app.use(vite.middlewares);
}

app.use((error, _request, response, _next) => {
  response.status(500).json({
    message: error.message || 'Unexpected server error',
  });
});

app.listen(DASHBOARD_PORT, DASHBOARD_HOST, () => {
  console.log(`Unstuck dashboard running at http://${DASHBOARD_HOST}:${DASHBOARD_PORT}`);
  console.log(`UNSTUCK_HOME: ${currentHome}`);
});
