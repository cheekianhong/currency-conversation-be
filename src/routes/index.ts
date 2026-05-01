// src/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import convertRoutes from './convert.routes';
import { rates } from '../controllers/convert.controller';

const router = Router();

router.use('/auth', authRoutes);
router.use('/convert', convertRoutes);

/**
 * @swagger
 * /api/rates:
 *   get:
 *     summary: List all latest exchange rates
 *     tags: [Convert]
 *     security: []
 *     responses:
 *       200:
 *         description: Rates list
 *       502:
 *         description: Failed to fetch exchange rates
 */
router.get('/rates', rates);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
