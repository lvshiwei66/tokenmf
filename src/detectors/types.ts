export interface AppConfig {
  name: string;
  version?: string;
  path: string;
  configPath: string;
  configFormat: "toml" | "json" | "yaml";
}

export interface Detector {
  name: string;
  detect(): AppConfig | null;
}

export interface DetectionReport {
  timestamp: string;
  apps: AppConfig[];
  fingerprint: string;
}
