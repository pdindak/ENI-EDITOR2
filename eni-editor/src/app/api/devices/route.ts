import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { z } from 'zod';
import { connectDatabase } from '@/server/db';
import { listDevices, addDevice, deleteDevice } from '@/server/repositories';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') as 'ENI_SERVER' | 'RASPBERRY_PI' | null;
  const db = connectDatabase();
  const data = listDevices(db, type ?? undefined);
  return NextResponse.json(data, { status: 200 });
}

const createSchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(22),
  type: z.enum(['ENI_SERVER', 'RASPBERRY_PI']),
  active: z.boolean().default(true)
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const db = connectDatabase();
    const device = addDevice(db, {
      name: parsed.data.name,
      host: parsed.data.host,
      port: parsed.data.port,
      type: parsed.data.type,
      active: parsed.data.active ? 1 : 0
    } as any);
    return NextResponse.json(device, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const idParam = url.searchParams.get('id');
  const id = idParam ? Number(idParam) : NaN;
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
  }
  const db = connectDatabase();
  deleteDevice(db, id);
  return new NextResponse(null, { status: 204 });
}
