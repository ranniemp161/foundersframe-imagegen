import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Generate a random 32-character hex token (16 random bytes).
function makeToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const expected = process.env.APP_PASSWORD;
    if (!expected) {
      return NextResponse.json(
        { error: "APP_PASSWORD is not configured on the server." },
        { status: 500 }
      );
    }

    if (typeof password !== "string" || password !== expected) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    return NextResponse.json({ token: makeToken() });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
