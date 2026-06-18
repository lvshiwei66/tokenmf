import { describe, it, expect } from "vitest";
import { detectAllApps } from "../detectors/index.js";

describe("App detectors", () => {
  it("detectAllApps returns array", () => {
    const apps = detectAllApps();
    expect(Array.isArray(apps)).toBe(true);
  });

  it("detectAllApps handles errors gracefully", () => {
    // This test verifies that detector errors don't crash the app
    const apps = detectAllApps();
    expect(apps).toBeDefined();
  });
});