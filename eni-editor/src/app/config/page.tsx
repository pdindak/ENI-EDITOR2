"use client";

import { useEffect, useState } from 'react';

type Log = { id: number; type: string; message: string; level: string; created_at: string };

export default function ConfigOpsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  async function refreshLogs() {
    const res = await fetch('/api/ops/logs');
    if (res.ok) setLogs(await res.json());
  }

  useEffect(() => {
    refreshLogs();
  }, []);

  async function getConfig() {
    setMsg('');
    const res = await fetch('/api/ops/get-config', { method: 'POST' });
    setMsg(res.ok ? 'Fetched config' : 'Fetch failed');
    await refreshLogs();
  }

  async function commitConfig() {
    setMsg('');
    const res = await fetch('/api/ops/commit-config', { method: 'POST' });
    setMsg(res.ok ? 'Committed config' : 'Commit failed');
    await refreshLogs();
  }

  return (
    <main style={{ padding: 24 }}>
      <h2>CONFIG get/commit via SSH</h2>
      {msg && <p>{msg}</p>}
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={getConfig}>Get from ENI server(s)</button>
        <button onClick={commitConfig}>Commit to Raspberry Pis</button>
        <button onClick={refreshLogs}>Refresh Logs</button>
      </div>
      <pre style={{ marginTop: 16 }}>{logs.map((l) => `[${l.created_at}] ${l.level.toUpperCase()} ${l.type}: ${l.message}`).join('\n') || 'No logs yet.'}</pre>
    </main>
  );
}
