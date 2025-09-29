import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { encryptToFile, decryptFromFile } from './crypto-util.js';

function keysDir() {
	const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
	const dir = path.join(dataDir, 'ssh');
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	return dir;
}

export function mountSshKeyRoutes(app, isSuperuserGuard) {
	const upload = multer({ storage: multer.memoryStorage() });
	const dir = keysDir();

	app.get('/api/ssh-keys/status', isSuperuserGuard, (req, res) => {
		const priv = fs.existsSync(path.join(dir, 'id_rsa.enc'));
		const pub = fs.existsSync(path.join(dir, 'id_rsa.pub'));
		res.status(200).json({ hasPrivate: priv, hasPublic: pub });
	});

	app.post('/api/ssh-keys/upload', isSuperuserGuard, upload.fields([
		{ name: 'private', maxCount: 1 },
		{ name: 'public', maxCount: 1 }
	]), (req, res) => {
		const files = req.files || {};
		if (!files.private?.[0]) return res.status(400).json({ error: 'private key required' });
		const privPath = path.join(dir, 'id_rsa.enc');
		encryptToFile(privPath, files.private[0].buffer);
		if (files.public?.[0]) {
			fs.writeFileSync(path.join(dir, 'id_rsa.pub'), files.public[0].buffer);
		}
		return res.status(201).json({ ok: true });
	});

	app.delete('/api/ssh-keys', isSuperuserGuard, (req, res) => {
		const privPath = path.join(dir, 'id_rsa.enc');
		const pubPath = path.join(dir, 'id_rsa.pub');
		if (fs.existsSync(privPath)) fs.rmSync(privPath);
		if (fs.existsSync(pubPath)) fs.rmSync(pubPath);
		return res.status(204).end();
	});
}
