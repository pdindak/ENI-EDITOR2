"use client";

import { useEffect, useState } from 'react';

type Device = { id: number; name: string; host: string; port: number; type: 'ENI_SERVER' | 'RASPBERRY_PI'; active: number };

export default function DevicesPage() {
	const [servers, setServers] = useState<Device[]>([]);
	const [rps, setRps] = useState<Device[]>([]);
	const [msg, setMsg] = useState<string | null>(null);

	async function refresh() {
		const all = await fetch('/api/devices').then((r) => r.json());
		setServers(all.filter((d: Device) => d.type === 'ENI_SERVER'));
		setRps(all.filter((d: Device) => d.type === 'RASPBERRY_PI'));
	}

	useEffect(() => {
		refresh();
	}, []);

	async function add(type: 'ENI_SERVER' | 'RASPBERRY_PI', form: HTMLFormElement) {
		const fd = new FormData(form);
		const res = await fetch('/api/devices', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: fd.get('name'),
				host: fd.get('host'),
				port: Number(fd.get('port') || 22),
				type,
				active: true
			})
		});
		setMsg(res.ok ? 'Added' : 'Add failed');
		await refresh();
		form.reset();
	}

	async function remove(id: number) {
		const res = await fetch(`/api/devices?id=${id}`, { method: 'DELETE' });
		setMsg(res.ok ? 'Removed' : 'Remove failed');
		await refresh();
	}

	return (
		<main style={{ padding: 24 }}>
			<h2>Devices</h2>
			{msg && <p>{msg}</p>}
			<section>
				<h3>ENI Servers</h3>
				<ul>
					{servers.map((d) => (
						<li key={d.id}>
							{d.name} — {d.host}:{d.port}
							<button onClick={() => remove(d.id)} style={{ marginLeft: 8 }}>Delete</button>
						</li>
					))}
				</ul>
				<form onSubmit={(e) => { e.preventDefault(); add('ENI_SERVER', e.currentTarget); }}>
					<input name="name" placeholder="name" required />
					<input name="host" placeholder="host" required />
					<input name="port" placeholder="port" defaultValue={22} />
					<button type="submit">Add ENI Server</button>
				</form>
			</section>

			<section style={{ marginTop: 16 }}>
				<h3>Raspberry Pis</h3>
				<ul>
					{rps.map((d) => (
						<li key={d.id}>
							{d.name} — {d.host}:{d.port}
							<button onClick={() => remove(d.id)} style={{ marginLeft: 8 }}>Delete</button>
						</li>
					))}
				</ul>
				<form onSubmit={(e) => { e.preventDefault(); add('RASPBERRY_PI', e.currentTarget); }}>
					<input name="name" placeholder="name" required />
					<input name="host" placeholder="host" required />
					<input name="port" placeholder="port" defaultValue={22} />
					<button type="submit">Add RP</button>
				</form>
			</section>
		</main>
	);
}