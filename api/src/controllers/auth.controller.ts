import { Request, Response, NextFunction } from 'express';

import { register, login, logout } from '../services/auth.service';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../utils/auth-cookies';
import { env } from '../utils/env';

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await register(req.body);

      setRefreshTokenCookie(res, result.refreshToken.token, result.refreshToken.expiresAt);

      res.status(201).json({
        accessToken: result.accessToken,
        accessTokenExpiresAt: result.accessTokenExpiresAt,
        refreshTokenExpiresAt: result.refreshToken.expiresAt,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await login(req.body);

      setRefreshTokenCookie(res, result.refreshToken.token, result.refreshToken.expiresAt);

      res.status(200).json({
        accessToken: result.accessToken,
        accessTokenExpiresAt: result.accessTokenExpiresAt,
        refreshTokenExpiresAt: result.refreshToken.expiresAt,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.[env.REFRESH_TOKEN_COOKIE_NAME];
      await logout(refreshToken);
      clearRefreshTokenCookie(res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
