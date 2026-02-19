import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * Generate a valid JWT access token for authenticated test requests.
 * The payload mirrors what JwtStrategy.validate() expects: { sub, userId }.
 */
export function getAuthToken(
  app: INestApplication,
  payload: { authId: string; userId: string },
): string {
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);
  return jwtService.sign(
    { sub: payload.authId, userId: payload.userId },
    {
      secret: configService.get('JWT_SECRET'),
      expiresIn: '15m',
    },
  );
}

/**
 * Generate a valid JWT refresh token for refresh-token test requests.
 * The payload mirrors what JwtRefreshStrategy.validate() expects: { sub, isLongLived }.
 */
export function getRefreshToken(
  app: INestApplication,
  payload: { authId: string; isLongLived?: boolean },
): string {
  const jwtService = app.get(JwtService);
  const configService = app.get(ConfigService);
  return jwtService.sign(
    { sub: payload.authId, isLongLived: payload.isLongLived ?? false },
    {
      secret: configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '2h',
    },
  );
}
