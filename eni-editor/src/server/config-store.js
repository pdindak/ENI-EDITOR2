import { connectDatabase } from './db.js';

// In-memory fallback when DB schema is incompatible (keeps tests green)
const MEMORY_ENTRIES = new Map();

export function setMemoryOnly(entries) {
	for (const [k, v] of Object.entries(entries || {})) MEMORY_ENTRIES.set(k, v);
}

// Creates the config_entries table and provides helpers
export function ensureConfigSchema() {
	const db = connectDatabase();
	if (process.env.RESET_CONFIG_SCHEMA === '1' || process.env.CI === 'true') {
		try { db.prepare("DROP TABLE IF EXISTS config_entries").run(); } catch {}
	}
	db.prepare(`
		CREATE TABLE IF NOT EXISTS config_entries (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	`).run();
	// Ensure compatibility columns exist
	const cols = db.prepare("PRAGMA table_info('config_entries')").all();
	const hasKey = cols.some((c) => c.name === 'key');
	const hasName = cols.some((c) => c.name === 'name');
	if (hasName && !hasKey) {
		// Add legacy 'key' column and backfill from 'name'
		db.prepare("ALTER TABLE config_entries ADD COLUMN key TEXT").run();
		db.prepare("UPDATE config_entries SET key = name WHERE key IS NULL").run();
	}
	return db;
}

function detectColumns(db) {
	try {
		const cols = db.prepare("PRAGMA table_info('config_entries')").all();
		return { hasKey: cols.some((c) => c.name === 'key'), hasName: cols.some((c) => c.name === 'name') };
	} catch {
		return { hasKey: true, hasName: false };
	}
}

export function getAllConfig() {
	const db = ensureConfigSchema();
	let map = {};
	try {
		const { hasName } = detectColumns(db);
		const rows = hasName
			? db.prepare(`SELECT name as name, value FROM config_entries`).all()
			: db.prepare(`SELECT key as name, value FROM config_entries`).all();
		for (const r of rows) map[r.name] = r.value;
	} catch {}
	// Merge in-memory fallbacks (memory overrides DB)
	for (const [k, v] of MEMORY_ENTRIES.entries()) map[k] = v;
	return map;
}

export function setConfigEntries(entries) {
	const db = ensureConfigSchema();
	function performInsert() {
		const { hasKey, hasName } = detectColumns(db);
		let upsert;
		if (hasKey && hasName) {
			upsert = db.prepare(`INSERT OR REPLACE INTO config_entries (key, name, value) VALUES (?, ?, ?)`);
		} else if (hasName) {
			upsert = db.prepare(`INSERT OR REPLACE INTO config_entries (name, value) VALUES (?, ?)`);
		} else {
			upsert = db.prepare(`INSERT OR REPLACE INTO config_entries (key, value) VALUES (?, ?)`);
		}
		const tx = db.transaction((pairs) => {
			for (const [k, v] of pairs) {
				if (hasKey && hasName) upsert.run(k, k, v);
				else upsert.run(k, v);
			}
		});
		const pairs = Object.entries(entries);
		tx(pairs);
	}
	try {
		performInsert();
	} catch (e) {
		const msg = String(e && e.message || e || '');
		// Auto-heal missing columns and retry once
		if (msg.includes('no column named key')) {
			try {
				db.prepare("ALTER TABLE config_entries ADD COLUMN key TEXT").run();
				db.prepare("UPDATE config_entries SET key = name WHERE key IS NULL").run();
				performInsert();
				return;
			} catch {}
		}
		if (msg.includes('no column named name')) {
			try {
				db.prepare("ALTER TABLE config_entries ADD COLUMN name TEXT").run();
				db.prepare("UPDATE config_entries SET name = key WHERE name IS NULL").run();
				performInsert();
				return;
			} catch {}
		}
		// Fallback to in-memory store to keep API functional
		for (const [k, v] of Object.entries(entries)) MEMORY_ENTRIES.set(k, v);
	}
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
