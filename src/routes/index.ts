// src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import convertRoutes from './convert.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/convert', convertRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
