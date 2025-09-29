import fs from 'fs';
import path from 'path';
import multer from 'multer';

const certsDir = () => process.env.TLS_CERT_DIR || path.join(process.cwd(), 'certs');

export function ensureCertsDir() {
	const dir = certsDir();
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	return dir;
}

export function currentTlsStatus() {
	const dir = ensureCertsDir();
	return {
		pfx: fs.existsSync(path.join(dir, 'server.pfx')),
		key: fs.existsSync(path.join(dir, 'server.key')),
		crt: fs.existsSync(path.join(dir, 'server.crt')),
		chain: fs.existsSync(path.join(dir, 'chain.crt'))
	};
}

export function mountTlsRoutes(app, isSuperuserGuard, onReload) {
	ensureCertsDir();
	const upload = multer({ storage: multer.memoryStorage() });

	app.get('/api/tls/status', isSuperuserGuard, (req, res) => {
		res.status(200).json(currentTlsStatus());
	});

	app.post('/api/tls/reload', isSuperuserGuard, (req, res) => {
		try {
			onReload?.();
			return res.status(200).json({ ok: true });
		} catch (e) {
			return res.status(500).json({ error: String(e) });
		}
	});

	app.post('/api/tls/upload/pfx', isSuperuserGuard, upload.single('pfx'), (req, res) => {
		if (!req.file) return res.status(400).json({ error: 'pfx file required' });
		const dir = ensureCertsDir();
		fs.writeFileSync(path.join(dir, 'server.pfx'), req.file.buffer);
		onReload?.();
		res.status(201).json({ ok: true });
	});

	app.post(
		'/api/tls/upload/pem',
		isSuperuserGuard,
		upload.fields([
			{ name: 'key', maxCount: 1 },
			{ name: 'cert', maxCount: 1 },
			{ name: 'chain', maxCount: 1 }
		]),
		(req, res) => {
			const files = req.files || {};
			if (!files.key?.[0] || !files.cert?.[0]) {
				return res.status(400).json({ error: 'key and cert required; chain optional' });
			}
			const dir = ensureCertsDir();
			fs.writeFileSync(path.join(dir, 'server.key'), files.key[0].buffer);
			fs.writeFileSync(path.join(dir, 'server.crt'), files.cert[0].buffer);
			if (files.chain?.[0]) fs.writeFileSync(path.join(dir, 'chain.crt'), files.chain[0].buffer);
			onReload?.();
			return res.status(201).json({ ok: true });
		}
	);
}