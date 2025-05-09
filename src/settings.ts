import * as vscode from "vscode";

import { join } from "path";

import { logger } from "./extension-point/logger";

export const PORT_SETTING_NAME = "opentips.rpcPort";
export const LLM_SETTING_NAME = "opentips.copilotModelProvider";
export const SERVICE_DIRECTORY_SETTING_NAME = "opentips.serviceDirectory";
export const INSTALL_GLOBALLY_SETTING_NAME = "opentips.installGlobally";

export function shouldInstallGlobally(): boolean {
  const setting = vscode.workspace.getConfiguration().get(INSTALL_GLOBALLY_SETTING_NAME);
  return setting === true || setting === "true";
}

export function rpcPortSetting(): number | undefined {
  return vscode.workspace.getConfiguration().get(PORT_SETTING_NAME);
}

export function globalServiceDirectory(homeDir: string): string {
  return join(homeDir, ".opentips");
}

export function serviceDirectorySetting(): string | undefined {
  return vscode.workspace.getConfiguration().get(SERVICE_DIRECTORY_SETTING_NAME);
}

export function getCopilotModelProviderId(): string | undefined {
  return vscode.workspace.getConfiguration().get(LLM_SETTING_NAME);
}

export function setCopilotModelProviderId(id: string) {
  vscode.workspace.getConfiguration().update(LLM_SETTING_NAME, id, vscode.ConfigurationTarget.Global);
}

export function clearCopilotModelProviderId() {
  vscode.workspace.getConfiguration().update(LLM_SETTING_NAME, undefined, vscode.ConfigurationTarget.Global);
}

export function watchAnthropicApiKeySetting(handleFn: () => void) {
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration("opentips.anthropic.apiKey")) {
      logger("[settings] Anthropic API key changed");
      handleFn();
    }
  });
}

export function watchRpcPortSetting(handleFn: (port: number | undefined) => void) {
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(PORT_SETTING_NAME)) {
      const rpcPortUnk = vscode.workspace.getConfiguration().get(PORT_SETTING_NAME);
      const rpcPort = typeof rpcPortUnk === "number" && Number(rpcPortUnk) !== 0 ? rpcPortUnk : undefined;
      logger(`[settings] RPC port changed to ${rpcPort}`);
      handleFn(rpcPort);
    }
  });
}
