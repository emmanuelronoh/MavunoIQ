import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();

describe('Auth', () => {
  it('registers a farmer', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'farmer1@test.local',
      password: 'Password123',
      firstName: 'A',
      lastName: 'B',
      role: 'FARMER',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('FARMER');
  });

  it('rejects admin self-registration', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'admin@test.local',
      password: 'Password123',
      firstName: 'A',
      lastName: 'B',
      role: 'ADMIN',
    });
    expect(res.status).toBe(422);
  });

  it('logs in and refreshes', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'farmer2@test.local',
      password: 'Password123',
      firstName: 'A',
      lastName: 'B',
      role: 'FARMER',
    });

    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'farmer2@test.local',
      password: 'Password123',
    });
    expect(login.status).toBe(200);
    const refreshToken = login.headers['set-cookie']?.find((c: string) => c.startsWith('mavunoiq_rt'));
    expect(refreshToken).toBeTruthy();

    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [refreshToken as string]);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nope@test.local',
      password: 'Password123',
    });
    expect(res.status).toBe(401);
  });
});