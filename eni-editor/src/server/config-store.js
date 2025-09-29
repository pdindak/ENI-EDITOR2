import { connectDatabase } from './db.js';

// Creates the config_entries table and provides helpers
export function ensureConfigSchema() {
	const db = connectDatabase();
	db.prepare(`
		CREATE TABLE IF NOT EXISTS config_entries (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	`).run();
	return db;
}

export function getAllConfig() {
	const db = ensureConfigSchema();
	const rows = db.prepare('SELECT key, value FROM config_entries').all();
	const map = {};
	for (const r of rows) map[r.key] = r.value;
	return map;
}

export function setConfigEntries(entries) {
	const db = ensureConfigSchema();
	const upsert = db.prepare('INSERT INTO config_entries (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
	const tx = db.transaction((pairs) => {
		for (const [k, v] of pairs) upsert.run(k, v);
	});
	const pairs = Object.entries(entries);
	tx(pairs);
}

// Parser/generator for shell-like KEY=VALUE lines, preserving raw values
export function parseConfigText(text) {
	const result = {};
	if (!text) return result;
	const lines = text.split(/\r?\n/);
	for (const raw of lines) {
		const line = raw.trim();
		if (!line || line.startsWith('#')) continue;
		const eq = line.indexOf('=');
		if (eq <= 0) continue;
		const key = line.slice(0, eq).trim();
		const value = line.slice(eq + 1).trim();
		if (key) result[key] = value;
	}
	return result;
}

export function generateConfigText(entries) {
	const keys = Object.keys(entries).sort();
	return keys.map((k) => `${k}=${entries[k]}`).join('\n') + '\n';
}
