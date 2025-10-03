// @ts-check
import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
  return await context.fetch(BASE + path, init);
}

test('ssh keys status, upload private/public, delete', async ({ request }) => {
  const username = `su_keys_${Date.now()}`;
  const password = 'S#Pass12345';
  await api(request, '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: { username, password, role: 'ENI-SUPERUSER' } });
  await api(request, '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: { username, password } });

  // initial status
  const before = await api(request, '/api/ssh-keys/status');
  expect(before.status()).toBe(200);
  const s0 = await before.json();

  // upload private and public
  const PRIVATE = Buffer.from('dummy-private-key');
  const PUBLIC = Buffer.from('ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC test@host');
  const up = await request.post(BASE + '/api/ssh-keys/upload', {
    multipart: {
      private: { name: 'private', buffer: PRIVATE, mimeType: 'application/octet-stream' },
      public: { name: 'public', buffer: PUBLIC, mimeType: 'text/plain' }
    }
  });
  expect([200, 201]).toContain(up.status());

  const after = await api(request, '/api/ssh-keys/status');
  expect(after.status()).toBe(200);
  const s1 = await after.json();
  expect(s1.hasPrivate).toBeTruthy();
  expect(s1.hasPublic).toBeTruthy();

  // delete
  const del = await api(request, '/api/ssh-keys', { method: 'DELETE' });
  expect(del.status()).toBe(204);

  const final = await api(request, '/api/ssh-keys/status');
  expect(final.status()).toBe(200);
  const s2 = await final.json();
  expect(s2.hasPrivate).toBeFalsy();
  expect(s2.hasPublic).toBeFalsy();
});