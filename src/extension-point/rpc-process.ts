import * as vscode from "vscode";

import { logger } from "./logger";
import { RpcProcessManager } from "../lib/rpc-process-manager";
import { IRPCProcessLaunchContext } from "../types/rpc-process";
import { serviceDirectorySetting, shouldInstallGlobally } from "../settings";

export async function enrollRpcProcess(
  vscodeContext: vscode.ExtensionContext,
  processLaunchContext: IRPCProcessLaunchContext
) {
  const rpcProcessManager = new RpcProcessManager(processLaunchContext, logger);
  vscodeContext.subscriptions.push(rpcProcessManager);

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    logger(`[enroll-rpc-process] Starting RPC process for ${folder.uri.fsPath}`);
    await rpcProcessManager.startRpcProcess(folder.uri.fsPath);
  }

  vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
    for (const folder of event.removed) {
      logger(`[enroll-rpc-process] Stopping RPC process for ${folder.uri.fsPath} due to workspace removal`);
      rpcProcessManager.stopRpcProcess(folder.uri.fsPath);
    }
    for (const folder of event.added) {
      logger(`[enroll-rpc-process] Starting RPC process for ${folder.uri.fsPath} due to workspace addition`);
      await rpcProcessManager.startRpcProcess(folder.uri.fsPath);
    }
  });

  if (
    serviceDirectorySetting() === undefined &&
    !processLaunchContext.locateServiceDirectoryVirtualEnvDir() &&
    shouldInstallGlobally()
  ) {
    logger("[enroll-rpc-process] No service installation detected, running installer (asynchronously).");
    vscode.commands.executeCommand("opentips.installPackage").then(() => {
      logger("[enroll-rpc-process] Service installation complete");
    });
    // Note: No "catch" is available with PromiseLike
  }
}
