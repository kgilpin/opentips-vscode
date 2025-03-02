import * as vscode from "vscode";

import { logger } from "./logger";

export const PORT_SETTING_NAME = "opentips.rpcPort";
export const LLM_SETTING_NAME = "opentips.copilotModelProvider";
export const SERVICE_DIRECTORY_SETTING_NAME = "opentips.serviceDirectory";

export function rpcPortSetting(): number | undefined {
  return vscode.workspace.getConfiguration().get(PORT_SETTING_NAME);
}

export function serviceDirectorySetting(): string | undefined {
  return vscode.workspace.getConfiguration().get(SERVICE_DIRECTORY_SETTING_NAME);
}

export function getCopilotModelProviderId(): string | undefined {
  return vscode.workspace.getConfiguration().get(LLM_SETTING_NAME);
}

export function setCopilotModelProviderId(id: string) {
  vscode.workspace.getConfiguration().update(LLM_SETTING_NAME, id);
}

export function clearCopilotModelProviderId() {
  vscode.workspace.getConfiguration().update(LLM_SETTING_NAME, undefined);
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
