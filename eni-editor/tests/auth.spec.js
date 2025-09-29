// @ts-check
import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

test('register, login, me, logout', async ({ request }) => {
	const username = `tester_${Date.now()}`;
	const password = 'Test#12345';
	// register SUPERUSER
	const reg = await api(request, '/api/auth/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: { username, password, role: 'ENI-SUPERUSER' }
	});
	expect([201, 409]).toContain(reg.status());
	// login
	const login = await api(request, '/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: { username, password }
	});
	expect(login.status()).toBe(200);
	// me
	const me = await api(request, '/api/auth/me');
	expect(me.status()).toBe(200);
	const json = await me.json();
	expect(json.user.username).toBe(username);
	// logout
	const out = await api(request, '/api/auth/logout', { method: 'POST' });
	expect(out.status()).toBe(204);
});

