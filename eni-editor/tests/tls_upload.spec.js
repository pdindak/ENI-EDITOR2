// @ts-check
import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
  return await context.fetch(BASE + path, init);
}

// Minimal fake PEM contents for testing upload endpoints
const FAKE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIBPAIBAAJBAKQ=\n-----END PRIVATE KEY-----\n`;
const FAKE_CERT = `-----BEGIN CERTIFICATE-----\nMIIBszCCAVugAwIBAgIBADANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAlleGFt\n-----END CERTIFICATE-----\n`;
const FAKE_CHAIN = `-----BEGIN CERTIFICATE-----\nCHAIN\n-----END CERTIFICATE-----\n`;

// Upload PEM pair and then check status changes
 test('tls upload pem + reload', async ({ request }) => {
  const username = `su_tls_${Date.now()}`;
  const password = 'S#Pass12345';
  await api(request, '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: { username, password, role: 'ENI-SUPERUSER' } });
  await api(request, '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: { username, password } });

  // Before upload
  const before = await api(request, '/api/tls/status');
  expect(before.status()).toBe(200);
  const beforeJson = await before.json();

  // Upload PEMs via multipart
  const res = await request.post(BASE + '/api/tls/upload/pem', {
    multipart: {
      key: { name: 'key', mimeType: 'application/x-pem-file', buffer: Buffer.from(FAKE_KEY, 'utf8') },
      cert: { name: 'cert', mimeType: 'application/x-pem-file', buffer: Buffer.from(FAKE_CERT, 'utf8') },
      chain: { name: 'chain', mimeType: 'application/x-pem-file', buffer: Buffer.from(FAKE_CHAIN, 'utf8') }
    }
  });
  expect([200, 201]).toContain(res.status());

  // Reload
  const reload = await api(request, '/api/tls/reload', { method: 'POST' });
  expect(reload.status()).toBe(200);

  // After upload
  const after = await api(request, '/api/tls/status');
  expect(after.status()).toBe(200);
  const afterJson = await after.json();

  // At least key/cert presence should be true after upload
  expect(afterJson.key).toBeTruthy();
  expect(afterJson.crt).toBeTruthy();
});