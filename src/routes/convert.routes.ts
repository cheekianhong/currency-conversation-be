import { Router } from 'express';
import { z } from 'zod';
import * as convertController from '../controllers/convert.controller';
import { validate } from '../middlewares/validate.middleware';

const router = Router();

const convertQuerySchema = {
  query: z.object({
    from: z
      .string()
      .trim()
      .regex(/^[a-zA-Z]{3}$/)
      .transform((value) => value.toUpperCase()),
    to: z
      .string()
      .trim()
      .regex(/^[a-zA-Z]{3}$/)
      .transform((value) => value.toUpperCase()),
    amount: z.coerce.number().positive().optional(),
  }),
};

/**
 * @swagger
 * /api/convert:
 *   get:
 *     summary: Convert currency using latest exchange rates
 *     tags: [Convert]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           example: USD
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           example: EUR
 *       - in: query
 *         name: amount
 *         required: false
 *         schema:
 *           type: number
 *           example: 100
 *     responses:
 *       200:
 *         description: Conversion result
 *       400:
 *         description: Invalid currency code or amount
 *       502:
 *         description: Failed to fetch exchange rates
 */
router.get('/', validate(convertQuerySchema), convertController.convert);

/**
 * @swagger
 * /api/convert/countries:
 *   get:
 *     summary: List available currency codes and rates
 *     tags: [Convert]
 *     security: []
 *     responses:
 *       200:
 *         description: Rates list
 *       502:
 *         description: Failed to fetch exchange rates
 */
router.get('/countries', convertController.countries);

export default router;
