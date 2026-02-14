import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';
import { hash } from 'bcrypt';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken, getRefreshToken } from './utils/auth.helper';
import {
  clearDatabase,
  createActiveUser,
  createUnverifiedUser,
  createVerifiedNoPasswordUser,
} from './utils/db.helper';
import { MailpitHelper } from './utils/mailpit.helper';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mailpit: MailpitHelper;

  beforeAll(async () => {
    app = await createTestApp();
    mailpit = new MailpitHelper();
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  // ──────────────────────────────────────────────────
  // GET /auth/email-registered
  // ──────────────────────────────────────────────────
  describe('GET /auth/email-registered', () => {
    beforeAll(async () => {
      await clearDatabase(app);
      await createActiveUser(app, {
        email: 'active@example.com',
        password: 'Password123',
        name: 'Active User',
      });
    });

    it('should return { registered: false } for unknown email', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/email-registered')
        .query({ email: 'unknown@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ registered: false });
    });

    it('should return { registered: true } for active user email', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/email-registered')
        .query({ email: 'active@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ registered: true });
    });
  });

  // ──────────────────────────────────────────────────
  // POST /auth/register
  // ──────────────────────────────────────────────────
  describe('POST /auth/register', () => {
    beforeAll(async () => {
      await clearDatabase(app);
      await mailpit.deleteAllMessages();
    });

    it('should register a new user and return response', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Accept-Language', 'en-US')
        .send({ name: 'Alice Johnson', email: 'alice@example.com' });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'Alice Johnson',
        email: 'alice@example.com',
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.activationCodeResendAt).toBeDefined();
    });

    it('should send activation code email via Mailpit', async () => {
      const message = await mailpit.getLatestMessage('alice@example.com');

      expect(message).toBeDefined();
      expect(message.To[0].Address).toBe('alice@example.com');

      const code = mailpit.extractActivationCode(message.HTML);
      expect(code).toMatch(/^\d{6}$/);
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Accept-Language', 'en-US')
        .send({ email: 'noname@example.com' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Accept-Language', 'en-US')
        .send({ name: 'No Email User' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when email format is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Accept-Language', 'en-US')
        .send({ name: 'Bad Email', email: 'not-an-email' });

      expect(response.status).toBe(400);
    });

    it('should return 409 when email is already registered with ACTIVE status', async () => {
      // Seed an active user
      await createActiveUser(app, {
        email: 'existing@example.com',
        password: 'Password123',
        name: 'Existing User',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Accept-Language', 'en-US')
        .send({ name: 'Duplicate User', email: 'existing@example.com' });

      expect(response.status).toBe(409);
    });

    it('should return 429 when re-registering before resend cooldown expires', async () => {
      // Register a new user (sets a cooldown)
      await request(app.getHttpServer())
        .post('/auth/register')
        .set('Accept-Language', 'en-US')
        .send({ name: 'Rate User', email: 'ratelimit@example.com' });

      // Attempt again immediately — cooldown not expired
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Accept-Language', 'en-US')
        .send({ name: 'Rate User', email: 'ratelimit@example.com' });

      expect(response.status).toBe(429);
    });
  });

  // ──────────────────────────────────────────────────
  // POST /auth/resend-activation-code
  // ──────────────────────────────────────────────────
  describe('POST /auth/resend-activation-code', () => {
    beforeAll(async () => {
      await clearDatabase(app);
      await mailpit.deleteAllMessages();
      await createUnverifiedUser(app, {
        email: 'unverified@example.com',
        activationCode: '123456',
        name: 'Unverified User',
      });
      await createActiveUser(app, {
        email: 'active-resend@example.com',
        password: 'Password123',
        name: 'Active User',
      });
    });

    it('should resend activation code for UNVERIFIED user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/resend-activation-code')
        .set('Accept-Language', 'en-US')
        .send({ email: 'unverified@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.activationCodeResendAt).toBeDefined();
    });

    it('should return 400 when email format is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/resend-activation-code')
        .set('Accept-Language', 'en-US')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when email is not registered', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/resend-activation-code')
        .set('Accept-Language', 'en-US')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(404);
    });

    it('should return 404 when user is ACTIVE (not UNVERIFIED)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/resend-activation-code')
        .set('Accept-Language', 'en-US')
        .send({ email: 'active-resend@example.com' });

      expect(response.status).toBe(404);
    });

    it('should return 429 when resending before cooldown expires', async () => {
      // Seed a user with cooldown set in the future
      await createUnverifiedUser(app, {
        email: 'cooldown@example.com',
        activationCode: '654321',
        name: 'Cooldown User',
        activationCodeResendAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      const response = await request(app.getHttpServer())
        .post('/auth/resend-activation-code')
        .set('Accept-Language', 'en-US')
        .send({ email: 'cooldown@example.com' });

      expect(response.status).toBe(429);
    });
  });

  // ──────────────────────────────────────────────────
  // POST /auth/verify-email
  // ──────────────────────────────────────────────────
  describe('POST /auth/verify-email', () => {
    beforeAll(async () => {
      await clearDatabase(app);
      await createUnverifiedUser(app, {
        email: 'verify-me@example.com',
        activationCode: '654321',
        name: 'Verify User',
      });
    });

    it('should return 400 when email is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ activationCode: '654321' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when activationCode is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: 'verify-me@example.com' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when email format is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: 'bad-email', activationCode: '654321' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when email is not registered as UNVERIFIED', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: 'nonexistent@example.com', activationCode: '654321' });

      expect(response.status).toBe(404);
    });

    it('should return 400 with wrong activation code', async () => {
      // Seed a separate user so we don't affect the happy-path user
      await createUnverifiedUser(app, {
        email: 'wrong-code@example.com',
        activationCode: '111111',
        name: 'Wrong Code User',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: 'wrong-code@example.com', activationCode: '999999' });

      expect(response.status).toBe(400);
    });

    it('should verify email with correct activation code and return set-password token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: 'verify-me@example.com', activationCode: '654321' });

      expect(response.status).toBe(201);
      expect(response.body.access_token).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────
  // POST /auth/set-password/:token
  // ──────────────────────────────────────────────────
  describe('POST /auth/set-password/:token', () => {
    it('should set password and return credentials', async () => {
      await clearDatabase(app);
      const { setPasswordToken } = await createVerifiedNoPasswordUser(app, {
        email: 'set-pass@example.com',
        name: 'SetPassword User',
      });

      const response = await request(app.getHttpServer())
        .post(`/auth/set-password/${setPasswordToken}`)
        .send({ password: 'NewPassword123' });

      expect(response.status).toBe(201);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
    });

    it('should return 400 when password is too short', async () => {
      await clearDatabase(app);
      const { setPasswordToken } = await createVerifiedNoPasswordUser(app, {
        email: 'short-pass@example.com',
      });

      const response = await request(app.getHttpServer())
        .post(`/auth/set-password/${setPasswordToken}`)
        .send({ password: 'Ab1' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when password lacks uppercase letter', async () => {
      await clearDatabase(app);
      const { setPasswordToken } = await createVerifiedNoPasswordUser(app, {
        email: 'no-upper@example.com',
      });

      const response = await request(app.getHttpServer())
        .post(`/auth/set-password/${setPasswordToken}`)
        .send({ password: 'lowercaseonly1' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when password lacks lowercase letter', async () => {
      await clearDatabase(app);
      const { setPasswordToken } = await createVerifiedNoPasswordUser(app, {
        email: 'no-lower@example.com',
      });

      const response = await request(app.getHttpServer())
        .post(`/auth/set-password/${setPasswordToken}`)
        .send({ password: 'UPPERCASEONLY1' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when password lacks a number', async () => {
      await clearDatabase(app);
      const { setPasswordToken } = await createVerifiedNoPasswordUser(app, {
        email: 'no-number@example.com',
      });

      const response = await request(app.getHttpServer())
        .post(`/auth/set-password/${setPasswordToken}`)
        .send({ password: 'NoNumberHere' });

      expect(response.status).toBe(400);
    });

    it('should return 400 with invalid/expired token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/set-password/invalid-token-value')
        .send({ password: 'ValidPassword1' });

      expect(response.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────────
  // POST /auth/login
  // ──────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    beforeAll(async () => {
      await clearDatabase(app);
      await createActiveUser(app, {
        email: 'login@example.com',
        password: 'Password123',
        name: 'Login User',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123',
          rememberMe: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
    });

    it('should login with rememberMe true', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Password123',
          rememberMe: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
    });

    it('should return 401 when email is missing', async () => {
      // LocalAuthGuard runs before ValidationPipe — passport rejects
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'Password123', rememberMe: false });

      expect(response.status).toBe(401);
    });

    it('should return 401 when password is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'login@example.com', rememberMe: false });

      expect(response.status).toBe(401);
    });

    it('should return 401 with wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword1',
          rememberMe: false,
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 with non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'ghost@example.com',
          password: 'Password123',
          rememberMe: false,
        });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /auth/me
  // ──────────────────────────────────────────────────
  describe('GET /auth/me', () => {
    let authToken: string;

    beforeAll(async () => {
      await clearDatabase(app);
      const { userId, authProviderId } = await createActiveUser(app, {
        email: 'me@example.com',
        password: 'Password123',
        name: 'Profile User',
      });
      authToken = getAuthToken(app, {
        authId: authProviderId,
        userId,
      });
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'Profile User',
        email: 'me@example.com',
        currencyCode: 'USD',
      });
      expect(response.body.id).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get('/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-jwt-token');

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // POST /auth/logout
  // ──────────────────────────────────────────────────
  describe('POST /auth/logout', () => {
    let authToken: string;

    beforeAll(async () => {
      await clearDatabase(app);
      const { userId, authProviderId } = await createActiveUser(app, {
        email: 'logout@example.com',
        password: 'Password123',
        name: 'Logout User',
      });
      authToken = getAuthToken(app, {
        authId: authProviderId,
        userId,
      });
    });

    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(201);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).post('/auth/logout');

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /auth/refresh
  // ──────────────────────────────────────────────────
  describe('GET /auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      await clearDatabase(app);
      const { authProviderId } = await createActiveUser(app, {
        email: 'refresh@example.com',
        password: 'Password123',
        name: 'Refresh User',
      });

      // Generate a refresh token and store its hash in the auth provider
      refreshToken = getRefreshToken(app, { authId: authProviderId });
      const hashedRefreshToken = await hash(refreshToken, 10);
      const connection = app.get<Connection>(getConnectionToken());
      const AuthProviderModel = connection.model('AuthenticationProvider');
      await AuthProviderModel.findByIdAndUpdate(authProviderId, {
        refreshToken: hashedRefreshToken,
      });
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`);

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app.getHttpServer()).get('/auth/refresh');

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // POST /auth/forgot-password
  // ──────────────────────────────────────────────────
  describe('POST /auth/forgot-password', () => {
    beforeAll(async () => {
      await clearDatabase(app);
      await mailpit.deleteAllMessages();
      await createActiveUser(app, {
        email: 'forgot@example.com',
        password: 'Password123',
        name: 'Forgot User',
      });
    });

    it('should send reset password email for ACTIVE user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .set('Accept-Language', 'en')
        .send({ email: 'forgot@example.com' });

      expect(response.status).toBe(201);

      // Verify email was sent via Mailpit
      const message = await mailpit.getLatestMessage('forgot@example.com');
      expect(message).toBeDefined();

      const resetLink = mailpit.extractResetPasswordLink(message.HTML);
      expect(resetLink).toContain('reset-password');
    });

    it('should return 400 when email format is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .set('Accept-Language', 'en')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
    });

    it('should return 404 when email is not registered', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .set('Accept-Language', 'en')
        .send({ email: 'unknown@example.com' });

      expect(response.status).toBe(404);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /auth/verify-set-password-token/:token
  // ──────────────────────────────────────────────────
  describe('GET /auth/verify-set-password-token/:token', () => {
    let setPasswordToken: string;

    beforeAll(async () => {
      await clearDatabase(app);
      const result = await createVerifiedNoPasswordUser(app, {
        email: 'verify-token@example.com',
        name: 'Verify Token User',
      });
      setPasswordToken = result.setPasswordToken;
    });

    it('should return true for valid token', async () => {
      const response = await request(app.getHttpServer()).get(
        `/auth/verify-set-password-token/${setPasswordToken}`,
      );

      expect(response.status).toBe(200);
      expect(response.text).toBe('true');
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(app.getHttpServer()).get(
        '/auth/verify-set-password-token/invalid-token',
      );

      expect(response.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────────
  // Full Registration Flow (integration scenario)
  // ──────────────────────────────────────────────────
  describe('Full Registration Flow', () => {
    let setPasswordToken: string;
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
      await clearDatabase(app);
      await mailpit.deleteAllMessages();
    });

    it('should complete: Register → Verify Email → Set Password → Login → Me → Refresh → Logout', async () => {
      // ── Step 1: Register ──
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Accept-Language', 'en-US')
        .send({ name: 'Flow User', email: 'flow@example.com' });

      expect(registerRes.status).toBe(201);
      expect(registerRes.body.email).toBe('flow@example.com');

      // ── Step 2: Retrieve activation code from Mailpit ──
      const emailMessage = await mailpit.getLatestMessage('flow@example.com');
      const activationCode = mailpit.extractActivationCode(emailMessage.HTML);
      expect(activationCode).toMatch(/^\d{6}$/);

      // ── Step 3: Verify email ──
      const verifyRes = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ email: 'flow@example.com', activationCode });

      expect(verifyRes.status).toBe(201);
      expect(verifyRes.body.access_token).toBeDefined();
      setPasswordToken = verifyRes.body.access_token;

      // ── Step 4: Set password ──
      const setPasswordRes = await request(app.getHttpServer())
        .post(`/auth/set-password/${setPasswordToken}`)
        .send({ password: 'SecurePass123' });

      expect(setPasswordRes.status).toBe(201);
      expect(setPasswordRes.body.access_token).toBeDefined();
      expect(setPasswordRes.body.refresh_token).toBeDefined();

      // ── Step 5: Login ──
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'flow@example.com',
          password: 'SecurePass123',
          rememberMe: false,
        });

      expect(loginRes.status).toBe(201);
      expect(loginRes.body.access_token).toBeDefined();
      expect(loginRes.body.refresh_token).toBeDefined();
      accessToken = loginRes.body.access_token;
      refreshToken = loginRes.body.refresh_token;

      // ── Step 6: Get profile (me) ──
      const meRes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.name).toBe('Flow User');
      expect(meRes.body.email).toBe('flow@example.com');
      expect(meRes.body.currencyCode).toBe('USD');

      // ── Step 7: Refresh tokens ──
      const refreshRes = await request(app.getHttpServer())
        .get('/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.access_token).toBeDefined();
      expect(refreshRes.body.refresh_token).toBeDefined();

      // ── Step 8: Logout ──
      const logoutRes = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutRes.status).toBe(201);

      // ── Step 9: Verify email is registered ──
      const registeredRes = await request(app.getHttpServer())
        .get('/auth/email-registered')
        .query({ email: 'flow@example.com' });

      expect(registeredRes.status).toBe(200);
      expect(registeredRes.body).toEqual({ registered: true });
    });
  });
});
