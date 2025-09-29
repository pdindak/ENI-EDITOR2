"use client";

import { useEffect, useState } from 'react';

type Status = { hasPrivate: boolean; hasPublic: boolean };

export default function SshPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch('/api/ssh-keys/status', { cache: 'no-store' });
    setStatus(res.ok ? await res.json() : null);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/ssh-keys/upload', { method: 'POST', body: fd });
    setMsg(res.ok ? 'Uploaded' : 'Upload failed');
    await refresh();
  }

  async function removeKeys() {
    const res = await fetch('/api/ssh-keys', { method: 'DELETE' });
    setMsg(res.ok || res.status === 204 ? 'Deleted' : 'Delete failed');
    await refresh();
  }

  return (
    <main style={{ padding: 24 }}>
      <h2>SSH Keys</h2>
      {msg && <p>{msg}</p>}
      <pre>{status ? JSON.stringify(status, null, 2) : 'Loading...'}</pre>
      <section style={{ marginTop: 16 }}>
        <h3>Upload Private/Public Key</h3>
        <form onSubmit={upload}>
          <div>
            <label>Private (.pem/.key): </label>
            <input name="private" type="file" accept=".pem,.key" required />
          </div>
          <div>
            <label>Public (.pub): </label>
            <input name="public" type="file" accept=".pub" />
          </div>
          <button type="submit">Upload</button>
        </form>
      </section>
      <section style={{ marginTop: 16 }}>
        <button onClick={removeKeys} disabled={!status?.hasPrivate && !status?.hasPublic}>Delete Keys</button>
      </section>
    </main>
  );
}
