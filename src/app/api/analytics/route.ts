import { NextResponse } from "next/server";

interface StoredEvent {
  timestamp: number;
  faces: number;
  recognition: string | null;
  expression: string | null;
  attentionScore: number;
  audioEnergy: number;
  pitch: number;
  variability: number;
}

const buffer: StoredEvent[] = [];
const MAX = 200;

export async function POST(request: Request) {
  const payload = (await request.json()) as StoredEvent;
  buffer.push(payload);
  if (buffer.length > MAX) buffer.shift();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ events: buffer });
}
