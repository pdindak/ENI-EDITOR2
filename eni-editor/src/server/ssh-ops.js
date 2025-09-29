import fs from 'fs';
import path from 'path';
import SftpClient from 'ssh2-sftp-client';
import { decryptFromFile } from './crypto-util.js';
import { listDevices } from './repositories.js';
import { connectDatabase } from './db.js';
import { generateConfigText, getAllConfig } from './config-store.js';
import { getSettings } from './repositories.js';
import { logEntry } from './ops-log.js';

function loadPrivateKeyBuffer() {
	const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
	const encPath = path.join(dataDir, 'ssh', 'id_rsa.enc');
	if (!fs.existsSync(encPath)) throw new Error('Private key not uploaded');
	return decryptFromFile(encPath);
}

async function sftpConnect(host, port, username = 'root') {
	const privateKey = loadPrivateKeyBuffer();
	const client = new SftpClient();
	await client.connect({ host, port, username, privateKey });
	return client;
}

export async function getConfigFromFirstAvailableEniServer() {
	const db = connectDatabase();
	const servers = listDevices(db, 'ENI_SERVER');
	const settings = getSettings(db);
	for (const srv of servers) {
		try {
			const client = await sftpConnect(srv.host, srv.port);
			const data = await client.get(settings.linux_source_path);
			await client.end();
			const text = Buffer.isBuffer(data) ? data.toString('utf8') : data;
			logEntry('get', `Fetched config from ${srv.host}`);
			return text;
		} catch (e) {
			logEntry('get', `Failed fetching from ${srv.host}: ${String(e)}`, 'error');
		}
	}
	throw new Error('No ENI server accessible');
}

export async function commitConfigToRaspberryPis() {
	const db = connectDatabase();
	const rps = listDevices(db, 'RASPBERRY_PI');
	const settings = getSettings(db);
	const configText = generateConfigText(getAllConfig());
	for (const rp of rps) {
		try {
			const client = await sftpConnect(rp.host, rp.port);
			const dest = settings.rpi_destination_path;
			const tmp = `/tmp/config.settings.${Date.now()}`;
			await client.put(Buffer.from(configText, 'utf8'), tmp);
			await client.rename(tmp, dest);
			await client.end();
			logEntry('commit', `Pushed config to ${rp.host}`);
		} catch (e) {
			logEntry('commit', `Failed pushing to ${rp.host}: ${String(e)}`, 'error');
		}
	}
}
