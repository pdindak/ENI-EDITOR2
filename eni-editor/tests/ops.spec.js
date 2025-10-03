// @ts-check
import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
  return await context.fetch(BASE + path, init);
}

test.describe('Ops routes', () => {
  test('logs listing and endpoints behavior without SSH keys', async ({ request }) => {
    const username = `su_ops_${Date.now()}`;
    const password = 'S#Pass12345';
    await api(request, '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: { username, password, role: 'ENI-SUPERUSER' } });
    await api(request, '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: { username, password } });

    // logs endpoint should be accessible
    const logs1 = await api(request, '/api/ops/logs');
    expect(logs1.status()).toBe(200);
    const arr1 = await logs1.json();
    expect(Array.isArray(arr1)).toBeTruthy();

    // get-config should fail when no ENI servers/keys available
    const getCfg = await api(request, '/api/ops/get-config', { method: 'POST' });
    expect([400, 401, 403, 500]).toContain(getCfg.status());

    // commit-config will return 500 when no SSH key/devices are configured; accept 200 or 500
    const commit = await api(request, '/api/ops/commit-config', { method: 'POST' });
    expect([200, 500]).toContain(commit.status());

    // logs endpoint should remain accessible
    const logs2 = await api(request, '/api/ops/logs');
    expect(logs2.status()).toBe(200);
  });
});