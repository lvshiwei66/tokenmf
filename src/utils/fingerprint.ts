import { createHash } from "node:crypto";
import { hostname, platform, arch } from "node:os";

export function generateFingerprint(): string {
  const data = `${hostname()}-${platform()}-${arch()}`;
  return createHash("sha256").update(data).digest("hex").slice(0, 32);
}