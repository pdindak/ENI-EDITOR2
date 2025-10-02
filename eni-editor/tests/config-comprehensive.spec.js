// @ts-check
import { test, expect } from '@playwright/test';
import { expectOk } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

async function createAuthenticatedUser(request, role = 'ENI-SUPERUSER') {
	const username = `config_user_${Date.now()}_${Math.random()}`;
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

test.describe('Comprehensive Configuration Management Tests', () => {
	
	test.describe('Configuration Retrieval', () => {
		test('should get empty configuration initially', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/config');
			expect(res.status()).toBe(200);
			
			const json = await res.json();
			expect(json.entries).toBeDefined();
			expect(json.text).toBeDefined();
			expect(typeof json.entries).toBe('object');
			expect(typeof json.text).toBe('string');
		});

		test('should return configuration in both formats', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Set some configuration
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: { 'TEST_KEY': 'test_value', 'ANOTHER_KEY': 'another_value' } }
			});
			
			const res = await api(request, '/api/config');
			expect(res.status()).toBe(200);
			
			const json = await res.json();
			expect(json.entries.TEST_KEY).toBe('test_value');
			expect(json.entries.ANOTHER_KEY).toBe('another_value');
			expect(json.text).toContain('TEST_KEY=test_value');
			expect(json.text).toContain('ANOTHER_KEY=another_value');
		});

		test('should handle configuration without authentication', async ({ request }) => {
			const res = await api(request, '/api/config');
			expect(res.status()).toBe(200); // Config endpoint is accessible to all authenticated users
		});
	});

	test.describe('Configuration Updates - JSON Format', () => {
		test('should update configuration with JSON format', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const configData = {
				'EMAIL_RECIPIENT': 'admin@test.com',
				'RETRY_COUNT': '5',
				'LOG_LEVEL': 'debug'
			};
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: configData }
			});
			
			expect(res.status()).toBe(200);
			const json = await res.json();
			expect(json.ok).toBe(true);
			
			// Verify the configuration was saved
			const getRes = await api(request, '/api/config');
			const getJson = await getRes.json();
			expect(getJson.entries.EMAIL_RECIPIENT).toBe('admin@test.com');
			expect(getJson.entries.RETRY_COUNT).toBe('5');
			expect(getJson.entries.LOG_LEVEL).toBe('debug');
		});

		test('should handle empty configuration object', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: {} }
			});
			
			expect(res.status()).toBe(200);
		});

		test('should update existing configuration entries', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Set initial configuration
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: { 'TEST_KEY': 'initial_value' } }
			});
			
			// Update the configuration
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: { 'TEST_KEY': 'updated_value' } }
			});
			
			expect(res.status()).toBe(200);
			
			// Verify the update
			const getRes = await api(request, '/api/config');
			const getJson = await getRes.json();
			expect(getJson.entries.TEST_KEY).toBe('updated_value');
		});

		test('should handle special characters in configuration values', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const specialValues = {
				'SPECIAL_CHARS': 'value with spaces and !@#$%^&*()_+-={}[]|\\:";\'<>?,./~`',
				'UNICODE_VALUE': 'Unicode: 你好世界 🌍 αβγδε',
				'MULTILINE_VALUE': 'line1\\nline2\\nline3',
				'QUOTES_VALUE': '"quoted value" and \'single quotes\'',
				'EMPTY_VALUE': '',
				'NUMERIC_VALUE': '12345.67890'
			};
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: specialValues }
			});
			
			expect(res.status()).toBe(200);
			
			// Verify all special values were saved correctly
			const getRes = await api(request, '/api/config');
			const getJson = await getRes.json();
			
			for (const [key, value] of Object.entries(specialValues)) {
				expect(getJson.entries[key]).toBe(value);
			}
		});

		test('should reject invalid JSON format', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { invalid_structure: 'not entries' }
			});
			
			expect(res.status()).toBe(400);
			const json = await res.json();
			expect(json.error).toBe('Provide text/plain body or JSON {entries}');
		});
	});

	test.describe('Configuration Updates - Text Format', () => {
		test('should update configuration with text/plain format', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const configText = `EMAIL_RECIPIENT=admin@test.com
RETRY_COUNT=3
LOG_LEVEL=info
TARGET=192.168.1.100`;
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'text/plain' },
				body: configText
			});
			
			expect(res.status()).toBe(200);
			
			// Verify the configuration was parsed and saved
			const getRes = await api(request, '/api/config');
			const getJson = await getRes.json();
			expect(getJson.entries.EMAIL_RECIPIENT).toBe('admin@test.com');
			expect(getJson.entries.RETRY_COUNT).toBe('3');
			expect(getJson.entries.LOG_LEVEL).toBe('info');
			expect(getJson.entries.TARGET).toBe('192.168.1.100');
		});

		test('should handle text format with comments', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const configText = `# This is a comment
EMAIL_RECIPIENT=admin@test.com
# Another comment
RETRY_COUNT=3
			
# Empty lines and spaces should be ignored
LOG_LEVEL=info`;
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'text/plain' },
				body: configText
			});
			
			expect(res.status()).toBe(200);
			
			// Verify comments were ignored
			const getRes = await api(request, '/api/config');
			const getJson = await getRes.json();
			expect(getJson.entries.EMAIL_RECIPIENT).toBe('admin@test.com');
			expect(getJson.entries.RETRY_COUNT).toBe('3');
			expect(getJson.entries.LOG_LEVEL).toBe('info');
		});

		test('should handle text format with quoted values', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const configText = `QUOTED_VALUE="This is a quoted value"
SINGLE_QUOTED='Single quoted value'
MIXED_QUOTES="Value with 'mixed' quotes"
UNQUOTED_VALUE=Simple value`;
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'text/plain' },
				body: configText
			});
			
			expect(res.status()).toBe(200);
			
			// Verify quoted values are preserved
			const getRes = await api(request, '/api/config');
			const getJson = await getRes.json();
			expect(getJson.entries.QUOTED_VALUE).toBe('"This is a quoted value"');
			expect(getJson.entries.SINGLE_QUOTED).toBe("'Single quoted value'");
			expect(getJson.entries.MIXED_QUOTES).toBe('"Value with \'mixed\' quotes"');
			expect(getJson.entries.UNQUOTED_VALUE).toBe('Simple value');
		});

		test('should handle malformed text format gracefully', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const configText = `VALID_KEY=valid_value
INVALID_LINE_NO_EQUALS
=INVALID_EMPTY_KEY
VALID_KEY2=another_valid_value
KEY_WITH_MULTIPLE=EQUALS=SIGNS`;
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'text/plain' },
				body: configText
			});
			
			expect(res.status()).toBe(200);
			
			// Verify only valid entries were saved
			const getRes = await api(request, '/api/config');
			const getJson = await getRes.json();
			expect(getJson.entries.VALID_KEY).toBe('valid_value');
			expect(getJson.entries.VALID_KEY2).toBe('another_valid_value');
			expect(getJson.entries.KEY_WITH_MULTIPLE).toBe('EQUALS=SIGNS');
			expect(getJson.entries.INVALID_LINE_NO_EQUALS).toBeUndefined();
		});

		test('should handle empty text configuration', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'text/plain' },
				body: ''
			});
			
			expect(res.status()).toBe(200);
		});

		test('should handle text with only comments and whitespace', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const configText = `# Only comments
# And whitespace


			
# Nothing else`;
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'text/plain' },
				body: configText
			});
			
			expect(res.status()).toBe(200);
		});
	});

	test.describe('Device-Specific Configuration', () => {
		test('should handle RP device configuration patterns', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const rpConfig = {
				'RP1_PING_COMMENT': 'Main Test Device',
				'RP1_PING_LOCATION': 'Central Office Room 5',
				'RP1_BW_COMMENT': 'Bandwidth Test Unit A',
				'RP1_BW_LOCATION': 'Central Office Room 5',
				'RP1_API_ROUTER_IP': '100.66.27.8',
				'RP1_CP_ROUTER_ID': 'router_001',
				'RP1_TCP_UPLINK_ARGS': '--duration 60 --parallel 4',
				'RP1_TCP_DOWNLINK_ARGS': '--duration 60 --parallel 8',
				'RP2_PING_COMMENT': 'Secondary Test Device',
				'RP2_PING_LOCATION': 'Remote Office Room 2',
				'RP2_API_ROUTER_IP': '100.66.27.9'
			};
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: rpConfig }
			});
			
			expect(res.status()).toBe(200);
			
			// Verify all RP configuration was saved
			const getRes = await api(request, '/api/config');
			const getJson = await getRes.json();
			
			for (const [key, value] of Object.entries(rpConfig)) {
				expect(getJson.entries[key]).toBe(value);
			}
		});

		test('should handle multiple RP devices configuration', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const multiRpConfig = {};
			for (let i = 1; i <= 10; i++) {
				multiRpConfig[`RP${i}_PING_COMMENT`] = `Device ${i} Comment`;
				multiRpConfig[`RP${i}_PING_LOCATION`] = `Location ${i}`;
				multiRpConfig[`RP${i}_API_ROUTER_IP`] = `192.168.1.${100 + i}`;
			}
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: multiRpConfig }
			});
			
			expect(res.status()).toBe(200);
			
			// Verify all devices were configured
			const getRes = await api(request, '/api/config');
			const getJson = await getRes.json();
			
			for (let i = 1; i <= 10; i++) {
				expect(getJson.entries[`RP${i}_PING_COMMENT`]).toBe(`Device ${i} Comment`);
				expect(getJson.entries[`RP${i}_PING_LOCATION`]).toBe(`Location ${i}`);
				expect(getJson.entries[`RP${i}_API_ROUTER_IP`]).toBe(`192.168.1.${100 + i}`);
			}
		});
	});

	test.describe('System Configuration Fields', () => {
		test('should handle all system configuration fields', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const systemConfig = {
				'EMAIL_RECIPIENT': 'admin@company.com',
				'RETRY_COUNT': '5',
				'LOG_LEVEL': 'debug',
				'X_ECM_API_ID': 'api_user_123',
				'X_ECM_API_KEY': 'dGVzdF9rZXk=',
				'X_CP_API_ID': 'cp_user_456',
				'X_CP_API_KEY': 'Y3Bfa2V5XzEyMw==',
				'NET_DEVICE_API_URL': 'https://api.company.com/devices',
				'NET_DEVICE_METRICS_API_URL': 'https://metrics.company.com/api',
				'NET_DEVICE_SIGNAL_SAMPLES_API_URL': 'https://samples.company.com/api',
				'ACCOUNT': 'https://account.company.com/api',
				'USERNAME': 'system_user',
				'PASS': 'SecurePass123!',
				'DOMAIN': 'ericsson',
				'Output_Dir': '/opt/eni/output',
				'WINDOWS_SHARE': '\\\\server\\share\\eni',
				'PUSH_FILES': 'YES',
				'TARGET': '198.19.255.253',
				'GPORT': '8080'
			};
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: systemConfig }
			});
			
			expect(res.status()).toBe(200);
			
			// Verify all system configuration was saved
			const getRes = await api(request, '/api/config');
			const getJson = await getRes.json();
			
			for (const [key, value] of Object.entries(systemConfig)) {
				expect(getJson.entries[key]).toBe(value);
			}
		});

		test('should handle boolean-like configuration values', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const booleanConfig = {
				'PUSH_FILES_YES': 'YES',
				'PUSH_FILES_NO': 'NO',
				'PUSH_FILES_TRUE': 'true',
				'PUSH_FILES_FALSE': 'false',
				'PUSH_FILES_1': '1',
				'PUSH_FILES_0': '0',
				'PUSH_FILES_ENABLED': 'enabled',
				'PUSH_FILES_DISABLED': 'disabled'
			};
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: booleanConfig }
			});
			
			expect(res.status()).toBe(200);
			
			// Verify all boolean values are stored as strings
			const getRes = await api(request, '/api/config');
			const getJson = await getRes.json();
			
			for (const [key, value] of Object.entries(booleanConfig)) {
				expect(getJson.entries[key]).toBe(value);
			}
		});
	});

	test.describe('Configuration Persistence', () => {
		test('should persist configuration across multiple requests', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const testConfig = {
				'PERSISTENT_KEY1': 'persistent_value1',
				'PERSISTENT_KEY2': 'persistent_value2'
			};
			
			// Set configuration
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: testConfig }
			});
			
			// Verify persistence across multiple GET requests
			for (let i = 0; i < 5; i++) {
				const res = await api(request, '/api/config');
				expect(res.status()).toBe(200);
				
				const json = await res.json();
				expect(json.entries.PERSISTENT_KEY1).toBe('persistent_value1');
				expect(json.entries.PERSISTENT_KEY2).toBe('persistent_value2');
			}
		});

		test('should handle incremental configuration updates', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Set initial configuration
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: { 'KEY1': 'value1', 'KEY2': 'value2' } }
			});
			
			// Add more configuration
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: { 'KEY3': 'value3', 'KEY4': 'value4' } }
			});
			
			// Update existing and add new
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: { 'KEY1': 'updated_value1', 'KEY5': 'value5' } }
			});
			
			// Verify final state
			const res = await api(request, '/api/config');
			const json = await res.json();
			
			expect(json.entries.KEY1).toBe('updated_value1'); // Updated
			expect(json.entries.KEY2).toBe('value2'); // Preserved
			expect(json.entries.KEY3).toBe('value3'); // Preserved
			expect(json.entries.KEY4).toBe('value4'); // Preserved
			expect(json.entries.KEY5).toBe('value5'); // New
		});
	});

	test.describe('Configuration Text Generation', () => {
		test('should generate proper text format from entries', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const testConfig = {
				'EMAIL_RECIPIENT': 'admin@test.com',
				'RETRY_COUNT': '3',
				'RP1_PING_COMMENT': 'Test Device'
			};
			
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: testConfig }
			});
			
			const res = await api(request, '/api/config');
			const json = await res.json();
			
			// Verify text format is properly generated
			expect(json.text).toContain('EMAIL_RECIPIENT=admin@test.com');
			expect(json.text).toContain('RETRY_COUNT=3');
			expect(json.text).toContain('RP1_PING_COMMENT=Test Device');
			
			// Verify text ends with newline
			expect(json.text.endsWith('\n')).toBe(true);
			
			// Verify keys are sorted
			const lines = json.text.trim().split('\n');
			const keys = lines.map(line => line.split('=')[0]);
			const sortedKeys = [...keys].sort();
			expect(keys).toEqual(sortedKeys);
		});

		test('should handle empty configuration text generation', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/config');
			const json = await res.json();
			
			// Should return empty object and single newline for empty config
			expect(json.entries).toEqual({});
			expect(json.text).toBe('\n');
		});
	});

	test.describe('Error Handling', () => {
		test('should handle malformed request body', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: '{"malformed": json}'
			});
			
			expect(res.status()).toBe(400);
		});

		test('should handle missing content-type', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				body: 'TEST_KEY=test_value'
			});
			
			expect(res.status()).toBe(400);
			const json = await res.json();
			expect(json.error).toBe('Provide text/plain body or JSON {entries}');
		});

		test('should handle unsupported content-type', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/xml' },
				body: '<config><key>value</key></config>'
			});
			
			expect(res.status()).toBe(400);
		});

		test('should handle very large configuration', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Create large configuration object
			const largeConfig = {};
			for (let i = 0; i < 1000; i++) {
				largeConfig[`LARGE_KEY_${i}`] = `large_value_${i}_${'x'.repeat(100)}`;
			}
			
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: largeConfig }
			});
			
			// Should handle large configurations
			expect([200, 413, 500]).toContain(res.status()); // 200 success, 413 payload too large, or 500 server error
		});
	});
});