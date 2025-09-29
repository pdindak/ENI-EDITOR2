// @ts-check
const { test, expect } = require('@playwright/test');
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

test('tls status is accessible after login', async ({ request }) => {
	// create user
	const username = `su_${Date.now()}`;
	const password = 'S#Pass1234';
	await api(request, '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: { username, password, role: 'ENI-SUPERUSER' } });
	await api(request, '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: { username, password } });
	const res = await api(request, '/api/tls/status');
	expect(res.status()).toBe(200);
});

