import sessionPkg from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import bcrypt from 'bcryptjs';
import { connectDatabase } from './db.js';

const session = sessionPkg.default || sessionPkg;
const SQLiteStoreFactory = (connectSqlite3.default || connectSqlite3);
const SQLiteStore = SQLiteStoreFactory(session);

export function configureSessions(app) {
	const dataDir = process.env.DATA_DIR || 'data';
	app.use(
		session({
			store: new SQLiteStore({ db: 'sessions.sqlite', dir: dataDir }),
			secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
			resave: false,
			saveUninitialized: false,
			cookie: {
				httpOnly: true,
				sameSite: 'lax',
				secure: false
			}
		})
	);
}

export function mountAuthRoutes(app) {
	const db = connectDatabase();

	app.post('/api/auth/register', (req, res) => {
		const { username, password, role } = req.body || {};
		if (!username || !password || !role) {
			return res.status(400).json({ error: 'username, password, role required' });
		}
		if (!['ENI-USER', 'ENI-SUPERUSER'].includes(role)) {
			return res.status(400).json({ error: 'invalid role' });
		}
		const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
		if (existing) {
			return res.status(409).json({ error: 'username already exists' });
		}
		const password_hash = bcrypt.hashSync(password, 10);
		db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, password_hash, role);
		return res.status(201).json({ ok: true });
	});

	app.post('/api/auth/login', (req, res) => {
		const { username, password } = req.body || {};
		if (!username || !password) {
			return res.status(400).json({ error: 'username and password required' });
		}
		const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
		if (!user) return res.status(401).json({ error: 'invalid credentials' });
		if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'invalid credentials' });
		req.session.user = { id: user.id, username: user.username, role: user.role };
		return res.status(200).json({ ok: true });
	});

	app.post('/api/auth/logout', (req, res) => {
		req.session.destroy(() => {
			res.status(204).end();
		});
	});

	app.get('/api/auth/me', (req, res) => {
		const user = req.session.user || null;
		return res.status(200).json({ user });
	});
}
