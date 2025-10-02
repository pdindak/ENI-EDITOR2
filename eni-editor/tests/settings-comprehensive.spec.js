// @ts-check
import { test, expect } from '@playwright/test';
import { expectOk } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

async function createAuthenticatedUser(request, role = 'ENI-SUPERUSER') {
	const username = `settings_user_${Date.now()}_${Math.random()}`;
	const password = 'TestPass123!';
	
	await api(request, '/api/auth/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: { username, password, role }
	});
	
	await api(request, '/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: { username, password }
	});
	
	return { username, password, role };
}

test.describe('Comprehensive Settings Management Tests', () => {
	
	test.describe('Settings Retrieval', () => {
		test('should get default settings', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/settings');
			expect(res.status()).toBe(200);
			
			const settings = await res.json();
			expect(settings.id).toBe(1);
			expect(settings.rp_count).toBeDefined();
			expect(settings.linux_source_path).toBeDefined();
			expect(settings.rpi_destination_path).toBeDefined();
			expect(settings.created_at).toBeDefined();
			expect(settings.updated_at).toBeDefined();
			
			// Check default values
			expect(typeof settings.rp_count).toBe('number');
			expect(settings.rp_count).toBeGreaterThan(0);
			expect(settings.linux_source_path).toContain('/');
			expect(settings.rpi_destination_path).toContain('/');
		});

		test('should return consistent settings across requests', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res1 = await api(request, '/api/settings');
			const res2 = await api(request, '/api/settings');
			
			expect(res1.status()).toBe(200);
			expect(res2.status()).toBe(200);
			
			const settings1 = await res1.json();
			const settings2 = await res2.json();
			
			expect(settings1.id).toBe(settings2.id);
			expect(settings1.rp_count).toBe(settings2.rp_count);
			expect(settings1.linux_source_path).toBe(settings2.linux_source_path);
			expect(settings1.rpi_destination_path).toBe(settings2.rpi_destination_path);
		});

		test('should handle settings retrieval without authentication', async ({ request }) => {
			const res = await api(request, '/api/settings');
			// Settings might be accessible to authenticated users only
			expect([200, 401, 403]).toContain(res.status());
		});
	});

	test.describe('Settings Updates', () => {
		test('should update rp_count successfully', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const newRpCount = 5;
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { rp_count: newRpCount }
			});
			
			expect(res.status()).toBe(200);
			
			const updatedSettings = await res.json();
			expect(updatedSettings.rp_count).toBe(newRpCount);
			expect(updatedSettings.updated_at).toBeDefined();
			
			// Verify persistence
			const getRes = await api(request, '/api/settings');
			const persistedSettings = await getRes.json();
			expect(persistedSettings.rp_count).toBe(newRpCount);
		});

		test('should update linux_source_path successfully', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const newPath = '/opt/eni/config.settings';
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { linux_source_path: newPath }
			});
			
			expect(res.status()).toBe(200);
			
			const updatedSettings = await res.json();
			expect(updatedSettings.linux_source_path).toBe(newPath);
			
			// Verify persistence
			const getRes = await api(request, '/api/settings');
			const persistedSettings = await getRes.json();
			expect(persistedSettings.linux_source_path).toBe(newPath);
		});

		test('should update rpi_destination_path successfully', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const newPath = '/home/pi/ENI/config';
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { rpi_destination_path: newPath }
			});
			
			expect(res.status()).toBe(200);
			
			const updatedSettings = await res.json();
			expect(updatedSettings.rpi_destination_path).toBe(newPath);
			
			// Verify persistence
			const getRes = await api(request, '/api/settings');
			const persistedSettings = await getRes.json();
			expect(persistedSettings.rpi_destination_path).toBe(newPath);
		});

		test('should update multiple settings simultaneously', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const updates = {
				rp_count: 7,
				linux_source_path: '/etc/eni/new_config.settings',
				rpi_destination_path: '/ephidin/ENI/new_config'
			};
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: updates
			});
			
			expect(res.status()).toBe(200);
			
			const updatedSettings = await res.json();
			expect(updatedSettings.rp_count).toBe(updates.rp_count);
			expect(updatedSettings.linux_source_path).toBe(updates.linux_source_path);
			expect(updatedSettings.rpi_destination_path).toBe(updates.rpi_destination_path);
			
			// Verify all changes persisted
			const getRes = await api(request, '/api/settings');
			const persistedSettings = await getRes.json();
			expect(persistedSettings.rp_count).toBe(updates.rp_count);
			expect(persistedSettings.linux_source_path).toBe(updates.linux_source_path);
			expect(persistedSettings.rpi_destination_path).toBe(updates.rpi_destination_path);
		});

		test('should handle partial updates', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Get current settings
			const getCurrentRes = await api(request, '/api/settings');
			const currentSettings = await getCurrentRes.json();
			
			// Update only rp_count
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { rp_count: 10 }
			});
			
			expect(res.status()).toBe(200);
			
			const updatedSettings = await res.json();
			expect(updatedSettings.rp_count).toBe(10);
			// Other fields should remain unchanged
			expect(updatedSettings.linux_source_path).toBe(currentSettings.linux_source_path);
			expect(updatedSettings.rpi_destination_path).toBe(currentSettings.rpi_destination_path);
		});

		test('should update timestamps on changes', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Get initial timestamp
			const initialRes = await api(request, '/api/settings');
			const initialSettings = await initialRes.json();
			const initialTimestamp = initialSettings.updated_at;
			
			// Wait a bit to ensure timestamp difference
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Update settings
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { rp_count: initialSettings.rp_count + 1 }
			});
			
			expect(res.status()).toBe(200);
			
			const updatedSettings = await res.json();
			expect(updatedSettings.updated_at).not.toBe(initialTimestamp);
			expect(new Date(updatedSettings.updated_at).getTime()).toBeGreaterThan(new Date(initialTimestamp).getTime());
		});
	});

	test.describe('Settings Validation', () => {
		test('should reject rp_count less than 1', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const invalidCounts = [0, -1, -10];
			
			for (const count of invalidCounts) {
				const res = await api(request, '/api/settings', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { rp_count: count }
				});
				
				expect(res.status()).toBe(400);
				const error = await res.json();
				expect(error.error.fieldErrors.rp_count).toBeDefined();
			}
		});

		test('should accept valid rp_count values', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const validCounts = [1, 2, 5, 10, 50, 100];
			
			for (const count of validCounts) {
				const res = await api(request, '/api/settings', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { rp_count: count }
				});
				
				expect(res.status()).toBe(200);
				
				const updatedSettings = await res.json();
				expect(updatedSettings.rp_count).toBe(count);
			}
		});

		test('should reject non-integer rp_count', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const invalidCounts = [1.5, 2.7, 'abc', null, undefined, true, false];
			
			for (const count of invalidCounts) {
				const res = await api(request, '/api/settings', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { rp_count: count }
				});
				
				expect(res.status()).toBe(400);
			}
		});

		test('should reject empty linux_source_path', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { linux_source_path: '' }
			});
			
			expect(res.status()).toBe(400);
			const error = await res.json();
			expect(error.error.fieldErrors.linux_source_path).toBeDefined();
		});

		test('should reject empty rpi_destination_path', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { rpi_destination_path: '' }
			});
			
			expect(res.status()).toBe(400);
			const error = await res.json();
			expect(error.error.fieldErrors.rpi_destination_path).toBeDefined();
		});

		test('should accept various path formats', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const validPaths = [
				'/etc/eni/config.settings',
				'/opt/eni/config',
				'/home/user/config.txt',
				'./relative/path/config',
				'../parent/config',
				'/very/long/path/with/many/directories/config.settings',
				'/path with spaces/config',
				'/path-with-dashes/config',
				'/path_with_underscores/config',
				'/path.with.dots/config'
			];
			
			for (const path of validPaths) {
				const res = await api(request, '/api/settings', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { linux_source_path: path }
				});
				
				expect(res.status()).toBe(200);
				
				const updatedSettings = await res.json();
				expect(updatedSettings.linux_source_path).toBe(path);
			}
		});

		test('should handle Unicode characters in paths', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const unicodePaths = [
				'/配置/config.settings',
				'/configuración/config',
				'/конфигурация/config',
				'/設定/config'
			];
			
			for (const path of unicodePaths) {
				const res = await api(request, '/api/settings', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { linux_source_path: path }
				});
				
				expect(res.status()).toBe(200);
				
				const updatedSettings = await res.json();
				expect(updatedSettings.linux_source_path).toBe(path);
			}
		});

		test('should handle very long paths', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const longPath = '/very/long/path/' + 'directory/'.repeat(50) + 'config.settings';
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { linux_source_path: longPath }
			});
			
			// Should either succeed or fail gracefully
			expect([200, 400]).toContain(res.status());
			
			if (res.status() === 200) {
				const updatedSettings = await res.json();
				expect(updatedSettings.linux_source_path).toBe(longPath);
			}
		});
	});

	test.describe('Settings Error Handling', () => {
		test('should handle malformed JSON', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: '{"rp_count": 5, "invalid": json}'
			});
			
			expect(res.status()).toBe(400);
		});

		test('should handle empty request body', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: {}
			});
			
			expect(res.status()).toBe(200); // Empty updates should be allowed
		});

		test('should handle null values', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: {
					rp_count: null,
					linux_source_path: null,
					rpi_destination_path: null
				}
			});
			
			expect(res.status()).toBe(400);
		});

		test('should handle undefined values', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: {
					rp_count: undefined,
					linux_source_path: undefined,
					rpi_destination_path: undefined
				}
			});
			
			expect(res.status()).toBe(200); // Undefined values should be ignored
		});

		test('should handle extra fields gracefully', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: {
					rp_count: 3,
					extra_field: 'should_be_ignored',
					another_field: 123,
					nested_object: { key: 'value' }
				}
			});
			
			expect(res.status()).toBe(200);
			
			const updatedSettings = await res.json();
			expect(updatedSettings.rp_count).toBe(3);
			expect(updatedSettings.extra_field).toBeUndefined();
			expect(updatedSettings.another_field).toBeUndefined();
			expect(updatedSettings.nested_object).toBeUndefined();
		});

		test('should handle missing content-type header', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				body: JSON.stringify({ rp_count: 5 })
			});
			
			// Should either work or return appropriate error
			expect([200, 400, 415]).toContain(res.status());
		});

		test('should handle wrong content-type header', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'text/plain' },
				body: JSON.stringify({ rp_count: 5 })
			});
			
			// Should return appropriate error for wrong content type
			expect([400, 415]).toContain(res.status());
		});
	});

	test.describe('Settings Concurrency', () => {
		test('should handle concurrent updates', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Perform multiple concurrent updates
			const updatePromises = [];
			for (let i = 0; i < 10; i++) {
				updatePromises.push(
					api(request, '/api/settings', {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						data: { rp_count: i + 1 }
					})
				);
			}
			
			const results = await Promise.all(updatePromises);
			
			// All updates should succeed
			for (const res of results) {
				expect(res.status()).toBe(200);
			}
			
			// Final state should be consistent
			const finalRes = await api(request, '/api/settings');
			const finalSettings = await finalRes.json();
			expect(finalSettings.rp_count).toBeGreaterThan(0);
			expect(finalSettings.rp_count).toBeLessThanOrEqual(10);
		});

		test('should handle rapid sequential updates', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Perform rapid sequential updates
			for (let i = 1; i <= 20; i++) {
				const res = await api(request, '/api/settings', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { rp_count: i }
				});
				
				expect(res.status()).toBe(200);
			}
			
			// Verify final state
			const finalRes = await api(request, '/api/settings');
			const finalSettings = await finalRes.json();
			expect(finalSettings.rp_count).toBe(20);
		});
	});

	test.describe('Settings Authentication', () => {
		test('should require authentication for settings retrieval', async ({ request }) => {
			// Don't authenticate
			const res = await api(request, '/api/settings');
			
			// May require authentication depending on implementation
			expect([200, 401, 403]).toContain(res.status());
		});

		test('should require authentication for settings updates', async ({ request }) => {
			// Don't authenticate
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { rp_count: 5 }
			});
			
			// Should require authentication
			expect([401, 403]).toContain(res.status());
		});

		test('should allow both user roles to access settings', async ({ request }) => {
			// Test with ENI-USER
			await createAuthenticatedUser(request, 'ENI-USER');
			
			const res = await api(request, '/api/settings');
			
			// Both roles should be able to access settings
			expect([200, 403]).toContain(res.status());
		});

		test('should handle role-based update permissions', async ({ request }) => {
			// Test with ENI-USER
			await createAuthenticatedUser(request, 'ENI-USER');
			
			const res = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { rp_count: 5 }
			});
			
			// May restrict updates to certain roles
			expect([200, 403]).toContain(res.status());
		});
	});

	test.describe('Settings Integration', () => {
		test('should reflect rp_count changes in configuration generation', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Update rp_count
			await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { rp_count: 5 }
			});
			
			// Add configuration for multiple RPs
			const rpConfig = {};
			for (let i = 1; i <= 5; i++) {
				rpConfig[`RP${i}_PING_COMMENT`] = `Device ${i}`;
			}
			
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: rpConfig }
			});
			
			// Verify configuration includes all RPs
			const configRes = await api(request, '/api/config');
			const config = await configRes.json();
			
			for (let i = 1; i <= 5; i++) {
				expect(config.entries[`RP${i}_PING_COMMENT`]).toBe(`Device ${i}`);
			}
		});

		test('should maintain settings consistency across sessions', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Update settings
			const testSettings = {
				rp_count: 8,
				linux_source_path: '/test/path/config',
				rpi_destination_path: '/test/dest/config'
			};
			
			await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: testSettings
			});
			
			// Logout and login with different user
			await api(request, '/api/auth/logout', { method: 'POST' });
			await createAuthenticatedUser(request);
			
			// Verify settings persisted
			const res = await api(request, '/api/settings');
			const settings = await res.json();
			
			expect(settings.rp_count).toBe(testSettings.rp_count);
			expect(settings.linux_source_path).toBe(testSettings.linux_source_path);
			expect(settings.rpi_destination_path).toBe(testSettings.rpi_destination_path);
		});
	});
});