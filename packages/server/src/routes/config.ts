import { Router } from 'express';
import type { PublicConfigResponse } from '@app/shared';

export function createConfigRouter(publicConfig: PublicConfigResponse): Router {
  const router = Router();
  router.get('/config', (_req, res) => {
    res.json(publicConfig);
  });
  return router;
}
