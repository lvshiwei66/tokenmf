import { createHash } from "node:crypto";
import { hostname, platform, arch } from "node:os";

/**
 * Checksum seed shared between CLI and API.
 * Not a secret — only proves the value was computed by tmf CLI,
 * not a third party guessing a random string.
 */
const CHECKSUM_SEED = "tmf-v2";

/**
 * Generate a 64-char hex fingerprint from machine characteristics.
 * Idempotent: same machine always produces the same value.
 */
export function getFingerprint(): string {
  const data = `${hostname()}-${platform()}-${arch()}`;
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Compute checksum: first 16 hex chars of SHA256(seed + fingerprint).
 */
function checksum(fp: string): string {
  return createHash("sha256")
    .update(CHECKSUM_SEED + fp)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Generate x-client-id header value.
 * Format: fingerprint.checksum  (64hex.16hex)
 *
 * No env var required — checksum proves CLI origin.
 */
export function getClientId(fingerprint?: string): string {
  const fp = fingerprint ?? getFingerprint();
  return `${fp}.${checksum(fp)}`;
}
