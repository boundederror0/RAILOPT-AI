import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export const MAX_JSON_BODY_BYTES = 1_048_576;

export async function parseJson<T>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (text.length > MAX_JSON_BODY_BYTES) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}