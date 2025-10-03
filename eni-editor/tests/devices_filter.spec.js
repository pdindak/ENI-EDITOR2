// @ts-check
import { test, expect } from '@playwright/test';
import { expectOk } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
  return await context.fetch(BASE + path, init);
}

test('devices filter by type', async ({ request }) => {
  // Add one ENI_SERVER and one RASPBERRY_PI
  const name1 = `srv_${Date.now()}`;
  const add1 = await api(request, '/api/devices', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    data: { name: name1, host: '10.0.0.1', port: 22, type: 'ENI_SERVER', active: true }
  });
  await expectOk(add1, 201);

  const name2 = `rp_${Date.now()}`;
  const add2 = await api(request, '/api/devices', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    data: { name: name2, host: '10.0.0.2', port: 22, type: 'RASPBERRY_PI', active: true }
  });
  await expectOk(add2, 201);

  // Filter ENI_SERVER
  const sRes = await api(request, '/api/devices?type=ENI_SERVER');
  expect(sRes.status()).toBe(200);
  const sArr = await sRes.json();
  expect(sArr.every(d => d.type === 'ENI_SERVER')).toBe(true);

  // Filter RASPBERRY_PI
  const rRes = await api(request, '/api/devices?type=RASPBERRY_PI');
  expect(rRes.status()).toBe(200);
  const rArr = await rRes.json();
  expect(rArr.every(d => d.type === 'RASPBERRY_PI')).toBe(true);
});