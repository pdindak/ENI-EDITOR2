// @ts-check
import { test, expect } from '@playwright/test';
import { expectOk } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

async function createAuthenticatedUser(request, role = 'ENI-SUPERUSER') {
	const username = `perf_user_${Date.now()}_${Math.random()}`;
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

function measureTime(startTime) {
	return Date.now() - startTime;
}

test.describe('Comprehensive Performance Tests', () => {
	
	test.describe('Response Time Performance', () => {
		test('should respond to health check quickly', async ({ request }) => {
			const iterations = 10;
			const times = [];
			
			for (let i = 0; i < iterations; i++) {
				const start = Date.now();
				const res = await api(request, '/healthz');
				const time = measureTime(start);
				
				expect(res.status()).toBe(200);
				times.push(time);
			}
			
			const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
			const maxTime = Math.max(...times);
			
			console.log(`Health check - Avg: ${avgTime}ms, Max: ${maxTime}ms`);
			
			// Health check should be very fast
			expect(avgTime).toBeLessThan(100);
			expect(maxTime).toBeLessThan(500);
		});

		test('should respond to authentication quickly', async ({ request }) => {
			const username = `perf_auth_${Date.now()}`;
			const password = 'TestPass123!';
			
			// Register user
			await api(request, '/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				data: { username, password, role: 'ENI-USER' }
			});
			
			const iterations = 5;
			const times = [];
			
			for (let i = 0; i < iterations; i++) {
				// Logout first (except first iteration)
				if (i > 0) {
					await api(request, '/api/auth/logout', { method: 'POST' });
				}
				
				const start = Date.now();
				const res = await api(request, '/api/auth/login', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: { username, password }
				});
				const time = measureTime(start);
				
				expect(res.status()).toBe(200);
				times.push(time);
			}
			
			const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
			const maxTime = Math.max(...times);
			
			console.log(`Authentication - Avg: ${avgTime}ms, Max: ${maxTime}ms`);
			
			// Authentication should be reasonably fast
			expect(avgTime).toBeLessThan(1000);
			expect(maxTime).toBeLessThan(2000);
		});

		test('should respond to configuration operations quickly', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const iterations = 10;
			const getTimes = [];
			const putTimes = [];
			
			for (let i = 0; i < iterations; i++) {
				// Test GET performance
				const getStart = Date.now();
				const getRes = await api(request, '/api/config');
				const getTime = measureTime(getStart);
				
				expect(getRes.status()).toBe(200);
				getTimes.push(getTime);
				
				// Test PUT performance
				const putStart = Date.now();
				const putRes = await api(request, '/api/config', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { entries: { [`PERF_TEST_${i}`]: `value_${i}` } }
				});
				const putTime = measureTime(putStart);
				
				expect(putRes.status()).toBe(200);
				putTimes.push(putTime);
			}
			
			const avgGetTime = getTimes.reduce((a, b) => a + b, 0) / getTimes.length;
			const avgPutTime = putTimes.reduce((a, b) => a + b, 0) / putTimes.length;
			
			console.log(`Config GET - Avg: ${avgGetTime}ms`);
			console.log(`Config PUT - Avg: ${avgPutTime}ms`);
			
			// Configuration operations should be fast
			expect(avgGetTime).toBeLessThan(200);
			expect(avgPutTime).toBeLessThan(500);
		});

		test('should respond to device operations quickly', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const iterations = 5;
			const createTimes = [];
			const listTimes = [];
			const deleteTimes = [];
			const deviceIds = [];
			
			// Test device creation performance
			for (let i = 0; i < iterations; i++) {
				const start = Date.now();
				const res = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: `Perf Test Device ${i}`,
						host: `192.168.1.${100 + i}`,
						port: 22,
						type: 'ENI_SERVER',
						active: true
					}
				});
				const time = measureTime(start);
				
				expect(res.status()).toBe(201);
				const device = await res.json();
				deviceIds.push(device.id);
				createTimes.push(time);
			}
			
			// Test device listing performance
			for (let i = 0; i < iterations; i++) {
				const start = Date.now();
				const res = await api(request, '/api/devices');
				const time = measureTime(start);
				
				expect(res.status()).toBe(200);
				listTimes.push(time);
			}
			
			// Test device deletion performance
			for (const id of deviceIds) {
				const start = Date.now();
				const res = await api(request, `/api/devices?id=${id}`, {
					method: 'DELETE'
				});
				const time = measureTime(start);
				
				expect(res.status()).toBe(204);
				deleteTimes.push(time);
			}
			
			const avgCreateTime = createTimes.reduce((a, b) => a + b, 0) / createTimes.length;
			const avgListTime = listTimes.reduce((a, b) => a + b, 0) / listTimes.length;
			const avgDeleteTime = deleteTimes.reduce((a, b) => a + b, 0) / deleteTimes.length;
			
			console.log(`Device CREATE - Avg: ${avgCreateTime}ms`);
			console.log(`Device LIST - Avg: ${avgListTime}ms`);
			console.log(`Device DELETE - Avg: ${avgDeleteTime}ms`);
			
			// Device operations should be reasonably fast
			expect(avgCreateTime).toBeLessThan(500);
			expect(avgListTime).toBeLessThan(200);
			expect(avgDeleteTime).toBeLessThan(300);
		});
	});

	test.describe('Concurrent Performance', () => {
		test('should handle concurrent read operations', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const concurrency = 20;
			const promises = [];
			
			const start = Date.now();
			
			for (let i = 0; i < concurrency; i++) {
				promises.push(api(request, '/api/config'));
			}
			
			const results = await Promise.all(promises);
			const totalTime = measureTime(start);
			
			// All requests should succeed
			for (const res of results) {
				expect(res.status()).toBe(200);
			}
			
			const avgTimePerRequest = totalTime / concurrency;
			
			console.log(`Concurrent reads (${concurrency}) - Total: ${totalTime}ms, Avg per request: ${avgTimePerRequest}ms`);
			
			// Concurrent reads should be efficient
			expect(avgTimePerRequest).toBeLessThan(200);
			expect(totalTime).toBeLessThan(5000);
		});

		test('should handle concurrent write operations', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const concurrency = 10;
			const promises = [];
			
			const start = Date.now();
			
			for (let i = 0; i < concurrency; i++) {
				promises.push(
					api(request, '/api/config', {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						data: { entries: { [`CONCURRENT_${i}`]: `value_${i}` } }
					})
				);
			}
			
			const results = await Promise.all(promises);
			const totalTime = measureTime(start);
			
			// All requests should succeed
			for (const res of results) {
				expect(res.status()).toBe(200);
			}
			
			const avgTimePerRequest = totalTime / concurrency;
			
			console.log(`Concurrent writes (${concurrency}) - Total: ${totalTime}ms, Avg per request: ${avgTimePerRequest}ms`);
			
			// Verify all writes were successful
			const configRes = await api(request, '/api/config');
			const config = await configRes.json();
			
			for (let i = 0; i < concurrency; i++) {
				expect(config.entries[`CONCURRENT_${i}`]).toBe(`value_${i}`);
			}
			
			// Concurrent writes should complete in reasonable time
			expect(totalTime).toBeLessThan(10000);
		});

		test('should handle mixed concurrent operations', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const operations = [];
			const start = Date.now();
			
			// Mix of different operations
			for (let i = 0; i < 5; i++) {
				// Read operations
				operations.push(api(request, '/api/config'));
				operations.push(api(request, '/api/settings'));
				operations.push(api(request, '/api/devices'));
				
				// Write operations
				operations.push(
					api(request, '/api/config', {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						data: { entries: { [`MIXED_${i}`]: `value_${i}` } }
					})
				);
				
				operations.push(
					api(request, '/api/devices', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						data: {
							name: `Mixed Test Device ${i}`,
							host: `192.168.1.${150 + i}`,
							port: 22,
							type: 'ENI_SERVER',
							active: true
						}
					})
				);
			}
			
			const results = await Promise.all(operations);
			const totalTime = measureTime(start);
			
			// Count successes
			let successCount = 0;
			for (const res of results) {
				if (res.status() >= 200 && res.status() < 300) {
					successCount++;
				}
			}
			
			console.log(`Mixed operations (${operations.length}) - Total: ${totalTime}ms, Success: ${successCount}/${operations.length}`);
			
			// Most operations should succeed
			expect(successCount).toBeGreaterThan(operations.length * 0.8);
			expect(totalTime).toBeLessThan(15000);
		});
	});

	test.describe('Load Testing', () => {
		test('should handle sustained load', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const duration = 10000; // 10 seconds
			const requestInterval = 100; // 100ms between requests
			const startTime = Date.now();
			
			const results = [];
			let requestCount = 0;
			
			while (Date.now() - startTime < duration) {
				const requestStart = Date.now();
				
				try {
					const res = await api(request, '/api/config');
					const requestTime = measureTime(requestStart);
					
					results.push({
						status: res.status(),
						time: requestTime,
						timestamp: Date.now()
					});
					
					requestCount++;
				} catch (error) {
					results.push({
						status: 0,
						time: measureTime(requestStart),
						timestamp: Date.now(),
						error: true
					});
				}
				
				// Wait before next request
				await new Promise(resolve => setTimeout(resolve, requestInterval));
			}
			
			const actualDuration = Date.now() - startTime;
			const successCount = results.filter(r => r.status === 200).length;
			const errorCount = results.filter(r => r.error || r.status !== 200).length;
			const avgResponseTime = results
				.filter(r => r.status === 200)
				.reduce((sum, r) => sum + r.time, 0) / successCount;
			
			console.log(`Load test - Duration: ${actualDuration}ms, Requests: ${requestCount}, Success: ${successCount}, Errors: ${errorCount}, Avg response: ${avgResponseTime}ms`);
			
			// Should handle sustained load well
			expect(successCount).toBeGreaterThan(requestCount * 0.9); // 90% success rate
			expect(avgResponseTime).toBeLessThan(1000); // Average response under 1s
		});

		test('should handle burst traffic', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const burstSize = 50;
			const bursts = 3;
			
			for (let burst = 0; burst < bursts; burst++) {
				console.log(`Starting burst ${burst + 1}/${bursts}`);
				
				const burstStart = Date.now();
				const promises = [];
				
				// Create burst of requests
				for (let i = 0; i < burstSize; i++) {
					promises.push(
						api(request, '/api/config', {
							method: 'PUT',
							headers: { 'Content-Type': 'application/json' },
							data: { entries: { [`BURST_${burst}_${i}`]: `value_${i}` } }
						})
					);
				}
				
				const results = await Promise.all(promises);
				const burstTime = measureTime(burstStart);
				
				const successCount = results.filter(r => r.status() === 200).length;
				const avgTimePerRequest = burstTime / burstSize;
				
				console.log(`Burst ${burst + 1} - Time: ${burstTime}ms, Success: ${successCount}/${burstSize}, Avg per request: ${avgTimePerRequest}ms`);
				
				// Should handle bursts reasonably well
				expect(successCount).toBeGreaterThan(burstSize * 0.7); // 70% success rate
				
				// Wait between bursts
				if (burst < bursts - 1) {
					await new Promise(resolve => setTimeout(resolve, 2000));
				}
			}
		});

		test('should handle large data operations', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Test with large configuration
			const largeConfig = {};
			for (let i = 0; i < 1000; i++) {
				largeConfig[`LARGE_KEY_${i}`] = `large_value_${i}_${'x'.repeat(100)}`;
			}
			
			const start = Date.now();
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: largeConfig }
			});
			const time = measureTime(start);
			
			console.log(`Large config operation - Time: ${time}ms, Status: ${res.status()}`);
			
			// Should handle large data (success or graceful failure)
			expect([200, 413, 500]).toContain(res.status());
			
			if (res.status() === 200) {
				// Verify data was saved
				const verifyRes = await api(request, '/api/config');
				const config = await verifyRes.json();
				
				expect(config.entries.LARGE_KEY_0).toBeDefined();
				expect(config.entries.LARGE_KEY_999).toBeDefined();
			}
		});
	});

	test.describe('Memory and Resource Performance', () => {
		test('should handle many devices efficiently', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const deviceCount = 100;
			const deviceIds = [];
			
			console.log(`Creating ${deviceCount} devices...`);
			
			// Create many devices
			const createStart = Date.now();
			for (let i = 0; i < deviceCount; i++) {
				const res = await api(request, '/api/devices', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					data: {
						name: `Performance Device ${i}`,
						host: `10.0.${Math.floor(i / 255)}.${i % 255}`,
						port: 22,
						type: i % 2 === 0 ? 'ENI_SERVER' : 'RASPBERRY_PI',
						active: true
					}
				});
				
				if (res.status() === 201) {
					const device = await res.json();
					deviceIds.push(device.id);
				}
			}
			const createTime = measureTime(createStart);
			
			console.log(`Created ${deviceIds.length} devices in ${createTime}ms`);
			
			// Test listing performance with many devices
			const listStart = Date.now();
			const listRes = await api(request, '/api/devices');
			const listTime = measureTime(listStart);
			
			expect(listRes.status()).toBe(200);
			const devices = await listRes.json();
			
			console.log(`Listed ${devices.length} devices in ${listTime}ms`);
			
			// Test filtering performance
			const filterStart = Date.now();
			const filterRes = await api(request, '/api/devices?type=ENI_SERVER');
			const filterTime = measureTime(filterStart);
			
			expect(filterRes.status()).toBe(200);
			const filteredDevices = await filterRes.json();
			
			console.log(`Filtered to ${filteredDevices.length} devices in ${filterTime}ms`);
			
			// Clean up - delete devices
			console.log('Cleaning up devices...');
			const deleteStart = Date.now();
			for (const id of deviceIds) {
				await api(request, `/api/devices?id=${id}`, {
					method: 'DELETE'
				});
			}
			const deleteTime = measureTime(deleteStart);
			
			console.log(`Deleted ${deviceIds.length} devices in ${deleteTime}ms`);
			
			// Performance should be reasonable
			expect(listTime).toBeLessThan(2000); // List should be under 2s
			expect(filterTime).toBeLessThan(2000); // Filter should be under 2s
		});

		test('should handle large configuration efficiently', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const configSizes = [100, 500, 1000];
			
			for (const size of configSizes) {
				console.log(`Testing configuration with ${size} entries...`);
				
				// Create configuration of specified size
				const config = {};
				for (let i = 0; i < size; i++) {
					config[`CONFIG_KEY_${i}`] = `config_value_${i}`;
				}
				
				// Test write performance
				const writeStart = Date.now();
				const writeRes = await api(request, '/api/config', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { entries: config }
				});
				const writeTime = measureTime(writeStart);
				
				console.log(`Write ${size} entries - Time: ${writeTime}ms, Status: ${writeRes.status()}`);
				
				if (writeRes.status() === 200) {
					// Test read performance
					const readStart = Date.now();
					const readRes = await api(request, '/api/config');
					const readTime = measureTime(readStart);
					
					expect(readRes.status()).toBe(200);
					const readConfig = await readRes.json();
					
					console.log(`Read ${Object.keys(readConfig.entries).length} entries - Time: ${readTime}ms`);
					
					// Verify some data
					expect(readConfig.entries.CONFIG_KEY_0).toBe('config_value_0');
					expect(readConfig.entries[`CONFIG_KEY_${size - 1}`]).toBe(`config_value_${size - 1}`);
					
					// Performance should scale reasonably
					expect(readTime).toBeLessThan(size * 2); // Should be roughly linear
				}
			}
		});
	});

	test.describe('Database Performance', () => {
		test('should handle rapid database operations', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const operations = 50;
			const times = [];
			
			console.log(`Performing ${operations} rapid database operations...`);
			
			for (let i = 0; i < operations; i++) {
				const start = Date.now();
				
				// Perform a database operation (settings update)
				const res = await api(request, '/api/settings', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { rp_count: (i % 10) + 1 }
				});
				
				const time = measureTime(start);
				times.push(time);
				
				expect(res.status()).toBe(200);
			}
			
			const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
			const maxTime = Math.max(...times);
			const minTime = Math.min(...times);
			
			console.log(`Database operations - Avg: ${avgTime}ms, Min: ${minTime}ms, Max: ${maxTime}ms`);
			
			// Database operations should be consistent
			expect(avgTime).toBeLessThan(500);
			expect(maxTime).toBeLessThan(2000);
		});

		test('should maintain performance with data growth', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			const phases = [
				{ entries: 10, devices: 5 },
				{ entries: 50, devices: 20 },
				{ entries: 100, devices: 50 }
			];
			
			for (const phase of phases) {
				console.log(`Testing phase: ${phase.entries} config entries, ${phase.devices} devices`);
				
				// Add configuration entries
				const config = {};
				for (let i = 0; i < phase.entries; i++) {
					config[`PHASE_KEY_${i}`] = `phase_value_${i}`;
				}
				
				await api(request, '/api/config', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { entries: config }
				});
				
				// Add devices
				const deviceIds = [];
				for (let i = 0; i < phase.devices; i++) {
					const res = await api(request, '/api/devices', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						data: {
							name: `Phase Device ${i}`,
							host: `172.16.${Math.floor(i / 255)}.${i % 255}`,
							port: 22,
							type: 'ENI_SERVER',
							active: true
						}
					});
					
					if (res.status() === 201) {
						const device = await res.json();
						deviceIds.push(device.id);
					}
				}
				
				// Test performance with current data size
				const testOperations = [
					{ name: 'config-get', op: () => api(request, '/api/config') },
					{ name: 'devices-list', op: () => api(request, '/api/devices') },
					{ name: 'settings-get', op: () => api(request, '/api/settings') }
				];
				
				for (const test of testOperations) {
					const start = Date.now();
					const res = await test.op();
					const time = measureTime(start);
					
					expect(res.status()).toBe(200);
					console.log(`${test.name} with ${phase.entries} entries, ${phase.devices} devices: ${time}ms`);
					
					// Performance should not degrade significantly
					expect(time).toBeLessThan(1000);
				}
				
				// Clean up devices for next phase
				for (const id of deviceIds) {
					await api(request, `/api/devices?id=${id}`, {
						method: 'DELETE'
					});
				}
			}
		});
	});

	test.describe('Network Performance', () => {
		test('should handle network latency gracefully', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Simulate various network conditions by making requests
			// and measuring response times
			const iterations = 10;
			const results = [];
			
			for (let i = 0; i < iterations; i++) {
				const start = Date.now();
				
				// Make a request that involves multiple operations
				const configRes = await api(request, '/api/config', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					data: { entries: { [`NETWORK_TEST_${i}`]: `value_${i}` } }
				});
				
				const writeTime = measureTime(start);
				
				const readStart = Date.now();
				const readRes = await api(request, '/api/config');
				const readTime = measureTime(readStart);
				
				results.push({
					iteration: i,
					writeTime,
					readTime,
					writeStatus: configRes.status(),
					readStatus: readRes.status()
				});
				
				expect(configRes.status()).toBe(200);
				expect(readRes.status()).toBe(200);
			}
			
			const avgWriteTime = results.reduce((sum, r) => sum + r.writeTime, 0) / results.length;
			const avgReadTime = results.reduce((sum, r) => sum + r.readTime, 0) / results.length;
			
			console.log(`Network performance - Avg write: ${avgWriteTime}ms, Avg read: ${avgReadTime}ms`);
			
			// Should handle network operations efficiently
			expect(avgWriteTime).toBeLessThan(1000);
			expect(avgReadTime).toBeLessThan(500);
		});

		test('should handle request timeouts appropriately', async ({ request }) => {
			await createAuthenticatedUser(request);
			
			// Test with a request that might take longer
			const largeData = {};
			for (let i = 0; i < 5000; i++) {
				largeData[`TIMEOUT_TEST_${i}`] = 'x'.repeat(1000);
			}
			
			const start = Date.now();
			const res = await api(request, '/api/config', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				data: { entries: largeData }
			});
			const time = measureTime(start);
			
			console.log(`Large request - Time: ${time}ms, Status: ${res.status()}`);
			
			// Should either succeed or fail gracefully within reasonable time
			expect([200, 413, 500, 504]).toContain(res.status());
			expect(time).toBeLessThan(30000); // Should not hang indefinitely
		});
	});
});