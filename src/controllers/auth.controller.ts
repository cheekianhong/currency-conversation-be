// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { HTTP_STATUS } from '../utils/httpStatus';
import { asyncHandler } from '../utils/asyncHandler';

const authService = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, name } = req.body as {
    email: string;
    password: string;
    name: string;
  };
  const result = await authService.register({ email, password, name });
  res.status(HTTP_STATUS.CREATED).json({ status: 'success', data: result });
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await authService.login({ email, password });
  res.status(HTTP_STATUS.OK).json({ status: 'success', data: result });
});

export const refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken: string };
  const result = await authService.refreshTokens(refreshToken);
  res.status(HTTP_STATUS.OK).json({ status: 'success', data: result });
});

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken: string };
  await authService.logout(refreshToken);
  res.status(HTTP_STATUS.NO_CONTENT).send();
});

export const me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ status: 'fail', message: 'Not authenticated' });
    return;
  }
  const user = await authService.getMe(userId);
  res.status(HTTP_STATUS.OK).json({ status: 'success', data: { user } });
});
