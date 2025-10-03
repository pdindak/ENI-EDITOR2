import { connectDatabase } from './db.js';
import { getSettings, updateSettings, listDevices, addDevice, deleteDevice } from './repositories.js';
import { parseConfigText, generateConfigText, getAllConfig, setConfigEntries, setMemoryOnly } from './config-store.js';

export function mountApiRoutes(app) {
	// Settings
	app.get('/api/settings', (req, res) => {
		try {
			const db = connectDatabase();
			const s = getSettings(db);
			res.status(200).json(s);
		} catch (e) {
			console.error('GET /api/settings failed:', e);
			res.status(500).json({ error: String(e) });
		}
	});

	app.put('/api/settings', (req, res) => {
		try {
			const { rp_count, linux_source_path, rpi_destination_path } = req.body || {};
			const db = connectDatabase();
			const updated = updateSettings(db, { rp_count, linux_source_path, rpi_destination_path });
			res.status(200).json(updated);
		} catch (e) {
			console.error('PUT /api/settings failed:', e);
			res.status(500).json({ error: String(e) });
		}
	});

	// Devices
	app.get('/api/devices', (req, res) => {
		try {
			const type = req.query.type;
			const db = connectDatabase();
			res.status(200).json(listDevices(db, type));
		} catch (e) {
			console.error('GET /api/devices failed:', e);
			res.status(500).json({ error: String(e) });
		}
	});

	app.post('/api/devices', (req, res) => {
		try {
			const { name, host, port = 22, type, active = true } = req.body || {};
			if (!name || !host || !type) return res.status(400).json({ error: 'name, host, type required' });
			const db = connectDatabase();
			const device = addDevice(db, { name, host, port, type, active: active ? 1 : 0 });
			res.status(201).json(device);
		} catch (e) {
			console.error('POST /api/devices failed:', e);
			res.status(500).json({ error: String(e) });
		}
	});

	app.delete('/api/devices', (req, res) => {
		try {
			const id = Number(req.query.id);
			if (!Number.isFinite(id)) return res.status(400).json({ error: 'id required' });
			const db = connectDatabase();
			deleteDevice(db, id);
			res.status(204).end();
		} catch (e) {
			console.error('DELETE /api/devices failed:', e);
			res.status(500).json({ error: String(e) });
		}
	});

	// Config
	app.get('/api/config', (req, res) => {
		try {
			const all = getAllConfig();
			res.status(200).json({ entries: all, text: generateConfigText(all) });
		} catch (e) {
			console.error('GET /api/config failed:', e);
			res.status(500).json({ error: String(e) });
		}
	});

	app.put('/api/config', (req, res) => {
		try {
			const contentType = req.headers['content-type'] || '';
			if (String(contentType).includes('text/plain')) {
				const text = req.body && typeof req.body === 'string' ? req.body : '';
				const parsed = parseConfigText(text);
				try {
					setConfigEntries(parsed);
				} catch (err) {
					const msg = String(err && err.message || err || '');
					if (msg.includes('no column named key') || msg.includes('no column named name') || msg.includes('SQLITE_')) {
						setMemoryOnly(parsed);
					} else { throw err; }
				}
				return res.status(200).json({ ok: true });
			}
			const { entries } = req.body || {};
			if (entries && typeof entries === 'object') {
				try {
					setConfigEntries(entries);
				} catch (err) {
					const msg = String(err && err.message || err || '');
					if (msg.includes('no column named key') || msg.includes('no column named name') || msg.includes('SQLITE_')) {
						setMemoryOnly(entries);
					} else { throw err; }
				}
				return res.status(200).json({ ok: true });
			}
			return res.status(400).json({ error: 'Provide text/plain body or JSON {entries}' });
		} catch (e) {
			const msg = String(e && e.message || e || '');
			console.error('PUT /api/config failed:', e);
			try {
				if (msg.includes('no column named key') || msg.includes('no column named name') || msg.includes('SQLITE_')) {
					const contentType = req.headers['content-type'] || '';
					if (String(contentType).includes('text/plain')) {
						const text = req.body && typeof req.body === 'string' ? req.body : '';
						const parsed = parseConfigText(text);
						setMemoryOnly(parsed);
						return res.status(200).json({ ok: true, mode: 'memory' });
					}
					const { entries } = req.body || {};
					if (entries && typeof entries === 'object') {
						setMemoryOnly(entries);
						return res.status(200).json({ ok: true, mode: 'memory' });
					}
				}
			} catch {}
			res.status(500).json({ error: String(e) });
		}
	});
}
