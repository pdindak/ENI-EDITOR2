"use client";

import { useEffect, useMemo, useState } from 'react';

type Settings = {
	id: number;
	rp_count: number;
	linux_source_path: string;
	rpi_destination_path: string;
};

type Entries = Record<string, string>;

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: any }) {
	return (
		<button onClick={onClick} style={{ padding: 8, marginRight: 8, background: active ? '#333' : '#ddd', color: active ? '#fff' : '#000' }}>
			{children}
		</button>
	);
}

export default function SuperuserConfigPage() {
	const [settings, setSettings] = useState<Settings | null>(null);
	const [entries, setEntries] = useState<Entries>({});
	const [activeTab, setActiveTab] = useState<string>('SUPERUSER');
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		(async () => {
			const s = await fetch('/api/settings').then((r) => r.json());
			setSettings(s);
			const c = await fetch('/api/config').then((r) => r.json());
			setEntries(c.entries || {});
		})();
	}, []);

	const tabs = useMemo(() => {
		const count = settings?.rp_count ?? 1;
		const t = ['SUPERUSER', 'USER'];
		for (let i = 1; i <= count; i += 1) t.push(`RP${i}`);
		return t;
	}, [settings?.rp_count]);

	function handleEntryChange(key: string, value: string) {
		setEntries((prev) => ({ ...prev, [key]: value }));
	}

	async function updateRpCount(delta: number) {
		if (!settings) return;
		const next = Math.max(1, (settings.rp_count || 1) + delta);
		const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rp_count: next }) });
		if (res.ok) {
			const s = await res.json();
			setSettings(s);
		} else {
			setMessage('Failed to update RP count');
		}
	}

	async function saveSettingsPaths(nextLinuxPath: string, nextRpiPath: string) {
		const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linux_source_path: nextLinuxPath, rpi_destination_path: nextRpiPath }) });
		if (res.ok) setSettings(await res.json());
	}

	async function saveEntries() {
		setMessage(null);
		const res = await fetch('/api/config', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ entries })
		});
		setMessage(res.ok ? 'Saved' : 'Save failed');
	}

	function renderSuperuser() {
		const superuserKeys = [
			'EMAIL_RECIPIENT','RETRY_COUNT','LOG_LEVEL','X_ECM_API_ID','X_ECM_API_KEY','X_CP_API_ID','X_CP_API_KEY',
			'NET_DEVICE_API_URL','NET_DEVICE_METRICS_API_URL','NET_DEVICE_SIGNAL_SAMPLES_API_URL','ACCOUNT','USERNAME','PASS','DOMAIN',
			'Output_Dir','WINDOWS_SHARE','PUSH_FILES','TARGET','GPORT'
		];
		return (
			<div>
				<h4>Global Settings</h4>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
					<div>
						<label style={{ display: 'block', fontWeight: 'bold' }}>linux_source_path</label>
						<input style={{ width: '100%' }} defaultValue={settings?.linux_source_path || ''} onBlur={(e) => saveSettingsPaths(e.target.value, settings?.rpi_destination_path || '')} />
					</div>
					<div>
						<label style={{ display: 'block', fontWeight: 'bold' }}>rpi_destination_path</label>
						<input style={{ width: '100%' }} defaultValue={settings?.rpi_destination_path || ''} onBlur={(e) => saveSettingsPaths(settings?.linux_source_path || '', e.target.value)} />
					</div>
				</div>

				<h4 style={{ marginTop: 16 }}>Configuration</h4>
				{superuserKeys.map((k) => (
					<div key={k} style={{ marginBottom: 8 }}>
						<label style={{ display: 'block', fontWeight: 'bold' }}>{k}</label>
						<input style={{ width: '100%' }} value={entries[k] || ''} onChange={(e) => handleEntryChange(k, e.target.value)} />
					</div>
				))}
			</div>
		);
	}

	function renderUser() {
		const keys = Object.keys(entries).filter((k) => k.endsWith('_PING_COMMENT') || k.endsWith('_PING_LOCATION') || k.endsWith('_BW_COMMENT') || k.endsWith('_BW_LOCATION'));
		return (
			<div>
				{keys.length === 0 && <p>No USER entries yet.</p>}
				{keys.map((k) => (
					<div key={k} style={{ marginBottom: 8 }}>
						<label style={{ display: 'block', fontWeight: 'bold' }}>{k}</label>
						<input style={{ width: '100%' }} value={entries[k] || ''} onChange={(e) => handleEntryChange(k, e.target.value)} />
					</div>
				))}
			</div>
		);
	}

	function renderRpTab(index: number) {
		const prefix = `RP${index}_`;
		const keys = Object.keys(entries).filter((k) => k.startsWith(prefix));
		return (
			<div>
				{keys.length === 0 && <p>No entries yet for RP{index}.</p>}
				{keys.map((k) => (
					<div key={k} style={{ marginBottom: 8 }}>
						<label style={{ display: 'block', fontWeight: 'bold' }}>{k}</label>
						<input style={{ width: '100%' }} value={entries[k] || ''} onChange={(e) => handleEntryChange(k, e.target.value)} />
					</div>
				))}
			</div>
		);
	}

	return (
		<main style={{ padding: 24 }}>
			<h2>SUPERUSER Config</h2>
			{message && <p>{message}</p>}
			<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
				<strong>RP count:</strong>
				<button onClick={() => updateRpCount(-1)}>-</button>
				<span>{settings?.rp_count ?? 1}</span>
				<button onClick={() => updateRpCount(1)}>+</button>
			</div>
			<div style={{ marginBottom: 16 }}>
				{tabs.map((t) => (
					<TabButton key={t} active={activeTab === t} onClick={() => setActiveTab(t)}>
						{t}
					</TabButton>
				))}
			</div>
			<div>
				{activeTab === 'SUPERUSER' && renderSuperuser()}
				{activeTab === 'USER' && renderUser()}
				{activeTab.startsWith('RP') && renderRpTab(Number(activeTab.slice(2)))}
			</div>
			<div style={{ marginTop: 16 }}>
				<button onClick={saveEntries}>Save</button>
			</div>
		</main>
	);
}