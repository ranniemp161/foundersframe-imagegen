import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export const runtime = "edge";

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

    // Set token expiration to 24 hours from now
    const expiryMs = Date.now() + 24 * 60 * 60 * 1000;
    const token = await signToken(expiryMs, expected);

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

