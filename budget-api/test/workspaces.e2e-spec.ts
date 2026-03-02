import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as request from 'supertest';
import { createTestApp } from './utils/test-app.factory';
import { getAuthToken } from './utils/auth.helper';
import {
  clearDatabase,
  createActiveUser,
  nonExistentId,
} from './utils/db.helper';

async function getInvitationToken(
  app: INestApplication,
  invitationId: string,
): Promise<string> {
  const connection = app.get<Connection>(getConnectionToken());
  const InvitationModel = connection.model('Invitation');
  const invitation = await InvitationModel.findById(invitationId);
  return (invitation as any).token;
}

describe('WorkspacesController (e2e)', () => {
  let app: INestApplication;

  // Owner user
  let ownerToken: string;
  let ownerUserId: string;
  let ownerWorkspaceId: string;

  // Second user (to accept invitations, test isolation)
  let secondUserToken: string;
  let secondUserId: string;

  beforeAll(async () => {
    app = await createTestApp();
    await clearDatabase(app);

    const owner = await createActiveUser(app, {
      email: 'workspace-owner@example.com',
      password: 'Password123',
      name: 'Workspace Owner',
    });
    ownerUserId = owner.userId;
    ownerWorkspaceId = owner.workspaceId;
    ownerToken = getAuthToken(app, {
      authId: owner.authProviderId,
      userId: ownerUserId,
    });

    const second = await createActiveUser(app, {
      email: 'second-user@example.com',
      password: 'Password123',
      name: 'Second User',
    });
    secondUserId = second.userId;
    secondUserToken = getAuthToken(app, {
      authId: second.authProviderId,
      userId: secondUserId,
    });
  });

  afterAll(async () => {
    await clearDatabase(app);
    await app.close();
  });

  // ──────────────────────────────────────────────────
  // POST /workspaces
  // ──────────────────────────────────────────────────
  describe('POST /workspaces', () => {
    it('should create a workspace with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.owner).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .post('/workspaces')
        .send({ name: 'No Auth Workspace' });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /workspaces
  // ──────────────────────────────────────────────────
  describe('GET /workspaces', () => {
    it('should return workspaces the user is a member of', async () => {
      const response = await request(app.getHttpServer())
        .get('/workspaces')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // Owner has default workspace + "Family Budget" created above
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should not return workspaces from another user', async () => {
      const response = await request(app.getHttpServer())
        .get('/workspaces')
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(response.status).toBe(200);
      // Second user only has their own default workspace
      expect(response.body).toHaveLength(1);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get('/workspaces');

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /workspaces/current
  // ──────────────────────────────────────────────────
  describe('GET /workspaces/current', () => {
    it('should return the current workspace', async () => {
      const response = await request(app.getHttpServer())
        .get('/workspaces/current')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
      expect(response.body.owner).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get(
        '/workspaces/current',
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // PATCH /workspaces/:id
  // ──────────────────────────────────────────────────
  describe('PATCH /workspaces/:id', () => {
    it('should update workspace as owner', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/workspaces/${ownerWorkspaceId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(ownerWorkspaceId);
    });

    it('should return 403 when non-owner tries to update', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/workspaces/${ownerWorkspaceId}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .set('x-workspace-id', ownerWorkspaceId)
        .send({ name: 'Hijacked' });

      expect(response.status).toBe(403);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/workspaces/${ownerWorkspaceId}`)
        .send({ name: 'No Auth' });

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // GET /workspaces/members
  // ──────────────────────────────────────────────────
  describe('GET /workspaces/members', () => {
    it('should return members of the current workspace', async () => {
      const response = await request(app.getHttpServer())
        .get('/workspaces/members')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      const ownerMember = response.body.find((m: any) => m.role === 'OWNER');
      expect(ownerMember).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app.getHttpServer()).get(
        '/workspaces/members',
      );

      expect(response.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────
  // Invitations flow
  // ──────────────────────────────────────────────────
  describe('Invitations', () => {
    // ── POST /workspaces/invitations ──
    describe('POST /workspaces/invitations', () => {
      it('should create an invitation as owner', async () => {
        const response = await request(app.getHttpServer())
          .post('/workspaces/invitations')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            email: 'invitee@example.com',
            role: 'CONTRIBUTOR',
          });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          email: 'invitee@example.com',
          role: 'CONTRIBUTOR',
          status: 'PENDING',
        });
        expect(response.body.id).toBeDefined();
      });

      it('should return 400 when inviting an existing member', async () => {
        const response = await request(app.getHttpServer())
          .post('/workspaces/invitations')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            email: 'workspace-owner@example.com',
            role: 'CONTRIBUTOR',
          });

        expect(response.status).toBe(400);
      });

      it('should return 400 when email is missing', async () => {
        const response = await request(app.getHttpServer())
          .post('/workspaces/invitations')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ role: 'CONTRIBUTOR' });

        expect(response.status).toBe(400);
      });

      it('should return 400 when email is invalid', async () => {
        const response = await request(app.getHttpServer())
          .post('/workspaces/invitations')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ email: 'not-an-email', role: 'CONTRIBUTOR' });

        expect(response.status).toBe(400);
      });

      it('should return 403 when non-owner tries to invite', async () => {
        const response = await request(app.getHttpServer())
          .post('/workspaces/invitations')
          .set('Authorization', `Bearer ${secondUserToken}`)
          .set('x-workspace-id', ownerWorkspaceId)
          .send({
            email: 'someone@example.com',
            role: 'VIEWER',
          });

        expect(response.status).toBe(403);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app.getHttpServer())
          .post('/workspaces/invitations')
          .send({
            email: 'noauth@example.com',
            role: 'CONTRIBUTOR',
          });

        expect(response.status).toBe(401);
      });

      it('should revoke previous pending invitation when re-inviting same email', async () => {
        // Create a new invitation for the same email
        const response = await request(app.getHttpServer())
          .post('/workspaces/invitations')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            email: 'invitee@example.com',
            role: 'VIEWER',
          });

        expect(response.status).toBe(201);
        expect(response.body.role).toBe('VIEWER');

        // List invitations - old one should be REVOKED
        const listRes = await request(app.getHttpServer())
          .get('/workspaces/invitations')
          .set('Authorization', `Bearer ${ownerToken}`);

        const invitationsForEmail = listRes.body.filter(
          (i: any) => i.email === 'invitee@example.com',
        );
        const revokedCount = invitationsForEmail.filter(
          (i: any) => i.status === 'REVOKED',
        ).length;
        const pendingCount = invitationsForEmail.filter(
          (i: any) => i.status === 'PENDING',
        ).length;

        expect(revokedCount).toBeGreaterThanOrEqual(1);
        expect(pendingCount).toBe(1);
      });
    });

    // ── GET /workspaces/invitations ──
    describe('GET /workspaces/invitations', () => {
      it('should return invitations for the workspace', async () => {
        const response = await request(app.getHttpServer())
          .get('/workspaces/invitations')
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(1);
      });

      it('should return 403 when non-owner tries to list invitations', async () => {
        const response = await request(app.getHttpServer())
          .get('/workspaces/invitations')
          .set('Authorization', `Bearer ${secondUserToken}`)
          .set('x-workspace-id', ownerWorkspaceId);

        expect(response.status).toBe(403);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app.getHttpServer()).get(
          '/workspaces/invitations',
        );

        expect(response.status).toBe(401);
      });
    });

    // ── GET /workspaces/invitations/:token (public) ──
    describe('GET /workspaces/invitations/:token', () => {
      let validToken: string;

      beforeAll(async () => {
        // Create a fresh invitation and get the token from the DB
        const res = await request(app.getHttpServer())
          .post('/workspaces/invitations')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            email: 'token-lookup@example.com',
            role: 'CONTRIBUTOR',
          });

        validToken = await getInvitationToken(app, res.body.id);
      });

      it('should return invitation details for a valid token (no auth required)', async () => {
        const response = await request(app.getHttpServer()).get(
          `/workspaces/invitations/${validToken}`,
        );

        expect(response.status).toBe(200);
        expect(response.body.email).toBe('token-lookup@example.com');
        expect(response.body.status).toBe('PENDING');
      });

      it('should return 404 for a non-existent token', async () => {
        const response = await request(app.getHttpServer()).get(
          '/workspaces/invitations/nonexistenttokenvalue1234567890abcdef',
        );

        expect(response.status).toBe(404);
      });
    });

    // ── POST /workspaces/invitations/:token/accept ──
    describe('POST /workspaces/invitations/:token/accept', () => {
      let acceptToken: string;

      beforeAll(async () => {
        // Create a fresh invitation for second user
        const res = await request(app.getHttpServer())
          .post('/workspaces/invitations')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            email: 'second-user@example.com',
            role: 'CONTRIBUTOR',
          });

        acceptToken = await getInvitationToken(app, res.body.id);
      });

      it('should accept invitation and add user as member', async () => {
        const response = await request(app.getHttpServer())
          .post(`/workspaces/invitations/${acceptToken}/accept`)
          .set('Authorization', `Bearer ${secondUserToken}`);

        expect(response.status).toBe(201);
        expect(response.body.role).toBe('CONTRIBUTOR');

        // Verify user is now a member
        const membersRes = await request(app.getHttpServer())
          .get('/workspaces/members')
          .set('Authorization', `Bearer ${ownerToken}`);

        const secondMember = membersRes.body.find(
          (m: any) => m.user?.email === 'second-user@example.com',
        );
        expect(secondMember).toBeDefined();
        expect(secondMember.role).toBe('CONTRIBUTOR');
      });

      it('should return 400 when accepting an already accepted invitation', async () => {
        const response = await request(app.getHttpServer())
          .post(`/workspaces/invitations/${acceptToken}/accept`)
          .set('Authorization', `Bearer ${secondUserToken}`);

        expect(response.status).toBe(400);
      });

      it('should return 404 for a non-existent token', async () => {
        const response = await request(app.getHttpServer())
          .post(
            '/workspaces/invitations/nonexistenttokenvalue1234567890abcdef/accept',
          )
          .set('Authorization', `Bearer ${secondUserToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app.getHttpServer()).post(
          `/workspaces/invitations/${acceptToken}/accept`,
        );

        expect(response.status).toBe(401);
      });
    });

    // ── DELETE /workspaces/invitations/:invitationId (revoke) ──
    describe('DELETE /workspaces/invitations/:invitationId', () => {
      let revokeInvitationId: string;

      beforeAll(async () => {
        const res = await request(app.getHttpServer())
          .post('/workspaces/invitations')
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({
            email: 'to-revoke@example.com',
            role: 'VIEWER',
          });
        revokeInvitationId = res.body.id;
      });

      it('should revoke a pending invitation', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/workspaces/invitations/${revokeInvitationId}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('REVOKED');
      });

      it('should return 404 when revoking an already revoked invitation', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/workspaces/invitations/${revokeInvitationId}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 404 for non-existent invitation id', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/workspaces/invitations/${nonExistentId()}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app.getHttpServer()).delete(
          `/workspaces/invitations/${revokeInvitationId}`,
        );

        expect(response.status).toBe(401);
      });
    });
  });

  // ──────────────────────────────────────────────────
  // Member management (after invitation accepted)
  // ──────────────────────────────────────────────────
  describe('Member management', () => {
    let contributorMemberId: string;

    beforeAll(async () => {
      // Find the second user's membership (added via accepted invitation above)
      const response = await request(app.getHttpServer())
        .get('/workspaces/members')
        .set('Authorization', `Bearer ${ownerToken}`);

      const contributorMember = response.body.find(
        (m: any) => m.user?.email === 'second-user@example.com',
      );
      contributorMemberId = contributorMember?.id;
    });

    // ── PATCH /workspaces/members/:memberId/role ──
    describe('PATCH /workspaces/members/:memberId/role', () => {
      it('should update member role as owner', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/workspaces/members/${contributorMemberId}/role`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ role: 'VIEWER' });

        expect(response.status).toBe(200);
        expect(response.body.role).toBe('VIEWER');
      });

      it('should return 404 for non-existent member id', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/workspaces/members/${nonExistentId()}/role`)
          .set('Authorization', `Bearer ${ownerToken}`)
          .send({ role: 'CONTRIBUTOR' });

        expect(response.status).toBe(404);
      });

      it('should return 403 when non-owner tries to update role', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/workspaces/members/${contributorMemberId}/role`)
          .set('Authorization', `Bearer ${secondUserToken}`)
          .set('x-workspace-id', ownerWorkspaceId)
          .send({ role: 'CONTRIBUTOR' });

        expect(response.status).toBe(403);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app.getHttpServer())
          .patch(`/workspaces/members/${contributorMemberId}/role`)
          .send({ role: 'CONTRIBUTOR' });

        expect(response.status).toBe(401);
      });
    });

    // ── DELETE /workspaces/members/:memberId ──
    describe('DELETE /workspaces/members/:memberId', () => {
      it('should return 400 when trying to remove the owner', async () => {
        // Find owner membership
        const membersRes = await request(app.getHttpServer())
          .get('/workspaces/members')
          .set('Authorization', `Bearer ${ownerToken}`);

        const ownerMember = membersRes.body.find(
          (m: any) => m.role === 'OWNER',
        );

        const response = await request(app.getHttpServer())
          .delete(`/workspaces/members/${ownerMember.id}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(response.status).toBe(400);
      });

      it('should return 403 when non-owner tries to remove a member', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/workspaces/members/${contributorMemberId}`)
          .set('Authorization', `Bearer ${secondUserToken}`)
          .set('x-workspace-id', ownerWorkspaceId);

        expect(response.status).toBe(403);
      });

      it('should remove a non-owner member', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/workspaces/members/${contributorMemberId}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(response.status).toBe(200);

        // Verify member is removed
        const membersRes = await request(app.getHttpServer())
          .get('/workspaces/members')
          .set('Authorization', `Bearer ${ownerToken}`);

        const removed = membersRes.body.find(
          (m: any) => m.id === contributorMemberId,
        );
        expect(removed).toBeUndefined();
      });

      it('should return 404 for non-existent member id', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/workspaces/members/${nonExistentId()}`)
          .set('Authorization', `Bearer ${ownerToken}`);

        expect(response.status).toBe(404);
      });

      it('should return 401 without auth token', async () => {
        const response = await request(app.getHttpServer()).delete(
          `/workspaces/members/${nonExistentId()}`,
        );

        expect(response.status).toBe(401);
      });
    });
  });
});
