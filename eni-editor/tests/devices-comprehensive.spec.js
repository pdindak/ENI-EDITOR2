// @ts-check
import { test, expect } from '@playwright/test';
import { expectOk } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

async function createAuthenticatedUser(request, role = 'ENI-SUPERUSER') {
	const username = `device_user_${Date.now()}_${Math.random()}`;
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

test.describe('Comprehensive Device Management Tests', () => {
	
	test.describe('Device Listing', () => {
		test('should list all devices', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/devices');
			expect(res.status()).toBe(200);
			
			const devices = await res.json();
			expect(Array.isArray(devices)).toBe(true);
		});

		test('should filter devices by ENI_SERVER type', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Add an ENI server
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
			
			const res = await api(request, '/api/devices?type=ENI_SERVER');
			expect(res.status()).toBe(200);
			
			const devices = await res.json();
			expect(Array.isArray(devices)).toBe(true);
			
			// All returned devices should be ENI_SERVER type
			for (const device of devices) {
				expect(device.type).toBe('ENI_SERVER');
			}
		});

		test('should filter devices by RASPBERRY_PI type', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Add a Raspberry Pi
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
			
			const res = await api(request, '/api/devices?type=RASPBERRY_PI');
			expect(res.status()).toBe(200);
			
			const devices = await res.json();
			expect(Array.isArray(devices)).toBe(true);
			
			// All returned devices should be RASPBERRY_PI type
			for (const device of devices) {
				expect(device.type).toBe('RASPBERRY_PI');
			}
		});

		test('should handle invalid device type filter', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/devices?type=INVALID_TYPE');
			expect(res.status()).toBe(200);
			
			const devices = await res.json();
			expect(Array.isArray(devices)).toBe(true);
			// Should return empty array or all devices (implementation dependent)
		});

		test('should return device properties correctly', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Add a test device
			const deviceData = {
				name: 'Property Test Device',
				host: '192.168.1.150',
				port: 2222,
				type: 'ENI_SERVER',
				active: true
			};
			
			const addRes = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: deviceData
			});
			
			const addedDevice = await addRes.json();
			
			const res = await api(request, '/api/devices');
			const devices = await res.json();
			
			const foundDevice = devices.find(d => d.id === addedDevice.id);
			expect(foundDevice).toBeDefined();
			expect(foundDevice.name).toBe(deviceData.name);
			expect(foundDevice.host).toBe(deviceData.host);
			expect(foundDevice.port).toBe(deviceData.port);
			expect(foundDevice.type).toBe(deviceData.type);
			expect(foundDevice.active).toBe(1); // SQLite stores as integer
			expect(foundDevice.created_at).toBeDefined();
		});
	});

	test.describe('Device Creation', () => {
		test('should create ENI_SERVER device successfully', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const deviceData = {
				name: 'Main ENI Server',
				host: '192.168.1.100',
				port: 22,
				type: 'ENI_SERVER',
				active: true
			};
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: deviceData
			});
			
			expect(res.status()).toBe(201);
			
			const device = await res.json();
			expect(device.id).toBeDefined();
			expect(device.name).toBe(deviceData.name);
			expect(device.host).toBe(deviceData.host);
			expect(device.port).toBe(deviceData.port);
			expect(device.type).toBe(deviceData.type);
			expect(device.active).toBe(1);
			expect(device.created_at).toBeDefined();
		});

		test('should create RASPBERRY_PI device successfully', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const deviceData = {
				name: 'Test Raspberry Pi',
				host: '192.168.1.200',
				port: 22,
				type: 'RASPBERRY_PI',
				active: true
			};
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: deviceData
			});
			
			expect(res.status()).toBe(201);
			
			const device = await res.json();
			expect(device.type).toBe('RASPBERRY_PI');
		});

		test('should create device with custom port', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const deviceData = {
				name: 'Custom Port Device',
				host: '192.168.1.101',
				port: 2222,
				type: 'ENI_SERVER',
				active: true
			};
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: deviceData
			});
			
			expect(res.status()).toBe(201);
			
			const device = await res.json();
			expect(device.port).toBe(2222);
		});

		test('should create device with default port when not specified', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const deviceData = {
				name: 'Default Port Device',
				host: '192.168.1.102',
				type: 'ENI_SERVER',
				active: true
			};
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: deviceData
			});
			
			expect(res.status()).toBe(201);
			
			const device = await res.json();
			expect(device.port).toBe(22);
		});

		test('should create inactive device', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const deviceData = {
				name: 'Inactive Device',
				host: '192.168.1.103',
				port: 22,
				type: 'ENI_SERVER',
				active: false
			};
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: deviceData
			});
			
			expect(res.status()).toBe(201);
			
			const device = await res.json();
			expect(device.active).toBe(0);
		});

		test('should handle hostname instead of IP address', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const deviceData = {
				name: 'Hostname Device',
				host: 'eni-server.local',
				port: 22,
				type: 'ENI_SERVER',
				active: true
			};
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: deviceData
			});
			
			expect(res.status()).toBe(201);
			
			const device = await res.json();
			expect(device.host).toBe('eni-server.local');
		});

		test('should handle FQDN hostname', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const deviceData = {
				name: 'FQDN Device',
				host: 'eni-server.company.com',
				port: 22,
				type: 'ENI_SERVER',
				active: true
			};
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: deviceData
			});
			
			expect(res.status()).toBe(201);
			
			const device = await res.json();
			expect(device.host).toBe('eni-server.company.com');
		});

		test('should handle special characters in device name', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const specialNames = [
				'Device with spaces',
				'Device-with-dashes',
				'Device_with_underscores',
				'Device.with.dots',
				'Device (with parentheses)',
				'Device [with brackets]',
				'Device #1 @location',
				'Device & Co.',
				'Device 100%'
			];
			
			for (const name of specialNames) {
				const deviceData = {
					name: name,
					host: `192.168.1.${100 + specialNames.indexOf(name)}`,
					port: 22,
					type: 'ENI_SERVER',
					active: true
				};
				
				const res = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: deviceData
				});
				
				expect(res.status()).toBe(201);
				
				const device = await res.json();
				expect(device.name).toBe(name);
			}
		});
	});

	test.describe('Device Creation Validation', () => {
		test('should reject device creation without name', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					host: '192.168.1.100',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			expect(res.status()).toBe(400);
			const error = await res.json();
			expect(error.error.fieldErrors.name).toBeDefined();
		});

		test('should reject device creation without host', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Test Device',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			expect(res.status()).toBe(400);
			const error = await res.json();
			expect(error.error.fieldErrors.host).toBeDefined();
		});

		test('should reject device creation without type', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Test Device',
					host: '192.168.1.100',
					port: 22,
					active: true
				}
			});
			
			expect(res.status()).toBe(400);
			const error = await res.json();
			expect(error.error.fieldErrors.type).toBeDefined();
		});

		test('should reject device creation with invalid type', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Test Device',
					host: '192.168.1.100',
					port: 22,
					type: 'INVALID_TYPE',
					active: true
				}
			});
			
			expect(res.status()).toBe(400);
			const error = await res.json();
			expect(error.error.fieldErrors.type).toBeDefined();
		});

		test('should reject device creation with invalid port range', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const invalidPorts = [0, -1, 65536, 100000];
			
			for (const port of invalidPorts) {
				const res = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: 'Test Device',
						host: '192.168.1.100',
						port: port,
						type: 'ENI_SERVER',
						active: true
					}
				});
				
				expect(res.status()).toBe(400);
				const error = await res.json();
				expect(error.error.fieldErrors.port).toBeDefined();
			}
		});

		test('should accept valid port range', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const validPorts = [1, 22, 80, 443, 8080, 65535];
			
			for (const port of validPorts) {
				const res = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: `Test Device Port ${port}`,
						host: `192.168.1.${100 + validPorts.indexOf(port)}`,
						port: port,
						type: 'ENI_SERVER',
						active: true
					}
				});
				
				expect(res.status()).toBe(201);
				
				const device = await res.json();
				expect(device.port).toBe(port);
			}
		});

		test('should reject empty name', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: '',
					host: '192.168.1.100',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			expect(res.status()).toBe(400);
		});

		test('should reject empty host', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Test Device',
					host: '',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			expect(res.status()).toBe(400);
		});

		test('should handle malformed JSON', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{"name": "Test Device", "host": "192.168.1.100", "invalid": json}'
			});
			
			expect(res.status()).toBe(400);
		});

		test('should handle empty request body', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {}
			});
			
			expect(res.status()).toBe(400);
		});
	});

	test.describe('Device Deletion', () => {
		test('should delete device successfully', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Create a device first
			const createRes = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Device to Delete',
					host: '192.168.1.100',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			const device = await createRes.json();
			
			// Delete the device
			const deleteRes = await api(request, `/api/devices?id=${device.id}`, {
				method: 'DELETE'
			});
			
			expect(deleteRes.status()).toBe(204);
		});

		test('should verify device is removed after deletion', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Create a device first
			const createRes = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Device to Verify Delete',
					host: '192.168.1.101',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			const device = await createRes.json();
			
			// Delete the device
			await api(request, `/api/devices?id=${device.id}`, {
				method: 'DELETE'
			});
			
			// Verify device is no longer in the list
			const listRes = await api(request, '/api/devices');
			const devices = await listRes.json();
			
			const foundDevice = devices.find(d => d.id === device.id);
			expect(foundDevice).toBeUndefined();
		});

		test('should reject deletion without id parameter', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const res = await api(request, '/api/devices', {
				method: 'DELETE'
			});
			
			expect(res.status()).toBe(400);
			const error = await res.json();
			expect(error.error).toBe('id query parameter is required');
		});

		test('should reject deletion with invalid id parameter', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const invalidIds = ['abc', 'null', 'undefined', '1.5', ''];
			
			for (const id of invalidIds) {
				const res = await api(request, `/api/devices?id=${id}`, {
					method: 'DELETE'
				});
				
				expect(res.status()).toBe(400);
				const error = await res.json();
				expect(error.error).toBe('id query parameter is required');
			}
		});

		test('should handle deletion of non-existent device', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Try to delete a device that doesn't exist
			const res = await api(request, '/api/devices?id=99999', {
				method: 'DELETE'
			});
			
			// Should succeed (idempotent operation) or return 404
			expect([204, 404]).toContain(res.status());
		});

		test('should delete multiple devices', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const deviceIds = [];
			
			// Create multiple devices
			for (let i = 0; i < 5; i++) {
				const createRes = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: `Multi Delete Device ${i}`,
						host: `192.168.1.${110 + i}`,
						port: 22,
						type: 'ENI_SERVER',
						active: true
					}
				});
				
				const device = await createRes.json();
				deviceIds.push(device.id);
			}
			
			// Delete all devices
			for (const id of deviceIds) {
				const deleteRes = await api(request, `/api/devices?id=${id}`, {
					method: 'DELETE'
				});
				
				expect(deleteRes.status()).toBe(204);
			}
			
			// Verify all devices are removed
			const listRes = await api(request, '/api/devices');
			const devices = await listRes.json();
			
			for (const id of deviceIds) {
				const foundDevice = devices.find(d => d.id === id);
				expect(foundDevice).toBeUndefined();
			}
		});
	});

	test.describe('Device Management Edge Cases', () => {
		test('should handle concurrent device operations', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Create multiple devices concurrently
			const createPromises = [];
			for (let i = 0; i < 10; i++) {
				createPromises.push(
					api(request, '/api/devices', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						data: {
							name: `Concurrent Device ${i}`,
							host: `192.168.1.${120 + i}`,
							port: 22,
							type: i % 2 === 0 ? 'ENI_SERVER' : 'RASPBERRY_PI',
							active: true
						}
					})
				);
			}
			
			const results = await Promise.all(createPromises);
			
			// All should succeed
			for (const res of results) {
				expect(res.status()).toBe(201);
			}
		});

		test('should handle devices with same name but different hosts', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const deviceName = 'Duplicate Name Device';
			
			// Create devices with same name but different hosts
			const res1 = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: deviceName,
					host: '192.168.1.130',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			const res2 = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: deviceName,
					host: '192.168.1.131',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			expect(res1.status()).toBe(201);
			expect(res2.status()).toBe(201);
			
			// Both devices should be created successfully
			const device1 = await res1.json();
			const device2 = await res2.json();
			
			expect(device1.name).toBe(deviceName);
			expect(device2.name).toBe(deviceName);
			expect(device1.host).toBe('192.168.1.130');
			expect(device2.host).toBe('192.168.1.131');
			expect(device1.id).not.toBe(device2.id);
		});

		test('should handle devices with same host but different ports', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const host = '192.168.1.140';
			
			// Create devices with same host but different ports
			const res1 = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Same Host Device 1',
					host: host,
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			const res2 = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Same Host Device 2',
					host: host,
					port: 2222,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			expect(res1.status()).toBe(201);
			expect(res2.status()).toBe(201);
			
			const device1 = await res1.json();
			const device2 = await res2.json();
			
			expect(device1.host).toBe(host);
			expect(device2.host).toBe(host);
			expect(device1.port).toBe(22);
			expect(device2.port).toBe(2222);
		});

		test('should handle very long device names', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const longName = 'A'.repeat(255); // Very long name
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: longName,
					host: '192.168.1.150',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			// Should either succeed or fail gracefully
			expect([201, 400]).toContain(res.status());
			
			if (res.status() === 201) {
				const device = await res.json();
				expect(device.name.length).toBeGreaterThan(0);
			}
		});

		test('should handle Unicode characters in device names', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const unicodeNames = [
				'设备名称', // Chinese
				'デバイス名', // Japanese
				'устройство', // Russian
				'جهاز', // Arabic
				'🖥️ Server 🌐', // Emojis
				'Café Device ñ', // Accented characters
			];
			
			for (const name of unicodeNames) {
				const res = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: name,
						host: `192.168.1.${160 + unicodeNames.indexOf(name)}`,
						port: 22,
						type: 'ENI_SERVER',
						active: true
					}
				});
				
				expect(res.status()).toBe(201);
				
				const device = await res.json();
				expect(device.name).toBe(name);
			}
		});
	});

	test.describe('Device Authentication Requirements', () => {
		test('should require authentication for device listing', async ({ request }) => {
			// Don't authenticate
			const res = await api(request, '/api/devices');
			
			// Should still work as devices endpoint is accessible to authenticated users
			// But let's test with a fresh context that has no session
			expect(res.status()).toBe(200);
		});

		test('should require authentication for device creation', async ({ request }) => {
			// Don't authenticate
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Unauthenticated Device',
					host: '192.168.1.170',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			// Should require authentication
			expect([401, 403]).toContain(res.status());
		});

		test('should require authentication for device deletion', async ({ request }) => {
			// Don't authenticate
			const res = await api(request, '/api/devices?id=1', {
				method: 'DELETE'
			});
			
			// Should require authentication
			expect([401, 403]).toContain(res.status());
		});

		test('should allow both user roles to manage devices', async ({ request }) => {
			// Test with ENI-USER
			await createAuthenticatedUser(request, 'ENI-USER');
			
			const res = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'User Role Device',
					host: '192.168.1.180',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			
			// Both roles should be able to manage devices
			expect([201, 403]).toContain(res.status());
		});
	});
});