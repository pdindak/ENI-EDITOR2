import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDatabase } from '@/server/db';
import { getSettings, updateSettings } from '@/server/repositories';

export async function GET() {
  const db = connectDatabase();
  const s = getSettings(db);
  return NextResponse.json(s, { status: 200 });
}

const updateSchema = z.object({
  rp_count: z.number().int().min(1).optional(),
  linux_source_path: z.string().min(1).optional(),
  rpi_destination_path: z.string().min(1).optional()
});

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const db = connectDatabase();
  const updated = updateSettings(db, parsed.data);
  return NextResponse.json(updated, { status: 200 });
}
