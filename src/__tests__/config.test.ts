import { describe, it, expect, afterEach } from "vitest";
import { getFingerprint, getApiUrl } from "../config/index.js";

describe("CLI config", () => {
  // ── getFingerprint ─────────────────────────────────────

  describe("getFingerprint", () => {
    it("returns a 64-char hex string", () => {
      const fp = getFingerprint();
      expect(fp).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(fp)).toBe(true);
    });

    it("returns the same value on repeated calls (idempotent)", () => {
      const fp1 = getFingerprint();
      const fp2 = getFingerprint();
      expect(fp1).toBe(fp2);
    });
  });

  // ── getApiUrl ──────────────────────────────────────────

  describe("getApiUrl", () => {
    const originalEnv = process.env["TMF_API_URL"];

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env["TMF_API_URL"] = originalEnv;
      } else {
        delete process.env["TMF_API_URL"];
      }
    });

    it("returns default URL when nothing configured", () => {
      delete process.env["TMF_API_URL"];
      const url = getApiUrl();
      expect(url).toBe("https://tokenmf.com");
    });

    it("returns env var when set", () => {
      process.env["TMF_API_URL"] = "http://localhost:3000";
      const url = getApiUrl();
      expect(url).toBe("http://localhost:3000");
    });
  });
});
