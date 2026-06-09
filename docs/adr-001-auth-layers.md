# ADR-001: Three-Layer Authentication Architecture

**Status:** Accepted  
**Date:** 2026-06-08  
**Context:** Contributors have observed auth enforcement in three separate places — `proxy.ts`, `AppShell`, and individual data-fetching hooks — and asked which layer is authoritative.

---

## Decision

Authentication is enforced in three places by design. Each layer has a distinct, non-overlapping responsibility. **`proxy.ts` is the sole security boundary.** The other two layers are UX concerns only.

---

## Layers and Their Roles

### Layer 1 — `proxy.ts` (authoritative security gate)

**What it does:** Intercepts every non-public, non-internal HTTP request before any page renders. Validates the `mcp.token` httpOnly cookie: checks the HMAC-SHA256 signature and the `exp` claim. Redirects unauthenticated requests to `/login`. Redirects authenticated users away from `/login` and `/signup`.

**Why it's the only real security boundary:** It runs server-side on the Node.js runtime (Next.js 16). An attacker cannot bypass it from the browser. No page, component, or API route that sits behind proxy.ts will ever render for an unauthenticated user — period.

**Runtime note (Next.js 16):** Unlike the old `middleware.ts` which ran on the Edge runtime, `proxy.ts` runs on the full Node.js runtime. The duplicate Web Crypto path in `verifySignature()` was originally written to avoid `Buffer` (unavailable at the edge). That workaround is no longer needed and is a tracked simplification: both `proxy.ts → verifySignature()` and `lib/jwt.ts → verifyJwt()` should be consolidated into one shared helper.

---

### Layer 2 — `AppShell` (loading-state UX, not a security gate)

**What it does:** Shows a spinner when `loading && !isAuthenticated`. This only fires during a client-side navigation *after* the user has already logged out but before the router has landed on `/login`. On hard reload, `initialAuthenticated` is already `true` (set by the layout Server Component which can read the cookie server-side), so `loading` starts as `false` and no spinner is shown.

**Why it exists:** Without it, a client navigation to a protected route while `useAuth` is still resolving `/api/auth/me` would briefly render the shell chrome (sidebar, navbar) for a fraction of a second before the redirect fires. The spinner prevents that flash.

**It is not a security check.** It does not prevent access to any data. If the spinner is removed, the only consequence is a brief UI flash on edge-case client navigations. proxy.ts still blocks all actual data.

---

### Layer 3 — Individual hooks (`useAuth`, `useServers`, etc.)

**What they do:** Check `isAuthenticated` before making API calls. Return early or show empty state when the user is not authenticated.

**Why they exist:** Defence-in-depth for developer ergonomics. If a new route is accidentally added without a proxy guard (easy to miss during rapid development), the hooks will refuse to fetch data and the component will render nothing meaningful rather than leaking information. They also serve as documentation: the hook's guard makes it obvious that the route requires auth.

**They are not the authoritative gate.** Remove them and security would still hold (proxy.ts handles that). Add them and you get a cleaner developer experience and a second line of defence for mistakes.

---

## Why Not Collapse to One Layer?

| Option | Trade-off |
|--------|-----------|
| **proxy.ts only** | Loses the loading-state fix (flash on client nav) and the hook-level early-return ergonomics. Both are cheap to keep. |
| **AppShell only** | Client-side JS — easily bypassed. Not a security boundary at all. |
| **Hooks only** | Same problem as AppShell. No guarantee every route remembers to check. |

Three layers costs very little and each targets a problem the others can't solve. The risk is not over-engineering — it's the confusion this ADR is meant to resolve.

---

## Guidance for New Contributors

- **Adding a new protected route?** You don't need to touch AppShell or add hook guards — proxy.ts covers it automatically via its catch-all matcher. Hook guards are optional but recommended for dev ergonomics.
- **Adding a new public route?** Add the path to `PUBLIC_PATHS` in `proxy.ts`. That is the only required change.
- **Debugging an auth redirect loop?** Start in `proxy.ts → isAuthenticated()`. The other two layers cannot cause a redirect.
- **Seeing a loading flash?** That's AppShell (Layer 2). Check `initialAuthenticated` in the layout Server Component.

---

## Future Simplification

Once the Buffer-avoidance workaround is cleaned up (Node.js runtime confirmed in Next.js 16), `proxy.ts → verifySignature()` and `lib/jwt.ts → verifyJwt()` should be merged into a single `lib/verifyJwt.ts` imported by both. This eliminates the "mirror changes in both files" maintenance hazard currently noted in the code comments.
