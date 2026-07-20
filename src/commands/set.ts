import { configureApp, resolveAppName } from "../appfits/index.js";
import {
  loadTemplates,
  saveTemplates,
  setTemplate,
} from "../config/index.js";
import type { UseParams, Template, RoleModels } from "../types/provider.js";

export interface SetOptions {
  baseUrl?: string;
  key?: string;
  model?: string;
  models?: string[];
  roleModels?: RoleModels;
  env?: Record<string, string>;
  effort?: string;
  saveAs?: string;
}

export async function setCommand(
  app: string,
  options: SetOptions,
): Promise<void> {
  // 1. Validate required params
  if (!options.baseUrl) {
    throw new Error("--baseUrl is required for set command.");
  }
  if (!options.key) {
    throw new Error("--key (API Key) is required for set command.");
  }

  // 2. Resolve app name
  const canonical = resolveAppName(app);
  if (!canonical) {
    throw new Error(
      `Unknown application "${app}". Supported: claude (claude-code, cc), codex, openclaw, opencode, hermes, pi.`,
    );
  }

  // 3. Build UseParams
  const params: UseParams = {
    provider: canonical,
    baseUrl: options.baseUrl,
    apiKey: options.key,
    model: options.model,
    models: options.models,
    roleModels: options.roleModels,
    env: options.env,
    effortLevel: options.effort,
  };

  // 4. Detect, select, and apply config (shared core)
  await configureApp(canonical, params, `${canonical} configured`);

  // 5. Optionally save as template
  if (options.saveAs) {
    const template: Template = {
      name: options.saveAs,
      app: canonical,
      baseUrl: options.baseUrl,
      apiKey: options.key,
      model: options.model,
      models: options.models,
      roleModels: options.roleModels,
      env: options.env,
      effortLevel: options.effort,
    };
    const store = await loadTemplates();
    setTemplate(store, template);
    await saveTemplates(store);
    console.log(`📋 Template "${options.saveAs}" saved.`);
  }
}
