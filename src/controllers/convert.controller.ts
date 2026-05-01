import { Request, Response } from 'express';
import { ConvertService } from '../services/convert.service';
import { HTTP_STATUS } from '../utils/httpStatus';
import { asyncHandler } from '../utils/asyncHandler';

const convertService = new ConvertService();

export const convert = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { from, to, amount } = req.query as unknown as { from: string; to: string; amount?: number };
  const result = await convertService.convert(from, to, amount);
  res.status(HTTP_STATUS.OK).json({ status: 'success', data: result });
});

export const countries = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const result = await convertService.listCountries();
  res.status(HTTP_STATUS.OK).json({ status: 'success', data: result });
});

export const rates = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const result = await convertService.getRates();
  res.status(HTTP_STATUS.OK).json({ status: 'success', data: result });
});
