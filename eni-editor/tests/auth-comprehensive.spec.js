// @ts-check
import { test, expect } from '@playwright/test';
import { expectOk } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

test.describe('Comprehensive Authentication Tests', () => {
	
	test.describe('User Registration', () => {
		test('should register ENI-USER successfully', async ({ request }) => {
			const username = `eni_user_${Date.now()}`;
			const password = 'TestPass123!';
			
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-USER' }
			});
			
			expect(res.status()).toBe(201);
			const json = await res.json();
			expect(json.ok).toBe(true);
		});

		test('should register ENI-SUPERUSER successfully', async ({ request }) => {
			const username = `eni_superuser_${Date.now()}`;
			const password = 'TestPass123!';
			
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-SUPERUSER' }
			});
			
			expect(res.status()).toBe(201);
			const json = await res.json();
			expect(json.ok).toBe(true);
		});

		test('should reject registration with missing username', async ({ request }) => {
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { password: 'TestPass123!', role: 'ENI-USER' }
			});
			
			expect(res.status()).toBe(400);
			const json = await res.json();
			expect(json.error).toBe('username, password, role required');
		});

		test('should reject registration with missing password', async ({ request }) => {
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: 'testuser', role: 'ENI-USER' }
			});
			
			expect(res.status()).toBe(400);
			const json = await res.json();
			expect(json.error).toBe('username, password, role required');
		});

		test('should reject registration with missing role', async ({ request }) => {
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: 'testuser', password: 'TestPass123!' }
			});
			
			expect(res.status()).toBe(400);
			const json = await res.json();
			expect(json.error).toBe('username, password, role required');
		});

		test('should reject registration with invalid role', async ({ request }) => {
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: 'testuser', password: 'TestPass123!', role: 'INVALID-ROLE' }
			});
			
			expect(res.status()).toBe(400);
			const json = await res.json();
			expect(json.error).toBe('invalid role');
		});

		test('should reject duplicate username registration', async ({ request }) => {
			const username = `duplicate_user_${Date.now()}`;
			const password = 'TestPass123!';
			
			// First registration
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-USER' }
			});
			
			// Second registration with same username
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-USER' }
			});
			
			expect(res.status()).toBe(409);
			const json = await res.json();
			expect(json.error).toBe('username already exists');
		});

		test('should handle empty request body', async ({ request }) => {
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {}
			});
			
			expect(res.status()).toBe(400);
			const json = await res.json();
			expect(json.error).toBe('username, password, role required');
		});

		test('should handle malformed JSON', async ({ request }) => {
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{"invalid": json}'
			});
			
			expect(res.status()).toBe(400);
		});
	});

	test.describe('User Login', () => {
		test('should login ENI-USER successfully', async ({ request }) => {
			const username = `login_user_${Date.now()}`;
			const password = 'TestPass123!';
			
			// Register user first
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-USER' }
			});
			
			// Login
			const res = await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password }
			});
			
			expect(res.status()).toBe(200);
			const json = await res.json();
			expect(json.ok).toBe(true);
		});

		test('should login ENI-SUPERUSER successfully', async ({ request }) => {
			const username = `login_superuser_${Date.now()}`;
			const password = 'TestPass123!';
			
			// Register user first
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-SUPERUSER' }
			});
			
			// Login
			const res = await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password }
			});
			
			expect(res.status()).toBe(200);
			const json = await res.json();
			expect(json.ok).toBe(true);
		});

		test('should reject login with wrong password', async ({ request }) => {
			const username = `wrong_pass_user_${Date.now()}`;
			const password = 'TestPass123!';
			
			// Register user first
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-USER' }
			});
			
			// Login with wrong password
			const res = await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password: 'WrongPassword!' }
			});
			
			expect(res.status()).toBe(401);
			const json = await res.json();
			expect(json.error).toBe('invalid credentials');
		});

		test('should reject login with non-existent user', async ({ request }) => {
			const res = await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: 'nonexistent_user', password: 'TestPass123!' }
			});
			
			expect(res.status()).toBe(401);
			const json = await res.json();
			expect(json.error).toBe('invalid credentials');
		});

		test('should reject login with missing username', async ({ request }) => {
			const res = await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { password: 'TestPass123!' }
			});
			
			expect(res.status()).toBe(400);
			const json = await res.json();
			expect(json.error).toBe('username and password required');
		});

		test('should reject login with missing password', async ({ request }) => {
			const res = await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: 'testuser' }
			});
			
			expect(res.status()).toBe(400);
			const json = await res.json();
			expect(json.error).toBe('username and password required');
		});

		test('should handle empty login request', async ({ request }) => {
			const res = await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {}
			});
			
			expect(res.status()).toBe(400);
			const json = await res.json();
			expect(json.error).toBe('username and password required');
		});
	});

	test.describe('Session Management', () => {
		test('should return user info after login', async ({ request }) => {
			const username = `session_user_${Date.now()}`;
			const password = 'TestPass123!';
			const role = 'ENI-SUPERUSER';
			
			// Register and login
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
			
			// Get user info
			const res = await api(request, '/api/auth/me');
			expect(res.status()).toBe(200);
			const json = await res.json();
			expect(json.user.username).toBe(username);
			expect(json.user.role).toBe(role);
			expect(json.user.id).toBeDefined();
		});

		test('should return null user when not logged in', async ({ request }) => {
			const res = await api(request, '/api/auth/me');
			expect(res.status()).toBe(200);
			const json = await res.json();
			expect(json.user).toBe(null);
		});

		test('should logout successfully', async ({ request }) => {
			const username = `logout_user_${Date.now()}`;
			const password = 'TestPass123!';
			
			// Register and login
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
			
			// Logout
			const res = await api(request, '/api/auth/logout', {
				method: 'POST'
			});
			
			expect(res.status()).toBe(204);
		});

		test('should clear session after logout', async ({ request }) => {
			const username = `clear_session_user_${Date.now()}`;
			const password = 'TestPass123!';
			
			// Register and login
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
			
			// Logout
			await api(request, '/api/auth/logout', {
				method: 'POST'
			});
			
			// Check session is cleared
			const res = await api(request, '/api/auth/me');
			expect(res.status()).toBe(200);
			const json = await res.json();
			expect(json.user).toBe(null);
		});

		test('should maintain session across requests', async ({ request }) => {
			const username = `maintain_session_user_${Date.now()}`;
			const password = 'TestPass123!';
			
			// Register and login
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
			
			// Multiple requests should maintain session
			for (let i = 0; i < 3; i++) {
				const res = await api(request, '/api/auth/me');
				expect(res.status()).toBe(200);
				const json = await res.json();
				expect(json.user.username).toBe(username);
			}
		});
	});

	test.describe('Password Security', () => {
		test('should handle various password formats', async ({ request }) => {
			const testCases = [
				'SimplePass123',
				'Complex!Pass@123#',
				'VeryLongPasswordWithManyCharacters123!@#',
				'短密码123', // Unicode characters
				'Pass with spaces 123!'
			];

			for (const password of testCases) {
				const username = `pass_test_${Date.now()}_${Math.random()}`;
				
				const res = await api(request, '/api/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: { username, password, role: 'ENI-USER' }
				});
				
				expect(res.status()).toBe(201);
				
				// Verify login works with the password
				const loginRes = await api(request, '/api/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: { username, password }
				});
				
				expect(loginRes.status()).toBe(200);
			}
		});

		test('should handle case sensitivity in passwords', async ({ request }) => {
			const username = `case_test_${Date.now()}`;
			const password = 'TestPass123!';
			
			// Register user
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-USER' }
			});
			
			// Try login with different case
			const res = await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password: 'testpass123!' }
			});
			
			expect(res.status()).toBe(401);
		});
	});

	test.describe('Username Validation', () => {
		test('should handle various username formats', async ({ request }) => {
			const validUsernames = [
				'user123',
				'test.user',
				'test_user',
				'test-user',
				'TestUser',
				'user@domain.com',
				'very.long.username.with.many.dots',
				'user123_test-name.email@domain'
			];

			for (const username of validUsernames) {
				const res = await api(request, '/api/auth/register', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: { username, password: 'TestPass123!', role: 'ENI-USER' }
				});
				
				expect([201, 409]).toContain(res.status()); // 201 for new, 409 for duplicate
			}
		});

		test('should handle case sensitivity in usernames', async ({ request }) => {
			const username = `CaseTest_${Date.now()}`;
			const password = 'TestPass123!';
			
			// Register user with mixed case
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-USER' }
			});
			
			// Try to register with different case
			const res = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: username.toLowerCase(), password, role: 'ENI-USER' }
			});
			
			// Should either succeed (case sensitive) or fail with conflict (case insensitive)
			expect([201, 409]).toContain(res.status());
		});
	});
});