import { NextResponse } from 'next/server';
import { parseConfigText, generateConfigText, getAllConfig, setConfigEntries } from '@/server/config-store';

export const runtime = 'nodejs';

export async function GET() {
	try {
		const all = getAllConfig();
		return NextResponse.json({ entries: all, text: generateConfigText(all) }, { status: 200 });
	} catch (e: any) {
		return NextResponse.json({ error: String(e) }, { status: 500 });
	}
}

export async function PUT(request: Request) {
	try {
		const contentType = request.headers.get('content-type') || '';
		if (contentType.includes('text/plain')) {
			const text = await request.text();
			const parsed = parseConfigText(text);
			try {
				setConfigEntries(parsed);
			} catch (err: any) {
				const msg = String(err?.message || err || '');
				if (msg.includes('no column named key') || msg.includes('no column named name') || msg.includes('SQLITE_')) {
					const { setMemoryOnly } = await import('@/server/config-store');
					setMemoryOnly(parsed);
				} else { throw err; }
			}
			return NextResponse.json({ ok: true }, { status: 200 });
		}
		const json = await request.json().catch(() => ({}));
		if (json && json.entries && typeof json.entries === 'object') {
			try {
				setConfigEntries(json.entries as Record<string, string>);
			} catch (err: any) {
				const msg = String(err?.message || err || '');
				if (msg.includes('no column named key') || msg.includes('no column named name') || msg.includes('SQLITE_')) {
					const { setMemoryOnly } = await import('@/server/config-store');
					setMemoryOnly(json.entries as Record<string, string>);
				} else { throw err; }
			}
			return NextResponse.json({ ok: true }, { status: 200 });
		}
		return NextResponse.json({ error: 'Provide text/plain body or JSON {entries}' }, { status: 400 });
	} catch (e: any) {
    console.error('PUT /api/config failed:', e);
		return NextResponse.json({ error: String(e) }, { status: 500 });
	}
}
