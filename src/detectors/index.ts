import type { AppConfig } from "./types.js";

export interface Detector {
  name: string;
  detect(): Promise<AppConfig | null>;
}