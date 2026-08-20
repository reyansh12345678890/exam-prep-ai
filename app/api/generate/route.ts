import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'Question generation now runs locally in the browser. No server AI or API key is required.' }, { status: 410 });
}
