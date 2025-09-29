import { listLogs, logEntry } from './ops-log.js';
import { getConfigFromFirstAvailableEniServer, commitConfigToRaspberryPis } from './ssh-ops.js';
import { parseConfigText, setConfigEntries } from './config-store.js';

export function mountOpsRoutes(app, isSuperuserGuard) {
	app.get('/api/ops/logs', isSuperuserGuard, (req, res) => {
		const limit = Number(req.query.limit || 200);
		res.status(200).json(listLogs(limit));
	});

	app.post('/api/ops/get-config', isSuperuserGuard, async (req, res) => {
		try {
			const text = await getConfigFromFirstAvailableEniServer();
			const parsed = parseConfigText(text);
			setConfigEntries(parsed);
			logEntry('get', 'Config stored locally');
			res.status(200).json({ ok: true, parsedCount: Object.keys(parsed).length });
		} catch (e) {
			res.status(500).json({ error: String(e) });
		}
	});

	app.post('/api/ops/commit-config', isSuperuserGuard, async (req, res) => {
		try {
			await commitConfigToRaspberryPis();
			res.status(200).json({ ok: true });
		} catch (e) {
			res.status(500).json({ error: String(e) });
		}
	});
}
