// @ts-check
import { test, expect } from '@playwright/test';
import { expectOk } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

test.describe('Comprehensive Integration Tests', () => {
	
	test.describe('Complete User Workflows', () => {
		test('should complete full superuser workflow', async ({ request }) => {
			// 1. Register superuser
			const username = `integration_superuser_${Date.now()}`;
			const password = 'TestPass123!';
			
			const registerRes = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-SUPERUSER' }
			});
			expect([201, 409]).toContain(registerRes.status());
			
			// 2. Login
			const loginRes = await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password }
			});
			expect(loginRes.status()).toBe(200);
			
			// 3. Check user info
			const meRes = await api(request, '/api/auth/me');
			const user = await meRes.json();
			expect(user.user.username).toBe(username);
			expect(user.user.role).toBe('ENI-SUPERUSER');
			
			// 4. Configure system settings
			const settingsRes = await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: {
					rp_count: 3,
					linux_source_path: '/etc/eni/config.settings',
					rpi_destination_path: '/ephidin/ENI/config'
				}
			});
			expect(settingsRes.status()).toBe(200);
			
			// 5. Add ENI servers
			const eniServer1 = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Primary ENI Server',
					host: '192.168.1.100',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			expect(eniServer1.status()).toBe(201);
			
			const eniServer2 = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'Backup ENI Server',
					host: '192.168.1.101',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			expect(eniServer2.status()).toBe(201);
			
			// 6. Add Raspberry Pi devices
			for (let i = 1; i <= 3; i++) {
				const rpRes = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: `Raspberry Pi ${i}`,
						host: `192.168.1.${200 + i}`,
						port: 22,
						type: 'RASPBERRY_PI',
						active: true
					}
				});
				expect(rpRes.status()).toBe(201);
			}
			
			// 7. Configure system-wide settings
			const systemConfig = {
				'EMAIL_RECIPIENT': 'admin@company.com',
				'RETRY_COUNT': '3',
				'LOG_LEVEL': 'info',
				'X_ECM_API_ID': 'api_user_123',
				'X_ECM_API_KEY': 'dGVzdF9rZXk=',
				'NET_DEVICE_API_URL': 'https://api.company.com/devices',
				'TARGET': '198.19.255.253',
				'GPORT': '8080'
			};
			
			const configRes = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: systemConfig }
			});
			expect(configRes.status()).toBe(200);
			
			// 8. Configure RP devices
			const rpConfig = {};
			for (let i = 1; i <= 3; i++) {
				rpConfig[`RP${i}_PING_COMMENT`] = `Test Device ${i}`;
				rpConfig[`RP${i}_PING_LOCATION`] = `Location ${i}`;
				rpConfig[`RP${i}_BW_COMMENT`] = `Bandwidth Test ${i}`;
				rpConfig[`RP${i}_BW_LOCATION`] = `Location ${i}`;
				rpConfig[`RP${i}_API_ROUTER_IP`] = `100.66.27.${7 + i}`;
			}
			
			const rpConfigRes = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: rpConfig }
			});
			expect(rpConfigRes.status()).toBe(200);
			
			// 9. Check TLS status
			const tlsStatusRes = await api(request, '/api/tls/status');
			expect(tlsStatusRes.status()).toBe(200);
			
			// 10. Check SSH key status
			const sshStatusRes = await api(request, '/api/ssh-keys/status');
			expect(sshStatusRes.status()).toBe(200);
			
			// 11. Try SSH operations (will fail without keys but should be handled)
			const getConfigRes = await api(request, '/api/ops/get-config', {
				method: 'POST'
			});
			expect([200, 500]).toContain(getConfigRes.status());
			
			const commitConfigRes = await api(request, '/api/ops/commit-config', {
				method: 'POST'
			});
			expect([200, 500]).toContain(commitConfigRes.status());
			
			// 12. Check operation logs
			const logsRes = await api(request, '/api/ops/logs');
			expect(logsRes.status()).toBe(200);
			
			// 13. Verify final configuration
			const finalConfigRes = await api(request, '/api/config');
			const finalConfig = await finalConfigRes.json();
			
			expect(finalConfig.entries.EMAIL_RECIPIENT).toBe('admin@company.com');
			expect(finalConfig.entries.RP1_PING_COMMENT).toBe('Test Device 1');
			expect(finalConfig.entries.RP2_PING_COMMENT).toBe('Test Device 2');
			expect(finalConfig.entries.RP3_PING_COMMENT).toBe('Test Device 3');
			
			// 14. Verify devices
			const devicesRes = await api(request, '/api/devices');
			const devices = await devicesRes.json();
			
			const eniServers = devices.filter(d => d.type === 'ENI_SERVER');
			const raspberryPis = devices.filter(d => d.type === 'RASPBERRY_PI');
			
			expect(eniServers.length).toBeGreaterThanOrEqual(2);
			expect(raspberryPis.length).toBeGreaterThanOrEqual(3);
			
			// 15. Logout
			const logoutRes = await api(request, '/api/auth/logout', {
				method: 'POST'
			});
			expect(logoutRes.status()).toBe(204);
		});

		test('should complete full regular user workflow', async ({ request }) => {
			// 1. Register regular user
			const username = `integration_user_${Date.now()}`;
			const password = 'TestPass123!';
			
			const registerRes = await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-USER' }
			});
			expect([201, 409]).toContain(registerRes.status());
			
			// 2. Login
			const loginRes = await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password }
			});
			expect(loginRes.status()).toBe(200);
			
			// 3. Check user info
			const meRes = await api(request, '/api/auth/me');
			const user = await meRes.json();
			expect(user.user.username).toBe(username);
			expect(user.user.role).toBe('ENI-USER');
			
			// 4. View current settings (read-only)
			const settingsRes = await api(request, '/api/settings');
			expect([200, 403]).toContain(settingsRes.status());
			
			// 5. View current configuration
			const configRes = await api(request, '/api/config');
			expect(configRes.status()).toBe(200);
			
			// 6. Configure user-specific settings
			const userConfig = {
				'RP1_PING_COMMENT': 'User Device 1',
				'RP1_PING_LOCATION': 'User Location 1',
				'RP1_BW_COMMENT': 'User Bandwidth Test 1',
				'RP1_BW_LOCATION': 'User Location 1',
				'RP2_PING_COMMENT': 'User Device 2',
				'RP2_PING_LOCATION': 'User Location 2'
			};
			
			const userConfigRes = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: userConfig }
			});
			expect(userConfigRes.status()).toBe(200);
			
			// 7. Verify configuration was saved
			const verifyConfigRes = await api(request, '/api/config');
			const verifyConfig = await verifyConfigRes.json();
			
			expect(verifyConfig.entries.RP1_PING_COMMENT).toBe('User Device 1');
			expect(verifyConfig.entries.RP2_PING_COMMENT).toBe('User Device 2');
			
			// 8. Try to access superuser endpoints (should fail)
			const forbiddenEndpoints = [
				'/api/ssh-keys/status',
				'/api/tls/status',
				'/api/ops/logs'
			];
			
			for (const endpoint of forbiddenEndpoints) {
				const res = await api(request, endpoint);
				expect(res.status()).toBe(403);
			}
			
			// 9. View devices (if allowed)
			const devicesRes = await api(request, '/api/devices');
			expect([200, 403]).toContain(devicesRes.status());
			
			// 10. Logout
			const logoutRes = await api(request, '/api/auth/logout', {
				method: 'POST'
			});
			expect(logoutRes.status()).toBe(204);
		});
	});

	test.describe('Multi-User Scenarios', () => {
		test('should handle multiple concurrent users', async ({ request }) => {
			const users = [];
			
			// Create multiple users concurrently
			const userPromises = [];
			for (let i = 0; i < 5; i++) {
				const username = `concurrent_user_${Date.now()}_${i}`;
				const password = 'TestPass123!';
				const role = i % 2 === 0 ? 'ENI-USER' : 'ENI-SUPERUSER';
				
				userPromises.push(
					api(request, '/api/auth/register', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						data: { username, password, role }
					}).then(async (registerRes) => {
						if (registerRes.status() === 201) {
							const loginRes = await api(request, '/api/auth/login', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								data: { username, password }
							});
							
							if (loginRes.status() === 200) {
								return { username, password, role };
							}
						}
						return null;
					})
				);
			}
			
			const results = await Promise.all(userPromises);
			const validUsers = results.filter(user => user !== null);
			
			expect(validUsers.length).toBeGreaterThan(0);
			
			// Each user performs operations concurrently
			const operationPromises = validUsers.map(async (user) => {
				// Get user info
				const meRes = await api(request, '/api/auth/me');
				expect(meRes.status()).toBe(200);
				
				// Configure something
				const configRes = await api(request, '/api/config', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { entries: { [`USER_${user.username}`]: 'test_value' } }
				});
				expect(configRes.status()).toBe(200);
				
				return user;
			});
			
			const operationResults = await Promise.all(operationPromises);
			expect(operationResults.length).toBe(validUsers.length);
		});

		test('should maintain data consistency across users', async ({ request }) => {
			// Create superuser
			const superuser = `super_${Date.now()}`;
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: superuser, password: 'TestPass123!', role: 'ENI-SUPERUSER' }
			});
			
			await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: superuser, password: 'TestPass123!' }
			});
			
			// Set initial configuration
			const initialConfig = {
				'SHARED_KEY1': 'initial_value1',
				'SHARED_KEY2': 'initial_value2'
			};
			
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: initialConfig }
			});
			
			// Logout superuser
			await api(request, '/api/auth/logout', { method: 'POST' });
			
			// Create regular user
			const regularUser = `user_${Date.now()}`;
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: regularUser, password: 'TestPass123!', role: 'ENI-USER' }
			});
			
			await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: regularUser, password: 'TestPass123!' }
			});
			
			// Regular user should see the configuration
			const userConfigRes = await api(request, '/api/config');
			const userConfig = await userConfigRes.json();
			
			expect(userConfig.entries.SHARED_KEY1).toBe('initial_value1');
			expect(userConfig.entries.SHARED_KEY2).toBe('initial_value2');
			
			// Regular user adds their configuration
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: { 'USER_KEY': 'user_value' } }
			});
			
			// Logout regular user
			await api(request, '/api/auth/logout', { method: 'POST' });
			
			// Login as superuser again
			await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: superuser, password: 'TestPass123!' }
			});
			
			// Superuser should see all configuration
			const finalConfigRes = await api(request, '/api/config');
			const finalConfig = await finalConfigRes.json();
			
			expect(finalConfig.entries.SHARED_KEY1).toBe('initial_value1');
			expect(finalConfig.entries.SHARED_KEY2).toBe('initial_value2');
			expect(finalConfig.entries.USER_KEY).toBe('user_value');
		});
	});

	test.describe('System State Management', () => {
		test('should maintain state across operations', async ({ request }) => {
			// Create superuser
			const username = `state_test_${Date.now()}`;
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
			
			// Set initial state
			await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { rp_count: 2 }
			});
			
			// Add devices
			const device1 = await api(request, '/api/devices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: {
					name: 'State Test Device 1',
					host: '192.168.1.100',
					port: 22,
					type: 'ENI_SERVER',
					active: true
				}
			});
			const device1Data = await device1.json();
			
			// Set configuration
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: { 'STATE_TEST': 'value1' } }
			});
			
			// Perform multiple operations
			for (let i = 0; i < 10; i++) {
				// Update configuration
				await api(request, '/api/config', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { entries: { [`ITERATION_${i}`]: `value_${i}` } }
				});
				
				// Check state consistency
				const configRes = await api(request, '/api/config');
				const config = await configRes.json();
				expect(config.entries.STATE_TEST).toBe('value1');
				expect(config.entries[`ITERATION_${i}`]).toBe(`value_${i}`);
				
				const settingsRes = await api(request, '/api/settings');
				const settings = await settingsRes.json();
				expect(settings.rp_count).toBe(2);
				
				const devicesRes = await api(request, '/api/devices');
				const devices = await devicesRes.json();
				const foundDevice = devices.find(d => d.id === device1Data.id);
				expect(foundDevice).toBeDefined();
			}
			
			// Clean up - delete device
			await api(request, `/api/devices?id=${device1Data.id}`, {
				method: 'DELETE'
			});
			
			// Verify device is gone
			const finalDevicesRes = await api(request, '/api/devices');
			const finalDevices = await finalDevicesRes.json();
			const deletedDevice = finalDevices.find(d => d.id === device1Data.id);
			expect(deletedDevice).toBeUndefined();
		});

		test('should handle system recovery scenarios', async ({ request }) => {
			// Create user
			const username = `recovery_test_${Date.now()}`;
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
			
			// Set up initial state
			await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: {
					rp_count: 3,
					linux_source_path: '/etc/eni/config.settings',
					rpi_destination_path: '/ephidin/ENI/config'
				}
			});
			
			const recoveryConfig = {
				'RECOVERY_TEST': 'initial_value',
				'BACKUP_KEY': 'backup_value'
			};
			
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: recoveryConfig }
			});
			
			// Simulate various failure scenarios and recovery
			
			// 1. Try invalid operations
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: '{"invalid": json}'
			});
			
			// Verify system still works
			const config1Res = await api(request, '/api/config');
			const config1 = await config1Res.json();
			expect(config1.entries.RECOVERY_TEST).toBe('initial_value');
			
			// 2. Try to break settings
			await api(request, '/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { rp_count: -1 } // Invalid value
			});
			
			// Verify settings are still valid
			const settings1Res = await api(request, '/api/settings');
			const settings1 = await settings1Res.json();
			expect(settings1.rp_count).toBeGreaterThan(0);
			
			// 3. Multiple rapid operations
			const rapidPromises = [];
			for (let i = 0; i < 20; i++) {
				rapidPromises.push(
					api(request, '/api/config', {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						data: { entries: { [`RAPID_${i}`]: `value_${i}` } }
					})
				);
			}
			
			await Promise.all(rapidPromises);
			
			// Verify system is still consistent
			const finalConfigRes = await api(request, '/api/config');
			const finalConfig = await finalConfigRes.json();
			expect(finalConfig.entries.RECOVERY_TEST).toBe('initial_value');
			expect(finalConfig.entries.BACKUP_KEY).toBe('backup_value');
			
			// Some rapid operations should have succeeded
			let rapidCount = 0;
			for (let i = 0; i < 20; i++) {
				if (finalConfig.entries[`RAPID_${i}`] === `value_${i}`) {
					rapidCount++;
				}
			}
			expect(rapidCount).toBeGreaterThan(0);
		});
	});

	test.describe('Configuration Workflows', () => {
		test('should handle complete configuration lifecycle', async ({ request }) => {
			// Setup
			const username = `config_lifecycle_${Date.now()}`;
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
			
			// 1. Initial configuration
			const initialConfig = {
				'EMAIL_RECIPIENT': 'admin@test.com',
				'RETRY_COUNT': '3',
				'LOG_LEVEL': 'info'
			};
			
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: initialConfig }
			});
			
			// 2. Add RP devices configuration
			const rpConfig = {};
			for (let i = 1; i <= 5; i++) {
				rpConfig[`RP${i}_PING_COMMENT`] = `Device ${i}`;
				rpConfig[`RP${i}_PING_LOCATION`] = `Location ${i}`;
				rpConfig[`RP${i}_API_ROUTER_IP`] = `192.168.1.${100 + i}`;
			}
			
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: rpConfig }
			});
			
			// 3. Update existing configuration
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: { 'EMAIL_RECIPIENT': 'newemail@test.com' } }
			});
			
			// 4. Add more configuration via text format
			const textConfig = `NET_DEVICE_API_URL=https://api.test.com
TARGET=198.19.255.253
GPORT=8080`;
			
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'text/plain' },
				body: textConfig
			});
			
			// 5. Verify final configuration
			const finalRes = await api(request, '/api/config');
			const final = await finalRes.json();
			
			// Check all configurations are present
			expect(final.entries.EMAIL_RECIPIENT).toBe('newemail@test.com');
			expect(final.entries.RETRY_COUNT).toBe('3');
			expect(final.entries.LOG_LEVEL).toBe('info');
			expect(final.entries.NET_DEVICE_API_URL).toBe('https://api.test.com');
			expect(final.entries.TARGET).toBe('198.19.255.253');
			
			for (let i = 1; i <= 5; i++) {
				expect(final.entries[`RP${i}_PING_COMMENT`]).toBe(`Device ${i}`);
				expect(final.entries[`RP${i}_API_ROUTER_IP`]).toBe(`192.168.1.${100 + i}`);
			}
			
			// 6. Verify text generation
			expect(final.text).toContain('EMAIL_RECIPIENT=newemail@test.com');
			expect(final.text).toContain('RP1_PING_COMMENT=Device 1');
			expect(final.text).toContain('TARGET=198.19.255.253');
		});

		test('should handle configuration with different user roles', async ({ request }) => {
			// Create superuser
			const superUsername = `config_super_${Date.now()}`;
			const superPassword = 'TestPass123!';
			
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: superUsername, password: superPassword, role: 'ENI-SUPERUSER' }
			});
			
			await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: superUsername, password: superPassword }
			});
			
			// Superuser sets system configuration
			const systemConfig = {
				'EMAIL_RECIPIENT': 'system@test.com',
				'X_ECM_API_ID': 'system_api_id',
				'NET_DEVICE_API_URL': 'https://system.api.com'
			};
			
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: systemConfig }
			});
			
			// Logout superuser
			await api(request, '/api/auth/logout', { method: 'POST' });
			
			// Create regular user
			const userUsername = `config_user_${Date.now()}`;
			const userPassword = 'TestPass123!';
			
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: userUsername, password: userPassword, role: 'ENI-USER' }
			});
			
			await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: userUsername, password: userPassword }
			});
			
			// Regular user can see system configuration
			const userViewRes = await api(request, '/api/config');
			const userView = await userViewRes.json();
			
			expect(userView.entries.EMAIL_RECIPIENT).toBe('system@test.com');
			expect(userView.entries.X_ECM_API_ID).toBe('system_api_id');
			
			// Regular user adds their configuration
			const userConfig = {
				'RP1_PING_COMMENT': 'User Device 1',
				'RP1_PING_LOCATION': 'User Location 1',
				'RP2_BW_COMMENT': 'User Bandwidth Test'
			};
			
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: userConfig }
			});
			
			// Verify user configuration was added
			const updatedRes = await api(request, '/api/config');
			const updated = await updatedRes.json();
			
			expect(updated.entries.EMAIL_RECIPIENT).toBe('system@test.com'); // System config preserved
			expect(updated.entries.RP1_PING_COMMENT).toBe('User Device 1'); // User config added
			expect(updated.entries.RP2_BW_COMMENT).toBe('User Bandwidth Test');
			
			// Logout user
			await api(request, '/api/auth/logout', { method: 'POST' });
			
			// Login as superuser again
			await api(request, '/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username: superUsername, password: superPassword }
			});
			
			// Superuser can see all configuration
			const finalRes = await api(request, '/api/config');
			const final = await finalRes.json();
			
			expect(final.entries.EMAIL_RECIPIENT).toBe('system@test.com');
			expect(final.entries.X_ECM_API_ID).toBe('system_api_id');
			expect(final.entries.RP1_PING_COMMENT).toBe('User Device 1');
			expect(final.entries.RP2_BW_COMMENT).toBe('User Bandwidth Test');
		});
	});

	test.describe('Error Recovery Integration', () => {
		test('should recover from partial failures', async ({ request }) => {
			// Setup
			const username = `error_recovery_${Date.now()}`;
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
			
			// Set initial good state
			await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: { 'GOOD_CONFIG': 'good_value' } }
			});
			
			// Mix of good and bad operations
			const operations = [
				// Good operation
				api(request, '/api/config', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { entries: { 'GOOD_1': 'value_1' } }
				}),
				// Bad operation
				api(request, '/api/config', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: '{"bad": json}'
				}),
				// Good operation
				api(request, '/api/config', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { entries: { 'GOOD_2': 'value_2' } }
				}),
				// Bad operation
				api(request, '/api/settings', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { rp_count: -1 }
				}),
				// Good operation
				api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: 'Recovery Test Device',
						host: '192.168.1.100',
						port: 22,
						type: 'ENI_SERVER',
						active: true
					}
				})
			];
			
			const results = await Promise.all(operations);
			
			// Some should succeed, some should fail
			let successCount = 0;
			let failureCount = 0;
			
			for (const res of results) {
				if (res.status() >= 200 && res.status() < 300) {
					successCount++;
				} else {
					failureCount++;
				}
			}
			
			expect(successCount).toBeGreaterThan(0);
			expect(failureCount).toBeGreaterThan(0);
			
			// Verify system is still functional
			const configRes = await api(request, '/api/config');
			expect(configRes.status()).toBe(200);
			
			const config = await configRes.json();
			expect(config.entries.GOOD_CONFIG).toBe('good_value');
			
			const settingsRes = await api(request, '/api/settings');
			expect(settingsRes.status()).toBe(200);
			
			const devicesRes = await api(request, '/api/devices');
			expect(devicesRes.status()).toBe(200);
		});
	});
});