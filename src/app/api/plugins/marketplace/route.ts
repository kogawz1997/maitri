import { NextResponse } from 'next/server';
import { MARKETPLACE_PLUGINS } from '@/lib/plugins/registry';

export async function GET() {
  return NextResponse.json({ items: MARKETPLACE_PLUGINS, count: MARKETPLACE_PLUGINS.length });
}
