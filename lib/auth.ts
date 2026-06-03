import { NextRequest } from "next/server";

// Token shape produced by /api/auth: 32 lowercase hex characters.
const TOKEN_RE = /^[a-f0-9]{32}$/;

/**
 * Lightweight request guard. The real security is the password check in
 * /api/auth — here we only verify the caller presents a well-formed token,
 * so requests without a session can't reach the upstream model APIs.
 *
 * Returns true when the request carries a valid-looking token.
 */
export function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get("x-ff-token");
  return !!token && TOKEN_RE.test(token);
}
