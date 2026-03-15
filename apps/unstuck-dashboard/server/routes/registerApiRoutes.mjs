import express from 'express';

import {
  createDashboardItem,
  getDashboardData,
  getDashboardItem,
  saveDashboardItemDocument,
  updateDashboardItem,
} from '../data/dashboardRepository.mjs';

export function registerApiRoutes({
  app,
  getHome,
  broadcastHomeRefresh,
  sessionManager,
}) {
  const apiRouter = express.Router();

  apiRouter.get('/dashboard', async (_request, response, next) => {
    try {
      response.json(await getDashboardData(await getHome()));
    } catch (error) {
      next(error);
    }
  });

  apiRouter.post('/items', async (request, response, next) => {
    try {
      const item = await createDashboardItem(await getHome(), request.body || {});
      broadcastHomeRefresh();
      response.status(201).json(item);
    } catch (error) {
      next(error);
    }
  });

  apiRouter.get('/items/:itemId', async (request, response, next) => {
    try {
      const item = await getDashboardItem(await getHome(), request.params.itemId);
      if (!item) {
        response.status(404).json({ message: 'Item not found' });
        return;
      }

      response.json(item);
    } catch (error) {
      next(error);
    }
  });

  apiRouter.patch('/items/:itemId', async (request, response, next) => {
    try {
      const item = await updateDashboardItem(await getHome(), request.params.itemId, request.body || {});
      if (!item) {
        response.status(404).json({ message: 'Item not found' });
        return;
      }

      broadcastHomeRefresh();
      response.json(item);
    } catch (error) {
      next(error);
    }
  });

  apiRouter.put('/items/:itemId/document', async (request, response, next) => {
    try {
      const item = await saveDashboardItemDocument(
        await getHome(),
        request.params.itemId,
        String(request.body?.document || ''),
      );
      if (!item) {
        response.status(404).json({ message: 'Item not found' });
        return;
      }

      broadcastHomeRefresh();
      response.json(item);
    } catch (error) {
      next(error);
    }
  });

  apiRouter.get('/ai/providers', async (_request, response) => {
    response.json(sessionManager.getProviders());
  });

  apiRouter.post('/ai/sessions', async (request, response, next) => {
    try {
      const session = sessionManager.createSession(request.body?.providerId);
      response.status(201).json(session);
    } catch (error) {
      next(error);
    }
  });

  apiRouter.get('/ai/sessions/:sessionId', async (request, response) => {
    const session = sessionManager.getSession(request.params.sessionId);
    if (!session) {
      response.status(404).json({ message: 'Session not found' });
      return;
    }

    response.json(session);
  });

  apiRouter.get('/ai/sessions/:sessionId/stream', async (request, response, next) => {
    try {
      response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      const unsubscribe = sessionManager.subscribe(request.params.sessionId, (payload) => {
        response.write(`data: ${JSON.stringify(payload)}\n\n`);
      });

      request.on('close', () => {
        unsubscribe();
      });
    } catch (error) {
      next(error);
    }
  });

  apiRouter.post('/ai/sessions/:sessionId/messages', async (request, response, next) => {
    try {
      const session = sessionManager.sendMessage(request.params.sessionId, {
        message: String(request.body?.message || ''),
        contextItems: Array.isArray(request.body?.contextItems) ? request.body.contextItems : [],
      });
      response.json(session);
    } catch (error) {
      next(error);
    }
  });

  app.use('/api', apiRouter);
}
