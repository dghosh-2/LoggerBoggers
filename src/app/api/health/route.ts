import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'loggerboggers-api',
    ts: new Date().toISOString(),
  });
}

