import * as vscode from "vscode";

import { logger } from "./extension-point/logger";
import getDefaultInstallDir from "./lib/default-install-dir";
import { IFileSystem } from "./types/system";

export const PORT_SETTING_NAME = "opentips.rpcPort";
export const LLM_SETTING_NAME = "opentips.copilotModelProvider";
export const SERVICE_DIRECTORY_SETTING_NAME = "opentips.serviceDirectory";
export const INSTALL_GLOBALLY_SETTING_NAME = "opentips.installGlobally";

export const TIP_DELAY_SETTING_NAME = "opentips.tipDelay";
export const TIP_DELAY_DEFAULT = 30; // 30 seconds
export const TIP_DELAY_MAX = 5 * 60; // 5 minutes

export function shouldInstallGlobally(): boolean {
  const setting = vscode.workspace.getConfiguration().get(INSTALL_GLOBALLY_SETTING_NAME);
  return setting === true || setting === "true";
}

export function rpcPortSetting(): number | undefined {
  return vscode.workspace.getConfiguration().get(PORT_SETTING_NAME);
}

export function globalServiceDirectory(fileSystem: IFileSystem): string {
  return getDefaultInstallDir(fileSystem);
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

/**
 * Get the tip delay setting in seconds. If not set, returns the default value of 30 seconds. The maximum value is 5 minutes (300 seconds).
 *
 * @returns The tip delay in seconds
 */
export function getTipDelaySetting(): number {
  const setting = vscode.workspace.getConfiguration().get(TIP_DELAY_SETTING_NAME);
  let parsedSetting = typeof setting === "number" && setting >= 0 ? setting : TIP_DELAY_DEFAULT;
  if (parsedSetting < 0) {
    logger(`[settings] Tip delay setting (${parsedSetting}) is negative. Using default (${TIP_DELAY_DEFAULT}).`);
    parsedSetting = TIP_DELAY_DEFAULT;
  }
  if (parsedSetting > TIP_DELAY_MAX) {
    logger(`[settings] Tip delay setting (${parsedSetting}) exceeds maximum (${TIP_DELAY_MAX}). Using maximum.`);
    parsedSetting = TIP_DELAY_MAX;
  }
  return parsedSetting;
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
