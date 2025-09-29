// Minimal SQLite connection and schema bootstrap using better-sqlite3
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export type AppDatabase = ReturnType<typeof connectDatabase>;

export function connectDatabase() {
	const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
	const dbPath = path.join(dataDir, 'eni_editor.db');
	const db = new Database(dbPath);
	bootstrap(db);
	return db;
}

function bootstrap(db: Database.Database) {
	// Users table: local accounts
	db.prepare(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL CHECK(role IN ('ENI-USER','ENI-SUPERUSER')),
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`).run();

	// Settings: singleton config, including RP count and target paths
	db.prepare(`
		CREATE TABLE IF NOT EXISTS settings (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			rp_count INTEGER NOT NULL DEFAULT 1,
			linux_source_path TEXT NOT NULL DEFAULT '/etc/eni/config.settings',
			rpi_destination_path TEXT NOT NULL DEFAULT '/ephidin/ENI/config',
			created_at TEXT NOT NULL DEFAULT (datetime('now')),
			updated_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`).run();

	// Ensure singleton row exists
	const exists = db.prepare('SELECT 1 FROM settings WHERE id = 1').get();
	if (!exists) {
		db.prepare(
			`INSERT INTO settings (id, rp_count, linux_source_path, rpi_destination_path) VALUES (1, 1, '/etc/eni/config.settings', '/ephidin/ENI/config')`
		).run();
	}

	// Devices: inventory of ENI servers and Raspberry Pis
	db.prepare(`
		CREATE TABLE IF NOT EXISTS devices (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			host TEXT NOT NULL,
			port INTEGER NOT NULL DEFAULT 22,
			type TEXT NOT NULL CHECK(type IN ('ENI_SERVER','RASPBERRY_PI')),
			active INTEGER NOT NULL DEFAULT 1,
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`).run();
}