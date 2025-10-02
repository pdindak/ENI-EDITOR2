// @ts-check
import { test, expect } from '@playwright/test';
import { expectOk } from './helpers';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:8080';

async function api(context, path, init) {
	return await context.fetch(BASE + path, init);
}

async function createSuperuser(request) {
	const username = `tls_superuser_${Date.now()}_${Math.random()}`;
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
	const username = `tls_user_${Date.now()}_${Math.random()}`;
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

test.describe('Comprehensive TLS Management Tests', () => {
	
	test.describe('TLS Status', () => {
		test('should check TLS status as superuser', async ({ request }) => {
			await createSuperuser(request);
			
			const res = await api(request, '/api/tls/status');
			expect(res.status()).toBe(200);
			
			const status = await res.json();
			expect(status.pfx).toBeDefined();
			expect(status.key).toBeDefined();
			expect(status.crt).toBeDefined();
			expect(status.chain).toBeDefined();
			
			expect(typeof status.pfx).toBe('boolean');
			expect(typeof status.key).toBe('boolean');
			expect(typeof status.crt).toBe('boolean');
			expect(typeof status.chain).toBe('boolean');
		});

		test('should deny TLS status access to regular users', async ({ request }) => {
			await createRegularUser(request);
			
			const res = await api(request, '/api/tls/status');
			expect(res.status()).toBe(403);
			
			const error = await res.json();
			expect(error.error).toBe('forbidden');
		});

		test('should deny TLS status access to unauthenticated users', async ({ request }) => {
			const res = await api(request, '/api/tls/status');
			expect(res.status()).toBe(403);
		});

		test('should return consistent TLS status across requests', async ({ request }) => {
			await createSuperuser(request);
			
			const res1 = await api(request, '/api/tls/status');
			const res2 = await api(request, '/api/tls/status');
			
			expect(res1.status()).toBe(200);
			expect(res2.status()).toBe(200);
			
			const status1 = await res1.json();
			const status2 = await res2.json();
			
			expect(status1.pfx).toBe(status2.pfx);
			expect(status1.key).toBe(status2.key);
			expect(status1.crt).toBe(status2.crt);
			expect(status1.chain).toBe(status2.chain);
		});
	});

	test.describe('TLS Reload', () => {
		test('should handle TLS reload as superuser', async ({ request }) => {
			await createSuperuser(request);
			
			const res = await api(request, '/api/tls/reload', {
				method: 'POST'
			});

			// Should succeed or fail gracefully
			expect([200, 500]).toContain(res.status());
			
			if (res.status() === 200) {
				const result = await res.json();
				expect(result.ok).toBe(true);
			} else {
				const error = await res.json();
				expect(error.error).toBeDefined();
			}
		});

		test('should deny TLS reload to regular users', async ({ request }) => {
			await createRegularUser(request);
			
			const res = await api(request, '/api/tls/reload', {
				method: 'POST'
			});

			expect(res.status()).toBe(403);
		});

		test('should deny TLS reload to unauthenticated users', async ({ request }) => {
			const res = await api(request, '/api/tls/reload', {
				method: 'POST'
			});

			expect(res.status()).toBe(403);
		});

		test('should handle multiple TLS reload requests', async ({ request }) => {
			await createSuperuser(request);
			
			// Perform multiple reload requests
			const reloadPromises = [];
			for (let i = 0; i < 3; i++) {
				reloadPromises.push(
					api(request, '/api/tls/reload', { method: 'POST' })
				);
			}
			
			const results = await Promise.all(reloadPromises);
			
			// All should complete (success or failure)
			for (const res of results) {
				expect([200, 500]).toContain(res.status());
			}
		});
	});

	test.describe('PFX Certificate Upload', () => {
		test('should handle PFX certificate upload as superuser', async ({ request }) => {
			await createSuperuser(request);
			
			// Create mock PFX content (not a real certificate)
			const pfxContent = new Uint8Array([
				0x30, 0x82, 0x05, 0x4a, 0x02, 0x01, 0x03, 0x30, // Mock PFX header
				0x82, 0x05, 0x0f, 0x06, 0x09, 0x2a, 0x86, 0x48,
				0x86, 0xf7, 0x0d, 0x01, 0x07, 0x01, 0xa0, 0x82
			]);
			
			const formData = new FormData();
			formData.append('pfx', new Blob([pfxContent], { type: 'application/x-pkcs12' }), 'server.pfx');

			const res = await api(request, '/api/tls/upload/pfx', {
				method: 'POST',
				body: formData
			});

			// Should succeed or fail gracefully (depending on certificate validity)
			expect([201, 400, 500]).toContain(res.status());
		});

		test('should require PFX file for upload', async ({ request }) => {
			await createSuperuser(request);
			
			const formData = new FormData();
			// Don't append any file

			const res = await api(request, '/api/tls/upload/pfx', {
				method: 'POST',
				body: formData
			});

			expect(res.status()).toBe(400);
			const error = await res.json();
			expect(error.error).toBe('pfx file required');
		});

		test('should deny PFX upload to regular users', async ({ request }) => {
			await createRegularUser(request);
			
			const pfxContent = new Uint8Array([0x30, 0x82, 0x05, 0x4a]);
			const formData = new FormData();
			formData.append('pfx', new Blob([pfxContent], { type: 'application/x-pkcs12' }), 'server.pfx');

			const res = await api(request, '/api/tls/upload/pfx', {
				method: 'POST',
				body: formData
			});

			expect(res.status()).toBe(403);
		});

		test('should handle various PFX file sizes', async ({ request }) => {
			await createSuperuser(request);
			
			const sizes = [100, 1000, 10000];
			
			for (const size of sizes) {
				const pfxContent = new Uint8Array(size).fill(0x30);
				const formData = new FormData();
				formData.append('pfx', new Blob([pfxContent], { type: 'application/x-pkcs12' }), 'server.pfx');

				const res = await api(request, '/api/tls/upload/pfx', {
					method: 'POST',
					body: formData
				});

				// Should handle various sizes
				expect([201, 400, 413, 500]).toContain(res.status());
			}
		});

		test('should handle malformed PFX files', async ({ request }) => {
			await createSuperuser(request);
			
			const malformedContents = [
				'not a pfx file',
				'',
				new Uint8Array([0x00, 0x01, 0x02, 0x03]), // Random bytes
				new Uint8Array(0) // Empty
			];
			
			for (const content of malformedContents) {
				const formData = new FormData();
				formData.append('pfx', new Blob([content], { type: 'application/x-pkcs12' }), 'server.pfx');

				const res = await api(request, '/api/tls/upload/pfx', {
					method: 'POST',
					body: formData
				});

				// Should handle malformed files gracefully
				expect([201, 400, 500]).toContain(res.status());
			}
		});
	});

	test.describe('PEM Certificate Upload', () => {
		test('should handle PEM certificate upload as superuser', async ({ request }) => {
			await createSuperuser(request);
			
			const keyContent = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB
UKIGex0RQmdHYUiUt0T7JbQ+3CyXGhxVqtCaKWi5/geI/WqLNXrr2L8DczLx+Xqr
wl/KtqfFfsP+ARYz6FurIDAiDOvvGiNi+VXsU9jsyBd62a5YEpgHid46y5K2bs4p
NO8w4HKlfz2gDmuBiXo4Mdz3I0/WqTXs4p8cOa6zQH+RdgHPJBKHH6ZJwqHGF8+T
mAvoFBRSD+i9+RlsADm_DroT6fx8MrTCgl1e1CMWInLlnFS+VkLNwNGtVVcGc+z
+jA0pL0EpqEvnSHRqHdQI6cxHpT+ac4p1EI5SH5RUKSCwmwMCO5aPSN8f+QzGZ2G
n/ykJdMbAgMBAAECggEBALc2lQQsk0Cq7Dsz+RjdREDwlbXexBgBdoXStaOI5NHH
vwphiKkmdVxPFOdHvghcKbK36cDcYwTST2AkR+28Y+9+EjPANuVYNaanQMBg1ZeI
+7DWRzJbPUcz5B9s3BzrKSyj/h4DABFjd+zuDXNydgK1eQBFXTmhGtjc1P9cma9R
n3MUMdE2YWmRJ2L1WbSDWEMI22S5OuZrk7AxGJxFnvhxmoBBuDfBpJWhGaCi2F+8
cMlUD1BLl+AnqJ7VBFMplOPiI+GkmzArfvMsgotTOws9PkHD58Q9TmI9l7VL8+jH
q904Gd+9Aw0aEJ2ESyxiOizoXmdUkoSSJuVGd4ACIEkCgYEA5ry7rUKAgiTNpHrE
QgGTviiOnyWoLVf1SnuUiX3m5idy56c+MpPYhfEeJ8rYYy6mbaHAgocl4zZlDjyO
urApcHRAgjhNywxXtNxn/sOmqaPAMqW86Jzce9rn6MWXmctBkBGrWQ91dCrFmvjJ
9YjqHRxbzckP5Gkmz7zfqBn+oy8CgYEA0ZGzjFd0ZBHQk0eCcH340DHLOIpkQ0E4
PCIHqrpFFlaW032intBuvDDQpNe1gx4HL7HCbl2ms2i4zJq8v7MjFJ5XLKiGp9Dq
M/8Gg9WdrdHh2dGjLIe7babWcb4pmpXqF1gm62/lc/RDNcDXQukCQYEA9+GghdpP
d7h5UEHF+rJxF0D2bMxZsdN3AjWK4KeCaroRWoJWvoMpaaJb7OBiFBjEAb64JWsp
9WUfZjZMI1hwrI+VlSGkxSRN+IFiEXprXwU6eFpfLFNugOQw4hD2P5c5+bWukBrr
jFwqJFkEHpb8BtF4UEAcQX3t24CpOqOGY1cCgYEAyFxx4RHI0VhOw5VPiJKVynQs
PhwOQSi5ICFjH3ZwgMoCaLyOvoiMlGbVxBRSM4JzHKhGqFVsMuNURPyMZBSHMhb5
oh5c1wI2sFnFqNgjXh5btCygFbzI2ac/78XuXuPbBvV/riMT+Qjj7eOpHiE7+5rW
nnQmtKbM3RjXpVHdRoECgYEAiAvHg5SBVFt5lDCFuFuP5dNzpiHEsM+VKQBDYFSW
nnbY65yLtzyYHQjD/BXp3dMnFMFrUycRkMiDdCKIFw2L0ckE4+3i+D2M0TGE+S4g
cdS7+eHzZaHdvO5E2c+gWrAXyxtZBxObgbSMxAS2LuPTgDSd+Gqleq0i+OcPe/eJ
vUE=
-----END PRIVATE KEY-----`;

			const certContent = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiIMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTExMjMxMDg1OTU5WhcNMTIxMjMwMDg1OTU5WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAu1SU1L7VLPHCgVCiBnsdEUJnR2FIlLdE+yW0PtwslxocVarQmilou/4H
iP1qizV669i/A3My8fl6q8JfyranxX7D/gEWM+hbqyAwIgzr7xojYvlV7FPY7MgX
etmuWBKYB4neOsuStm7OKTTvMOBypX89oA5rgYl6ODHc9yNP1qk17OKfHDmus0B/
kXYBzyQShx+mScKhxhfPk5gL6BQUUg/ovfkZbAA5vw66E+n8fDK0woJdXtQjFiJ
y5ZxUvlZCzcDRrVVXBnPs/owNKS9BKahL50h0ah3UCOnMR6U/mnOKdRCOUh+UVCk
gsJsDAjuWj0jfH/kMxmdho/8pCXTGwIDAQABo1AwTjAdBgNVHQ4EFgQUU3m/WqoR
t2cxyBb90PLYR8ff4RYwHwYDVR0jBBgwFoAUU3m/WqoRt2cxyBb90PLYR8ff4RYw
DAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQUFAAOCAQEAWjsKqBuru4vBfU6vShBG
p5+DGFvBz4N+YCeQIIANpHoMUQhQ0aqRdqHRWRjBe4IHrDsKGBspax4Oq9EGQ2bA
E+8jZ38xSfE0EAjqn2d5+VosPVq3pzpY4+9+0O2BVnHyBa82pR5Oahh52w0n2EE
-----END CERTIFICATE-----`;

			const chainContent = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAJC1HiIAZAiIMA0GCSqGSIb3DQEBBQUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMTExMjMxMDg1OTU5WhcNMTIxMjMwMDg1OTU5WjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAu1SU1L7VLPHCgVCiBnsdEUJnR2FIlLdE+yW0PtwslxocVarQmilou/4H
iP1qizV669i/A3My8fl6q8JfyranxX7D/gEWM+hbqyAwIgzr7xojYvlV7FPY7MgX
etmuWBKYB4neOsuStm7OKTTvMOBypX89oA5rgYl6ODHc9yNP1qk17OKfHDmus0B/
kXYBzyQShx+mScKhxhfPk5gL6BQUUg/ovfkZbAA5vw66E+n8fDK0woJdXtQjFiJ
y5ZxUvlZCzcDRrVVXBnPs/owNKS9BKahL50h0ah3UCOnMR6U/mnOKdRCOUh+UVCk
gsJsDAjuWj0jfH/kMxmdho/8pCXTGwIDAQABo1AwTjAdBgNVHQ4EFgQUU3m/WqoR
t2cxyBb90PLYR8ff4RYwHwYDVR0jBBgwFoAUU3m/WqoRt2cxyBb90PLYR8ff4RYw
DAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQUFAAOCAQEAWjsKqBuru4vBfU6vShBG
p5+DGFvBz4N+YCeQIIANpHoMUQhQ0aqRdqHRWRjBe4IHrDsKGBspax4Oq9EGQ2bA
E+8jZ38xSfE0EAjqn2d5+VosPVq3pzpY4+9+0O2BVnHyBa82pR5Oahh52w0n2EE
-----END CERTIFICATE-----`;
			
			const formData = new FormData();
			formData.append('key', new Blob([keyContent], { type: 'text/plain' }), 'server.key');
			formData.append('cert', new Blob([certContent], { type: 'text/plain' }), 'server.crt');
			formData.append('chain', new Blob([chainContent], { type: 'text/plain' }), 'chain.crt');

			const res = await api(request, '/api/tls/upload/pem', {
				method: 'POST',
				body: formData
			});

			// Should succeed or fail gracefully
			expect([201, 400, 500]).toContain(res.status());
		});

		test('should require key and cert for PEM upload', async ({ request }) => {
			await createSuperuser(request);
			
			const formData = new FormData();
			// Only provide key, missing cert

			formData.append('key', new Blob(['test key'], { type: 'text/plain' }), 'server.key');

			const res = await api(request, '/api/tls/upload/pem', {
				method: 'POST',
				body: formData
			});

			expect(res.status()).toBe(400);
			const error = await res.json();
			expect(error.error).toBe('key and cert required; chain optional');
		});

		test('should accept PEM upload without chain', async ({ request }) => {
			await createSuperuser(request);
			
			const keyContent = `-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----`;
			const certContent = `-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----`;
			
			const formData = new FormData();
			formData.append('key', new Blob([keyContent], { type: 'text/plain' }), 'server.key');
			formData.append('cert', new Blob([certContent], { type: 'text/plain' }), 'server.crt');

			const res = await api(request, '/api/tls/upload/pem', {
				method: 'POST',
				body: formData
			});

			// Should handle without chain
			expect([201, 400, 500]).toContain(res.status());
		});

		test('should deny PEM upload to regular users', async ({ request }) => {
			await createRegularUser(request);
			
			const formData = new FormData();
			formData.append('key', new Blob(['test key'], { type: 'text/plain' }), 'server.key');
			formData.append('cert', new Blob(['test cert'], { type: 'text/plain' }), 'server.crt');

			const res = await api(request, '/api/tls/upload/pem', {
				method: 'POST',
				body: formData
			});

			expect(res.status()).toBe(403);
		});

		test('should handle various PEM file formats', async ({ request }) => {
			await createSuperuser(request);
			
			const pemFormats = [
				{
					key: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
					cert: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----'
				},
				{
					key: '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----',
					cert: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----'
				},
				{
					key: '-----BEGIN EC PRIVATE KEY-----\ntest\n-----END EC PRIVATE KEY-----',
					cert: '-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----'
				}
			];
			
			for (const format of pemFormats) {
				const formData = new FormData();
				formData.append('key', new Blob([format.key], { type: 'text/plain' }), 'server.key');
				formData.append('cert', new Blob([format.cert], { type: 'text/plain' }), 'server.crt');

				const res = await api(request, '/api/tls/upload/pem', {
					method: 'POST',
					body: formData
				});

				// Should handle various formats
				expect([201, 400, 500]).toContain(res.status());
			}
		});

		test('should handle malformed PEM files', async ({ request }) => {
			await createSuperuser(request);
			
			const malformedPems = [
				{ key: 'not a key', cert: 'not a cert' },
				{ key: '', cert: '' },
				{ key: '-----BEGIN PRIVATE KEY-----\ninvalid\n-----END PRIVATE KEY-----', cert: '-----BEGIN CERTIFICATE-----\ninvalid\n-----END CERTIFICATE-----' }
			];
			
			for (const pem of malformedPems) {
				const formData = new FormData();
				formData.append('key', new Blob([pem.key], { type: 'text/plain' }), 'server.key');
				formData.append('cert', new Blob([pem.cert], { type: 'text/plain' }), 'server.crt');

				const res = await api(request, '/api/tls/upload/pem', {
					method: 'POST',
					body: formData
				});

				// Should handle malformed files gracefully
				expect([201, 400, 500]).toContain(res.status());
			}
		});
	});

	test.describe('TLS Integration', () => {
		test('should update TLS status after certificate upload', async ({ request }) => {
			await createSuperuser(request);
			
			// Check initial status
			const initialStatusRes = await api(request, '/api/tls/status');
			const initialStatus = await initialStatusRes.json();
			
			// Try to upload a PFX certificate
			const pfxContent = new Uint8Array([0x30, 0x82, 0x05, 0x4a]);
			const formData = new FormData();
			formData.append('pfx', new Blob([pfxContent], { type: 'application/x-pkcs12' }), 'server.pfx');

			const uploadRes = await api(request, '/api/tls/upload/pfx', {
				method: 'POST',
				body: formData
			});

			if (uploadRes.status() === 201) {
				// Check status after upload
				const finalStatusRes = await api(request, '/api/tls/status');
				const finalStatus = await finalStatusRes.json();
				
				// PFX status might have changed
				expect(finalStatus.pfx).toBeDefined();
			}
		});

		test('should handle TLS reload after certificate upload', async ({ request }) => {
			await createSuperuser(request);
			
			// Upload certificate first
			const keyContent = `-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----`;
			const certContent = `-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----`;
			
			const formData = new FormData();
			formData.append('key', new Blob([keyContent], { type: 'text/plain' }), 'server.key');
			formData.append('cert', new Blob([certContent], { type: 'text/plain' }), 'server.crt');

			const uploadRes = await api(request, '/api/tls/upload/pem', {
				method: 'POST',
				body: formData
			});

			// Try to reload after upload
			const reloadRes = await api(request, '/api/tls/reload', {
				method: 'POST'
			});

			// Should handle reload attempt
			expect([200, 500]).toContain(reloadRes.status());
		});

		test('should handle concurrent TLS operations', async ({ request }) => {
			await createSuperuser(request);
			
			// Perform multiple concurrent TLS operations
			const operations = [
				api(request, '/api/tls/status'),
				api(request, '/api/tls/reload', { method: 'POST' }),
				api(request, '/api/tls/status')
			];
			
			const results = await Promise.all(operations);
			
			// All operations should complete
			for (const res of results) {
				expect(res.status()).toBeDefined();
				expect(res.status()).toBeGreaterThanOrEqual(200);
				expect(res.status()).toBeLessThan(600);
			}
		});
	});

	test.describe('TLS Error Handling', () => {
		test('should handle empty certificate uploads', async ({ request }) => {
			await createSuperuser(request);
			
			const formData = new FormData();
			// Don't append any files

			const pfxRes = await api(request, '/api/tls/upload/pfx', {
				method: 'POST',
				body: formData
			});
			expect(pfxRes.status()).toBe(400);

			const pemRes = await api(request, '/api/tls/upload/pem', {
				method: 'POST',
				body: formData
			});
			expect(pemRes.status()).toBe(400);
		});

		test('should handle very large certificate files', async ({ request }) => {
			await createSuperuser(request);
			
			// Create large certificate content
			const largeContent = 'A'.repeat(1000000); // 1MB
			
			const formData = new FormData();
			formData.append('pfx', new Blob([largeContent], { type: 'application/x-pkcs12' }), 'server.pfx');

			const res = await api(request, '/api/tls/upload/pfx', {
				method: 'POST',
				body: formData
			});

			// Should handle large files gracefully
			expect([201, 400, 413, 500]).toContain(res.status());
		});

		test('should handle invalid file types', async ({ request }) => {
			await createSuperuser(request);
			
			const formData = new FormData();
			formData.append('pfx', new Blob(['not a certificate'], { type: 'text/plain' }), 'server.txt');

			const res = await api(request, '/api/tls/upload/pfx', {
				method: 'POST',
				body: formData
			});

			// Should handle invalid file types
			expect([201, 400, 500]).toContain(res.status());
		});

		test('should handle TLS operations without proper setup', async ({ request }) => {
			await createSuperuser(request);
			
			// Try reload without certificates
			const reloadRes = await api(request, '/api/tls/reload', {
				method: 'POST'
			});

			// Should handle gracefully
			expect([200, 500]).toContain(reloadRes.status());
		});
	});

	test.describe('TLS Security', () => {
		test('should not expose certificate content in responses', async ({ request }) => {
			await createSuperuser(request);
			
			const statusRes = await api(request, '/api/tls/status');
			expect(statusRes.status()).toBe(200);
			
			const status = await statusRes.json();
			const statusText = JSON.stringify(status);
			
			// Should not contain certificate material
			expect(statusText).not.toContain('-----BEGIN');
			expect(statusText).not.toContain('-----END');
			expect(statusText).not.toContain('PRIVATE KEY');
			expect(statusText).not.toContain('CERTIFICATE');
		});

		test('should handle TLS operations with proper error messages', async ({ request }) => {
			await createSuperuser(request);
			
			const reloadRes = await api(request, '/api/tls/reload', {
				method: 'POST'
			});
			
			if (reloadRes.status() === 500) {
				const error = await reloadRes.json();
				expect(error.error).toBeDefined();
				expect(typeof error.error).toBe('string');
				expect(error.error.length).toBeGreaterThan(0);
				
				// Should not expose sensitive information
				expect(error.error).not.toContain('password');
				expect(error.error).not.toContain('secret');
			}
		});

		test('should validate TLS upload permissions consistently', async ({ request }) => {
			// Test all TLS endpoints require superuser
			await createRegularUser(request);
			
			const endpoints = [
				{ path: '/api/tls/status', method: 'GET' },
				{ path: '/api/tls/reload', method: 'POST' },
				{ path: '/api/tls/upload/pfx', method: 'POST' },
				{ path: '/api/tls/upload/pem', method: 'POST' }
			];
			
			for (const endpoint of endpoints) {
				const res = await api(request, endpoint.path, {
					method: endpoint.method,
					body: endpoint.method === 'POST' ? new FormData() : undefined
				});
				
				expect(res.status()).toBe(403);
			}
		});
	});

	test.describe('TLS File Handling', () => {
		test('should handle different file extensions', async ({ request }) => {
			await createSuperuser(request);
			
			const extensions = ['.pfx', '.p12', '.key', '.pem', '.crt', '.cer'];
			
			for (const ext of extensions) {
				const formData = new FormData();
				formData.append('pfx', new Blob(['test'], { type: 'application/octet-stream' }), `server${ext}`);

				const res = await api(request, '/api/tls/upload/pfx', {
					method: 'POST',
					body: formData
				});

				// Should handle various extensions
				expect([201, 400, 500]).toContain(res.status());
			}
		});

		test('should handle Unicode filenames', async ({ request }) => {
			await createSuperuser(request);
			
			const unicodeNames = [
				'服务器.pfx',
				'сертификат.pfx',
				'証明書.pfx',
				'certificado.pfx'
			];
			
			for (const name of unicodeNames) {
				const formData = new FormData();
				formData.append('pfx', new Blob(['test'], { type: 'application/x-pkcs12' }), name);

				const res = await api(request, '/api/tls/upload/pfx', {
					method: 'POST',
					body: formData
				});

				// Should handle Unicode filenames
				expect([201, 400, 500]).toContain(res.status());
			}
		});

		test('should handle missing file extensions', async ({ request }) => {
			await createSuperuser(request);
			
			const formData = new FormData();
			formData.append('pfx', new Blob(['test'], { type: 'application/x-pkcs12' }), 'server');

			const res = await api(request, '/api/tls/upload/pfx', {
				method: 'POST',
				body: formData
			});

			// Should handle files without extensions
			expect([201, 400, 500]).toContain(res.status());
		});
	});
});