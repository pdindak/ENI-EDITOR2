// @ts-check
const { test, expect } = require('@playwright/test');
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

test('settings update and config roundtrip', async ({ request }) => {
	const s1 = await api(request, '/api/settings');
	expect(s1.status()).toBe(200);
	const put = await api(request, '/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, data: { rp_count: 3 } });
	expect(put.status()).toBe(200);
	const cfgPut = await api(request, '/api/config', { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, data: 'RP1_PING_COMMENT="A"\nRP2_PING_COMMENT="B"' });
	expect(cfgPut.status()).toBe(200);
	const cfg = await api(request, '/api/config');
	expect(cfg.status()).toBe(200);
	const cfgJson = await cfg.json();
	expect(cfgJson.entries.RP1_PING_COMMENT).toBe('"A"');
	expect(cfgJson.entries.RP2_PING_COMMENT).toBe('"B"');
});

