// Node 18+ exposes globalThis.crypto natively, but some test environments
// need the explicit assignment. Belt-and-suspenders polyfill.
import { webcrypto } from "node:crypto"
if (!globalThis.crypto) {
  // @ts-expect-error — assigning to readonly in older typings
  globalThis.crypto = webcrypto
}
