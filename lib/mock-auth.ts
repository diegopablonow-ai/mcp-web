// ---------------------------------------------------------------------------
// mock-auth.ts — mock JWT builder for use in Route Handlers (server-side).
// Only imported in non-production environments.
//
// If JWT_SECRET is set in the environment (even in development), this function
// produces a properly HMAC-SHA256-signed token so that the proxy.ts signature
// verification path is exercised end-to-end — no more silent "skip" in dev.
// Without JWT_SECRET it falls back to an unsigned "mock-signature" token, which
// proxy.ts still accepts in development-only mode with a console.warn.
// ---------------------------------------------------------------------------

function base64url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function buildClaims(email: string) {
  return {
    sub: `u_${email.split("@")[0]}`,
    email,
    role: email.startsWith("admin") ? "admin" : "member",
    name: email.split("@")[0],
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  }
}

/**
 * Build mock tokens for a Route Handler response.
 *
 * When JWT_SECRET is present, produces a real HMAC-SHA256-signed token so
 * the proxy.ts verification path is exercised locally. When absent, falls
 * back to an unsigned token that proxy.ts accepts in development with a warn.
 */
export async function buildMockTokensForRoute(
  email: string,
): Promise<{ token: string; refreshToken: string }> {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = base64url(JSON.stringify(buildClaims(email)))
  const unsigned = `${header}.${payload}`

  const secret = process.env.JWT_SECRET
  if (secret) {
    // Sign properly so proxy.ts verifySignature() is exercised in dev.
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(unsigned))
    const sigB64 = Buffer.from(sig)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
    return {
      token: `${unsigned}.${sigB64}`,
      refreshToken: "mock-refresh-token",
    }
  }

  // JWT_SECRET not set — proxy accepts this in dev mode with a console.warn.
  return {
    token: `${unsigned}.mock-signature`,
    refreshToken: "mock-refresh-token",
  }
}
