import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function ensureDir(dir) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getKeyfilePath() {
	const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
	const sshDir = path.join(dataDir, 'ssh');
	ensureDir(sshDir);
	return path.join(sshDir, 'secret.key');
}

export function loadOrCreateEncryptionKey() {
	// Prefer env secret if provided
	const envKey = process.env.SSH_KEYS_SECRET;
	if (envKey) {
		const buf = Buffer.from(envKey, envKey.length === 64 ? 'hex' : 'utf8');
		// Normalize to 32 bytes by hashing if needed
		return crypto.createHash('sha256').update(buf).digest();
	}
	const keyfile = getKeyfilePath();
	if (fs.existsSync(keyfile)) {
		return fs.readFileSync(keyfile);
	}
	const key = crypto.randomBytes(32);
	fs.writeFileSync(keyfile, key);
	return key;
}

export function encryptToFile(targetPath, dataBuffer) {
	const key = loadOrCreateEncryptionKey();
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const ciphertext = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
	const tag = cipher.getAuthTag();
	const payload = Buffer.concat([iv, tag, ciphertext]);
	fs.writeFileSync(targetPath, payload);
}

export function decryptFromFile(sourcePath) {
	const key = loadOrCreateEncryptionKey();
	const payload = fs.readFileSync(sourcePath);
	const iv = payload.subarray(0, 12);
	const tag = payload.subarray(12, 28);
	const ciphertext = payload.subarray(28);
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
