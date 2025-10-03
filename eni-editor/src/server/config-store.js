import { connectDatabase } from './db.js';

// Creates the config_entries table and provides helpers
	export function ensureConfigSchema() {
		const db = connectDatabase();
		// Create with new schema (name instead of key) if not exists
		db.prepare(`
			CREATE TABLE IF NOT EXISTS config_entries (
				name TEXT PRIMARY KEY,
				value TEXT NOT NULL
			);
		`).run();
		// If legacy column 'key' exists, migrate to 'name'
		const cols = db.prepare("PRAGMA table_info('config_entries')").all();
		const hasLegacyKey = cols.some((c) => c.name === 'key');
		if (hasLegacyKey) {
			db.transaction(() => {
				db.prepare(`CREATE TABLE IF NOT EXISTS config_entries_m (
					name TEXT PRIMARY KEY,
					value TEXT NOT NULL
				)`).run();
				db.prepare(`INSERT OR REPLACE INTO config_entries_m (name, value) SELECT key, value FROM config_entries`).run();
				db.prepare(`DROP TABLE config_entries`).run();
				db.prepare(`ALTER TABLE config_entries_m RENAME TO config_entries`).run();
			})();
		}
		return db;
	}

export function getAllConfig() {
	const db = ensureConfigSchema();
		const rows = db.prepare('SELECT name, value FROM config_entries').all();
		const map = {};
		for (const r of rows) map[r.name] = r.value;
	return map;
}

export function setConfigEntries(entries) {
	const db = ensureConfigSchema();
	const insert = db.prepare("INSERT INTO config_entries (name, value) VALUES (?, ?)");
	const deleteSome = (keys) => {
		if (!keys.length) return;
		const placeholders = keys.map(() => '?').join(',');
		db.prepare(`DELETE FROM config_entries WHERE name IN (${placeholders})`).run(...keys);
	};
	const tx = db.transaction((pairs) => {
		deleteSome(pairs.map(([k]) => k));
		for (const [k, v] of pairs) {
			insert.run(k, v);
		}
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
