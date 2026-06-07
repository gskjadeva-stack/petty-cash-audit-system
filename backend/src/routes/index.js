import { Router } from 'express';
import authRoutes from './auth.js';

const router = Router();

router.use('/auth', authRoutes);

// Lazy-load entity routes so auth handlers don't pull in Prisma at cold start
let entityRoutes;
router.use('/entities', async (req, res, next) => {
  if (!entityRoutes) {
    entityRoutes = (await import('./entities.js')).default;
  }
  return entityRoutes(req, res, next);
});

export default router;
