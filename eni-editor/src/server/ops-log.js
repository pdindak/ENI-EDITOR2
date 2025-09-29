import { connectDatabase } from './db.js';

export function ensureOpsLogSchema() {
	const db = connectDatabase();
	db.prepare(`
		CREATE TABLE IF NOT EXISTS ops_logs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			type TEXT NOT NULL,
			message TEXT NOT NULL,
			level TEXT NOT NULL DEFAULT 'info',
			created_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`).run();
	return db;
}

export function logEntry(type, message, level = 'info') {
	const db = ensureOpsLogSchema();
	db.prepare('INSERT INTO ops_logs (type, message, level) VALUES (?, ?, ?)').run(type, message, level);
}

export function listLogs(limit = 200) {
	const db = ensureOpsLogSchema();
	return db.prepare('SELECT * FROM ops_logs ORDER BY id DESC LIMIT ?').all(limit);
}