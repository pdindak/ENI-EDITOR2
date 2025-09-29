// JavaScript versions of repository helpers
import { connectDatabase } from './db.js';

export function getSettings(db) {
	const dbc = db || connectDatabase();
	return dbc.prepare('SELECT * FROM settings WHERE id = 1').get();
}

export function updateSettings(db, values) {
	const dbc = db || connectDatabase();
	const current = dbc.prepare('SELECT * FROM settings WHERE id = 1').get();
	const next = { ...current, ...values };
	dbc.prepare(
		`UPDATE settings SET rp_count = ?, linux_source_path = ?, rpi_destination_path = ?, updated_at = datetime('now') WHERE id = 1`
	).run(next.rp_count, next.linux_source_path, next.rpi_destination_path);
	return dbc.prepare('SELECT * FROM settings WHERE id = 1').get();
}

export function listDevices(db, type) {
	const dbc = db || connectDatabase();
	if (type) {
		return dbc.prepare('SELECT * FROM devices WHERE type = ? ORDER BY id DESC').all(type);
	}
	return dbc.prepare('SELECT * FROM devices ORDER BY id DESC').all();
}

export function addDevice(db, device) {
	const dbc = db || connectDatabase();
	const stmt = dbc.prepare('INSERT INTO devices (name, host, port, type, active) VALUES (?, ?, ?, ?, ?)');
	const info = stmt.run(device.name, device.host, device.port, device.type, device.active);
	return dbc.prepare('SELECT * FROM devices WHERE id = ?').get(info.lastInsertRowid);
}

export function deleteDevice(db, id) {
	const dbc = db || connectDatabase();
	dbc.prepare('DELETE FROM devices WHERE id = ?').run(id);
}
