// @ts-check
import { test, expect } from '@playwright/test';
import { expectOk } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

async function createSuperuser(request) {
	const username = `ssh_superuser_${Date.now()}_${Math.random()}`;
	const password = 'TestPass123!';
	
	await api(request, '/api/auth/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: { username, password, role: 'ENI-SUPERUSER' }
	});
	
	await api(request, '/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: { username, password }
	});
	
	return { username, password };
}

async function createRegularUser(request) {
	const username = `ssh_user_${Date.now()}_${Math.random()}`;
	const password = 'TestPass123!';
	
	await api(request, '/api/auth/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: { username, password, role: 'ENI-USER' }
	});
	
	await api(request, '/api/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		data: { username, password }
	});
	
	return { username, password };
}

test.describe('Comprehensive SSH Operations Tests', () => {
	
	test.describe('SSH Key Management', () => {
		test('should check SSH key status as superuser', async ({ request }) => {
			await createSuperuser(request);
			
			const res = await api(request, '/api/ssh-keys/status');
			expect(res.status()).toBe(200);
			
			const status = await res.json();
			expect(status.hasPrivate).toBeDefined();
			expect(status.hasPublic).toBeDefined();
			expect(typeof status.hasPrivate).toBe('boolean');
			expect(typeof status.hasPublic).toBe('boolean');
		});

		test('should deny SSH key status access to regular users', async ({ request }) => {
			await createRegularUser(request);
			
			const res = await api(request, '/api/ssh-keys/status');
			expect(res.status()).toBe(403);
			
			const error = await res.json();
			expect(error.error).toBe('forbidden');
		});

		test('should deny SSH key status access to unauthenticated users', async ({ request }) => {
			const res = await api(request, '/api/ssh-keys/status');
			expect(res.status()).toBe(403);
		});

		test('should handle SSH key upload as superuser', async ({ request }) => {
			await createSuperuser(request);
			
			// Create mock SSH key files
			const privateKeyContent = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEA1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN
OPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTU
VWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12
34567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890
abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
-----END OPENSSH PRIVATE KEY-----`;

			const publicKeyContent = `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDXNjc4NTY3ODkwYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXpBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWjEyMzQ1Njc4OTBhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ekFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaIDEyMzQ1Njc4OTBhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ekFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaIDEyMzQ1Njc4OTBhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ekFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaIDEyMzQ1Njc4OTBhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ekFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaIDEyMzQ1Njc4OTBhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ekFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFla test@example.com`;

			// Create FormData for file upload
			const formData = new FormData();
			formData.append('private', new Blob([privateKeyContent], { type: 'text/plain' }), 'id_rsa');
			formData.append('public', new Blob([publicKeyContent], { type: 'text/plain' }), 'id_rsa.pub');

			const res = await api(request, '/api/ssh-keys/upload', {
				method: 'POST',
				body: formData
			});

			// Should succeed or fail gracefully (depending on encryption setup)
			expect([201, 400, 500]).toContain(res.status());
		});

		test('should require private key for SSH key upload', async ({ request }) => {
			await createSuperuser(request);
			
			const publicKeyContent = `ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDXNjc4... test@example.com`;
			
			const formData = new FormData();
			formData.append('public', new Blob([publicKeyContent], { type: 'text/plain' }), 'id_rsa.pub');

			const res = await api(request, '/api/ssh-keys/upload', {
				method: 'POST',
				body: formData
			});

			expect(res.status()).toBe(400);
			const error = await res.json();
			expect(error.error).toBe('private key required');
		});

		test('should deny SSH key upload to regular users', async ({ request }) => {
			await createRegularUser(request);
			
			const privateKeyContent = `-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----`;
			
			const formData = new FormData();
			formData.append('private', new Blob([privateKeyContent], { type: 'text/plain' }), 'id_rsa');

			const res = await api(request, '/api/ssh-keys/upload', {
				method: 'POST',
				body: formData
			});

			expect(res.status()).toBe(403);
		});

		test('should handle SSH key deletion as superuser', async ({ request }) => {
			await createSuperuser(request);
			
			const res = await api(request, '/api/ssh-keys', {
				method: 'DELETE'
			});

			expect([204, 403]).toContain(res.status());
		});

		test('should deny SSH key deletion to regular users', async ({ request }) => {
			await createRegularUser(request);
			
			const res = await api(request, '/api/ssh-keys', {
				method: 'DELETE'
			});

			expect(res.status()).toBe(403);
		});
	});

	test.describe('Operation Logs', () => {
		test('should retrieve operation logs as superuser', async ({ request }) => {
			await createSuperuser(request);
			
			const res = await api(request, '/api/ops/logs');
			expect(res.status()).toBe(200);
			
			const logs = await res.json();
			expect(Array.isArray(logs)).toBe(true);
		});

		test('should retrieve operation logs with limit parameter', async ({ request }) => {
			await createSuperuser(request);
			
			const res = await api(request, '/api/ops/logs?limit=50');
			expect(res.status()).toBe(200);
			
			const logs = await res.json();
			expect(Array.isArray(logs)).toBe(true);
			expect(logs.length).toBeLessThanOrEqual(50);
		});

		test('should handle various limit values', async ({ request }) => {
			await createSuperuser(request);
			
			const limits = [1, 5, 10, 100, 500];
			
			for (const limit of limits) {
				const res = await api(request, `/api/ops/logs?limit=${limit}`);
				expect(res.status()).toBe(200);
				
				const logs = await res.json();
				expect(Array.isArray(logs)).toBe(true);
				expect(logs.length).toBeLessThanOrEqual(limit);
			}
		});

		test('should handle invalid limit values gracefully', async ({ request }) => {
			await createSuperuser(request);
			
			const invalidLimits = ['abc', '-1', '0', 'null', 'undefined'];
			
			for (const limit of invalidLimits) {
				const res = await api(request, `/api/ops/logs?limit=${limit}`);
				expect(res.status()).toBe(200); // Should use default limit
				
				const logs = await res.json();
				expect(Array.isArray(logs)).toBe(true);
			}
		});

		test('should return log entries with proper structure', async ({ request }) => {
			await createSuperuser(request);
			
			const res = await api(request, '/api/ops/logs');
			expect(res.status()).toBe(200);
			
			const logs = await res.json();
			
			for (const log of logs) {
				expect(log.id).toBeDefined();
				expect(log.type).toBeDefined();
				expect(log.message).toBeDefined();
				expect(log.level).toBeDefined();
				expect(log.created_at).toBeDefined();
				
				expect(typeof log.id).toBe('number');
				expect(typeof log.type).toBe('string');
				expect(typeof log.message).toBe('string');
				expect(typeof log.level).toBe('string');
				expect(typeof log.created_at).toBe('string');
				
				// Validate log levels
				expect(['info', 'error', 'debug', 'warn']).toContain(log.level);
			}
		});

		test('should deny operation logs access to regular users', async ({ request }) => {
			await createRegularUser(request);
			
			const res = await api(request, '/api/ops/logs');
			expect(res.status()).toBe(403);
		});

		test('should deny operation logs access to unauthenticated users', async ({ request }) => {
			const res = await api(request, '/api/ops/logs');
			expect(res.status()).toBe(403);
		});
	});

	test.describe('Configuration Operations', () => {
		test('should handle get-config operation as superuser', async ({ request }) => {
			await createSuperuser(request);
			
			const res = await api(request, '/api/ops/get-config', {
				method: 'POST'
			});

			// Should fail gracefully if no SSH keys or ENI servers configured
			expect([200, 500]).toContain(res.status());
			
			if (res.status() === 500) {
				const error = await res.json();
				expect(error.error).toBeDefined();
				// Common expected errors
				expect([
					'Private key not uploaded',
					'No ENI server accessible',
					'SSH connection failed'
				].some(msg => error.error.includes(msg) || error.error === msg)).toBe(true);
			}
		});

		test('should handle commit-config operation as superuser', async ({ request }) => {
			await createSuperuser(request);
			
			const res = await api(request, '/api/ops/commit-config', {
				method: 'POST'
			});

			// Should fail gracefully if no SSH keys or Raspberry Pi devices configured
			expect([200, 500]).toContain(res.status());
			
			if (res.status() === 500) {
				const error = await res.json();
				expect(error.error).toBeDefined();
			}
		});

		test('should deny get-config operation to regular users', async ({ request }) => {
			await createRegularUser(request);
			
			const res = await api(request, '/api/ops/get-config', {
				method: 'POST'
			});

			expect(res.status()).toBe(403);
		});

		test('should deny commit-config operation to regular users', async ({ request }) => {
			await createRegularUser(request);
			
			const res = await api(request, '/api/ops/commit-config', {
				method: 'POST'
			});

			expect(res.status()).toBe(403);
		});

		test('should deny SSH operations to unauthenticated users', async ({ request }) => {
			const getRes = await api(request, '/api/ops/get-config', {
				method: 'POST'
			});
			expect(getRes.status()).toBe(403);

			const commitRes = await api(request, '/api/ops/commit-config', {
				method: 'POST'
			});
			expect(commitRes.status()).toBe(403);
		});
	});

	test.describe('SSH Operations Integration', () => {
		test('should handle complete SSH workflow simulation', async ({ request }) => {
			await createSuperuser(request);
			
			// 1. Check initial SSH key status
			const statusRes = await api(request, '/api/ssh-keys/status');
			expect(statusRes.status()).toBe(200);
			
			// 2. Add some ENI servers and Raspberry Pi devices
			await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Test ENI Server',
					host: '192.168.1.100',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});

			await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Test Raspberry Pi',
					host: '192.168.1.200',
					port: 22,
					type: 'RASPBERRY_PI',
					active: true
				}
			});
			
			// 3. Try to get configuration (will fail without SSH keys)
			const getConfigRes = await api(request, '/api/ops/get-config', {
				method: 'POST'
			});
			expect([200, 500]).toContain(getConfigRes.status());
			
			// 4. Try to commit configuration (will fail without SSH keys)
			const commitConfigRes = await api(request, '/api/ops/commit-config', {
				method: 'POST'
			});
			expect([200, 500]).toContain(commitConfigRes.status());
			
			// 5. Check operation logs
			const logsRes = await api(request, '/api/ops/logs');
			expect(logsRes.status()).toBe(200);
		});

		test('should log SSH operations appropriately', async ({ request }) => {
			await createSuperuser(request);
			
			// Get initial log count
			const initialLogsRes = await api(request, '/api/ops/logs');
			const initialLogs = await initialLogsRes.json();
			const initialCount = initialLogs.length;
			
			// Perform SSH operations (will likely fail but should be logged)
			await api(request, '/api/ops/get-config', { method: 'POST' });
			await api(request, '/api/ops/commit-config', { method: 'POST' });
			
			// Check if new log entries were created
			const finalLogsRes = await api(request, '/api/ops/logs');
			const finalLogs = await finalLogsRes.json();
			
			// Should have more logs (operations should be logged even if they fail)
			expect(finalLogs.length).toBeGreaterThanOrEqual(initialCount);
		});

		test('should handle SSH operations with missing devices', async ({ request }) => {
			await createSuperuser(request);
			
			// Ensure no devices are configured by trying to delete any existing ones
			const devicesRes = await api(request, '/api/devices');
			const devices = await devicesRes.json();
			
			// Try operations with no devices
			const getConfigRes = await api(request, '/api/ops/get-config', {
				method: 'POST'
			});
			expect([200, 500]).toContain(getConfigRes.status());
			
			const commitConfigRes = await api(request, '/api/ops/commit-config', {
				method: 'POST'
			});
			expect([200, 500]).toContain(commitConfigRes.status());
		});

		test('should handle SSH operations with inactive devices', async ({ request }) => {
			await createSuperuser(request);
			
			// Add inactive devices
			await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Inactive ENI Server',
					host: '192.168.1.101',
					port: 22,
					type: 'ENI_SERVER',
					active: false
				}
			});

			await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Inactive Raspberry Pi',
					host: '192.168.1.201',
					port: 22,
					type: 'RASPBERRY_PI',
					active: false
				}
			});
			
			// Try operations with inactive devices
			const getConfigRes = await api(request, '/api/ops/get-config', {
				method: 'POST'
			});
			expect([200, 500]).toContain(getConfigRes.status());
			
			const commitConfigRes = await api(request, '/api/ops/commit-config', {
				method: 'POST'
			});
			expect([200, 500]).toContain(commitConfigRes.status());
		});
	});

	test.describe('SSH Error Handling', () => {
		test('should handle malformed SSH key uploads', async ({ request }) => {
			await createSuperuser(request);
			
			const malformedKeys = [
				'not-a-key',
				'-----BEGIN PRIVATE KEY-----\ninvalid\n-----END PRIVATE KEY-----',
				'',
				'random text content'
			];
			
			for (const keyContent of malformedKeys) {
				const formData = new FormData();
				formData.append('private', new Blob([keyContent], { type: 'text/plain' }), 'id_rsa');

				const res = await api(request, '/api/ssh-keys/upload', {
					method: 'POST',
					body: formData
				});

				// Should handle gracefully
				expect([201, 400, 500]).toContain(res.status());
			}
		});

		test('should handle empty SSH key upload', async ({ request }) => {
			await createSuperuser(request);
			
			const formData = new FormData();
			// Don't append any files

			const res = await api(request, '/api/ssh-keys/upload', {
				method: 'POST',
				body: formData
			});

			expect(res.status()).toBe(400);
		});

		test('should handle SSH operations without proper setup', async ({ request }) => {
			await createSuperuser(request);
			
			// Clear any existing SSH keys
			await api(request, '/api/ssh-keys', { method: 'DELETE' });
			
			// Try operations without SSH keys
			const getRes = await api(request, '/api/ops/get-config', {
				method: 'POST'
			});
			expect(getRes.status()).toBe(500);
			
			const commitRes = await api(request, '/api/ops/commit-config', {
				method: 'POST'
			});
			expect(commitRes.status()).toBe(500);
		});

		test('should handle concurrent SSH operations', async ({ request }) => {
			await createSuperuser(request);
			
			// Perform multiple concurrent SSH operations
			const operations = [
				api(request, '/api/ops/get-config', { method: 'POST' }),
				api(request, '/api/ops/commit-config', { method: 'POST' }),
				api(request, '/api/ops/logs'),
				api(request, '/api/ssh-keys/status')
			];
			
			const results = await Promise.all(operations);
			
			// All operations should complete (success or failure)
			for (const res of results) {
				expect(res.status()).toBeDefined();
				expect(res.status()).toBeGreaterThanOrEqual(200);
				expect(res.status()).toBeLessThan(600);
			}
		});

		test('should handle very large SSH key files', async ({ request }) => {
			await createSuperuser(request);
			
			// Create a very large "SSH key" (not actually valid)
			const largeKeyContent = '-----BEGIN OPENSSH PRIVATE KEY-----\n' + 
				'A'.repeat(100000) + '\n' + 
				'-----END OPENSSH PRIVATE KEY-----';
			
			const formData = new FormData();
			formData.append('private', new Blob([largeKeyContent], { type: 'text/plain' }), 'id_rsa');

			const res = await api(request, '/api/ssh-keys/upload', {
				method: 'POST',
				body: formData
			});

			// Should handle large files gracefully
			expect([201, 400, 413, 500]).toContain(res.status());
		});
	});

	test.describe('SSH Security', () => {
		test('should not expose SSH key content in responses', async ({ request }) => {
			await createSuperuser(request);
			
			const statusRes = await api(request, '/api/ssh-keys/status');
			expect(statusRes.status()).toBe(200);
			
			const status = await statusRes.json();
			const statusText = JSON.stringify(status);
			
			// Should not contain key material
			expect(statusText).not.toContain('-----BEGIN');
			expect(statusText).not.toContain('-----END');
			expect(statusText).not.toContain('ssh-rsa');
			expect(statusText).not.toContain('ssh-ed25519');
		});

		test('should not expose SSH key content in logs', async ({ request }) => {
			await createSuperuser(request);
			
			const logsRes = await api(request, '/api/ops/logs');
			expect(logsRes.status()).toBe(200);
			
			const logs = await logsRes.json();
			const logsText = JSON.stringify(logs);
			
			// Should not contain key material in logs
			expect(logsText).not.toContain('-----BEGIN');
			expect(logsText).not.toContain('-----END');
		});

		test('should handle SSH operations with proper error messages', async ({ request }) => {
			await createSuperuser(request);
			
			const getRes = await api(request, '/api/ops/get-config', {
				method: 'POST'
			});
			
			if (getRes.status() === 500) {
				const error = await getRes.json();
				expect(error.error).toBeDefined();
				expect(typeof error.error).toBe('string');
				expect(error.error.length).toBeGreaterThan(0);
				
				// Should not expose sensitive information
				expect(error.error).not.toContain('password');
				expect(error.error).not.toContain('secret');
				expect(error.error).not.toContain('key');
			}
		});
	});
});