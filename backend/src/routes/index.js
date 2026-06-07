import { Router } from 'express';
import authRoutes from './auth.js';
import entityRoutes from './entities.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/entities', entityRoutes);

export default router;
