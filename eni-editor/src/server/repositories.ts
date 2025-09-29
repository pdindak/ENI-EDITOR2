import type Database from 'better-sqlite3';

export type Settings = {
	id: number;
	rp_count: number;
	linux_source_path: string;
	rpi_destination_path: string;
	created_at: string;
	updated_at: string;
};

export function getSettings(db: Database.Database): Settings {
	return db.prepare('SELECT * FROM settings WHERE id = 1').get() as Settings;
}

export function updateSettings(
	db: Database.Database,
	values: Partial<Pick<Settings, 'rp_count' | 'linux_source_path' | 'rpi_destination_path'>>
): Settings {
	const current = getSettings(db);
	const next = {
		...current,
		...values
	};
	db.prepare(
		`UPDATE settings SET rp_count = ?, linux_source_path = ?, rpi_destination_path = ?, updated_at = datetime('now') WHERE id = 1`
	).run(next.rp_count, next.linux_source_path, next.rpi_destination_path);
	return getSettings(db);
}

export type Device = {
	id: number;
	name: string;
	host: string;
	port: number;
	type: 'ENI_SERVER' | 'RASPBERRY_PI';
	active: number;
	created_at: string;
};

export function listDevices(db: Database.Database, type?: Device['type']): Device[] {
	if (type) {
		return db.prepare('SELECT * FROM devices WHERE type = ? ORDER BY id DESC').all(type) as Device[];
	}
	return db.prepare('SELECT * FROM devices ORDER BY id DESC').all() as Device[];
}

export function addDevice(db: Database.Database, device: Omit<Device, 'id' | 'created_at'>): Device {
	const stmt = db.prepare(
		'INSERT INTO devices (name, host, port, type, active) VALUES (?, ?, ?, ?, ?)' 
	);
	const info = stmt.run(device.name, device.host, device.port, device.type, device.active);
	return db.prepare('SELECT * FROM devices WHERE id = ?').get(info.lastInsertRowid) as Device;
}

export function deleteDevice(db: Database.Database, id: number): void {
	db.prepare('DELETE FROM devices WHERE id = ?').run(id);
}