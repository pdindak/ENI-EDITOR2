// @ts-check
const { test, expect } = require('@playwright/test');
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

test('devices CRUD (API)', async ({ request }) => {
	const name = `eni_${Date.now()}`;
	const add = await api(request, '/api/devices', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: { name, host: '10.1.2.3', port: 22, type: 'ENI_SERVER', active: true }
	});
	expect(add.status()).toBe(201);
	const list = await api(request, '/api/devices');
	expect(list.status()).toBe(200);
	const arr = await list.json();
	const found = arr.find((d) => d.name === name);
	expect(found).toBeTruthy();
	const del = await api(request, `/api/devices?id=${found.id}`, { method: 'DELETE' });
	expect(del.status()).toBe(204);
});

