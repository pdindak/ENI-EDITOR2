"use client";

import { useEffect, useState } from 'react';

type Status = { pfx: boolean; key: boolean; crt: boolean; chain: boolean };

export default function TlsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setMessage(null);
    const res = await fetch('/api/tls/status', { cache: 'no-store' });
    if (res.ok) {
      setStatus(await res.json());
    } else {
      setMessage('Failed to read TLS status (are you logged in as SUPERUSER?)');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function uploadPfx(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch('/api/tls/upload/pfx', { method: 'POST', body: fd });
    setMessage(res.ok ? 'PFX uploaded' : 'Upload failed');
    await refresh();
  }

  async function uploadPem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch('/api/tls/upload/pem', { method: 'POST', body: fd });
    setMessage(res.ok ? 'PEM uploaded' : 'Upload failed');
    await refresh();
  }

  async function reload() {
    const res = await fetch('/api/tls/reload', { method: 'POST' });
    setMessage(res.ok ? 'HTTPS reloaded' : 'Reload failed');
  }

  return (
    <main style={{ padding: 24 }}>
      <h2>TLS Management</h2>
      {message && <p>{message}</p>}
      <button onClick={refresh}>Refresh Status</button>
      <pre>{status ? JSON.stringify(status, null, 2) : 'Loading...'}</pre>

      <section style={{ marginTop: 16 }}>
        <h3>Upload .pfx</h3>
        <form onSubmit={uploadPfx}>
          <input name="pfx" type="file" accept=".pfx" required />
          <button type="submit">Upload PFX</button>
        </form>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Upload PEM/KEY (chain optional)</h3>
        <form onSubmit={uploadPem}>
          <input name="key" type="file" accept=".key,.pem" required />
          <input name="cert" type="file" accept=".crt,.pem" required />
          <input name="chain" type="file" accept=".crt,.pem" />
          <button type="submit">Upload PEM</button>
        </form>
      </section>

      <section style={{ marginTop: 16 }}>
        <button onClick={reload}>Reload HTTPS</button>
      </section>
    </main>
  );
}
