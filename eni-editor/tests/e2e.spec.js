// @ts-check
import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	const res = await context.fetch(BASE + path, init);
	return res;
}

test.describe('ENI-Editor basic flows', () => {
	test('health endpoint', async ({ request }) => {
		const res = await api(request, '/healthz');
		expect(res.status()).toBe(200);
		const json = await res.json();
		expect(json.status).toBe('ok');
	});

	test('register and login', async ({ request }) => {
		const reg = await api(request, '/api/auth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			data: { username: 'tester', password: 'Test#1234', role: 'ENI-SUPERUSER' }
		});
		expect([200, 201, 409]).toContain(reg.status());
		const login = await api(request, '/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			data: { username: 'tester', password: 'Test#1234' }
		});
		expect(login.status()).toBe(200);
	});

	test('settings and config API', async ({ request }) => {
		const s1 = await api(request, '/api/settings');
		expect(s1.status()).toBe(200);
		const put = await api(request, '/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, data: { rp_count: 2 } });
		expect(put.status()).toBe(200);
		const cfgPut = await api(request, '/api/config', { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, data: 'EMAIL_RECIPIENT=you@example.com' });
		expect(cfgPut.status()).toBe(200);
		const cfg = await api(request, '/api/config');
		expect(cfg.status()).toBe(200);
		const cfgJson = await cfg.json();
		expect(cfgJson.entries.EMAIL_RECIPIENT).toBe('you@example.com');
	});
});