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
	
	// Build dynamic SQL for partial updates
	const fields = [];
	const params = [];
	
	if (values.rp_count !== undefined) {
		fields.push('rp_count = ?');
		params.push(next.rp_count);
	}
	if (values.linux_source_path !== undefined) {
		fields.push('linux_source_path = ?');
		params.push(next.linux_source_path);
	}
	if (values.rpi_destination_path !== undefined) {
		fields.push('rpi_destination_path = ?');
		params.push(next.rpi_destination_path);
	}
	
	if (fields.length === 0) {
		return current; // No updates needed
	}
	
	fields.push('updated_at = datetime(\'now\')');
	const sql = `UPDATE settings SET ${fields.join(', ')} WHERE id = 1`;
	dbc.prepare(sql).run(...params);
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
