import * as vscode from "vscode";
import { enrollAnthropicKey } from "./anthropic-key";
import { enrollFileWatcher } from "./file-watcher";
import { OpenTipsEvents, OpenTipsJSONRPCClient } from "./rpc-client";
import { CompleteRequest, Tip, TipDeleted, TipList, Tips } from "./tips";
import { enrollOutput, logger, rpcLogger } from "./extension-point/logger";
import { enrollTipList, ITipsModel } from "./tip-tree";
import { enrollOpenTip } from "./open-tip";
import { enrollExplainTip } from "./explain-tip";
import { enrollApplyTip } from "./apply-tip";
import { enrollDeleteTip } from "./delete-tip";
import { enrollApplyDecorations, ReapplyDecorations, ApplyDecorations } from "./apply-decorations";
import {
  IRPCProcessLaunchContext,
  RPCProcessLaunchContextErrorAction,
  RPCProcessLaunchError,
  RPCProcessLaunchErrorCode,
  SpawnedProcess,
  SpawnedProcessEvents,
  SpawnOptions,
} from "./types/rpc-process";
import { enrollRpcProcess } from "./extension-point/rpc-process";
import { rpcPortSetting, watchRpcPortSetting } from "./settings";
import { IAppEvents } from "./app-events";
import { enrollRefreshTips } from "./refresh-tips";
import { enrollShowComponents } from "./show-component";
import complete, { isCopilotLMProviderAvailable } from "./message-completion";
import { enrollInstallPackage } from "./install-package";
import { locateServiceDirectoryVirtualEnvDir } from "./configuration";
import { spawn } from "child_process";
import { NodeFileSystem } from "./system/node-system";
import { enrollOpenSettings } from "./open-settings";
import { enrollStatusPanel, IStatusPanel } from "./status-panel";

const TIPS_LIMIT = 5;

type RetrieveInitialTips = (folder: string) => void;

class AppEvents implements IAppEvents {
  public openTipsEvents = new OpenTipsEvents();

  public tipsModel: ITipsModel | undefined;
  public reapplyDecorations: ReapplyDecorations | undefined;
  public applyDecorations: ApplyDecorations | undefined;
  public retrieveInitialTips: RetrieveInitialTips | undefined;
  public statusPanel: IStatusPanel | undefined;

  private portByFolder = new Map<string, number | undefined>();

  constructor() {
    this.openTipsEvents.on("tips", (tipList: TipList) => {
      if (tipList.error) {
        logger(`[app-events] Error retrieving tips: ${tipList.error}`);
      }
      this.tipsReceived(tipList.tips);
    });
    this.openTipsEvents.on("tip_deleted", async (tipDeleted: TipDeleted) => {
      this.tipDismissed(tipDeleted.tip_id);
    });
    this.openTipsEvents.on("complete", (request: CompleteRequest) => {
      logger(`[app-events] request: ${request.request_id}`);
      complete(
        () => this.newRpcClient(request.directory),
        request.request_id,
        request.prompt,
        request.user_message,
        request.temperature,
        request.response_format
      );
    });
  }

  tipsReceived(tips: Tip[]): void {
    logger(`[app-events] ${tips.length} tips received:`);
    for (const tip of tips) {
      logger(`[app-events]   ${tip.file}:${tip.line} - ${tip.type} - ${tip.complexity} - ${tip.description}`);
      logger(`[app-events]     ${tip.context}`);
    }

    this.tipsModel?.addTips(tips);
    this.reapplyDecorations?.();
  }

  tipDismissed(tipId: string): void {
    logger(`[app-events] Tip dismissed: ${tipId}`);

    // NOTE: The tip can't be loaded any more because it's been deleted. All we have is the ID.

    this.tipsModel?.removeTip(tipId);
    this.reapplyDecorations?.();
  }

  tipApplied(tip: Tip): void {
    logger(`[app-events] Tip applied: ${tip.id}`);

    this.tipsModel?.removeTip(tip.id);
    this.reapplyDecorations?.();
  }

  activeEditorChanged(editor: vscode.TextEditor | undefined): void {
    logger(`[app-events] Active editor changed: ${editor?.document.uri.fsPath}`);
    if (!editor) {
      return;
    }

    this.applyDecorations?.(editor);
  }

  fileChanged(uri: vscode.Uri): void {
    logger(`[app-events] File changed: ${uri.fsPath}`);
  }

  portChanged(folder: string, port: number | undefined): void {
    logger(`[app-events] Port changed: ${folder} - ${port}`);
    this.openTipsEvents.portChanged(folder, port);
    this.statusPanel?.portChanged(folder, port);
    this.portByFolder.set(folder, port);
    this.retrieveInitialTips?.(folder);
  }

  newRpcClient(folder: string): OpenTipsJSONRPCClient | undefined {
    const port = this.portByFolder.get(folder);
    if (port === undefined) {
      logger(`[app-events] No port set for folder ${folder}`);
      return;
    }

    return new OpenTipsJSONRPCClient(port);
  }
}

class ChildProcess implements SpawnedProcess {
  constructor(private readonly process: ReturnType<typeof spawn>) {}

  on(event: keyof SpawnedProcessEvents, listener: SpawnedProcessEvents[keyof SpawnedProcessEvents]): this {
    if (event === "stdout") {
      this.process.stdout?.on("data", listener as (data: Buffer) => void);
    }
    if (event === "stderr") {
      this.process.stderr?.on("data", listener as (data: Buffer) => void);
    }
    if (event === "exit") {
      this.process.on("exit", listener as (code: number) => void);
    }
    if (event === "error") {
      this.process.on("error", listener as (error: Error) => void);
    }
    return this;
  }

  kill(signal?: number): void {
    this.process.kill(signal);
  }
}

export const APP = new AppEvents();

export async function activate(context: vscode.ExtensionContext) {
  const tipsModel = enrollTipList(context);
  APP.tipsModel = tipsModel;

  enrollOutput(context);
  enrollShowComponents(context);
  enrollOpenTip(context);
  enrollApplyTip(context, APP);
  enrollDeleteTip(context);
  enrollExplainTip(context);
  enrollRefreshTips(context);
  enrollOpenSettings(context);
  APP.statusPanel = enrollStatusPanel(context);
  const anthropic = enrollAnthropicKey(context);
  enrollFileWatcher(context);
  enrollInstallPackage(context);

  const onRPCLaunchProcessError = (error: RPCProcessLaunchError): RPCProcessLaunchContextErrorAction => {
    logger(`[app-events] Error launching RPC process: (${error.code}) ${error.message}`);

    // Currently, none of these are being shown to the user as a notification.
    // It might make sense to notify once, after some amount of retries.

    switch (error.code) {
      case RPCProcessLaunchErrorCode.NoLanguageModelProvider:
        logger(`No language model provider is available. Requesting restart.`);
        return RPCProcessLaunchContextErrorAction.Restart;
      case RPCProcessLaunchErrorCode.NoServiceDirectory:
        logger(`No service directory is available. Requesting restart.`);
        return RPCProcessLaunchContextErrorAction.Restart;
      case RPCProcessLaunchErrorCode.SpawnError:
        logger(`RPC process exited with an error. Requesting restart.`);
        return RPCProcessLaunchContextErrorAction.Restart;
      default:
        // This is an error we don't know how to handle
        logger(`[app-events] Unknown error code: ${error.code}. Requesting restart.`);
        return RPCProcessLaunchContextErrorAction.Restart;
    }
  };

  const spawnChildProcess = (command: string, args: string[], options?: SpawnOptions): SpawnedProcess => {
    const envDebug = { ...(options?.env || {}) };
    // Redact API and KEY variables
    for (const key in envDebug) {
      if (key.toLowerCase().includes("api") || key.toLowerCase().includes("key")) {
        envDebug[key] = "****";
      }
    }

    const optionsDebugString = JSON.stringify({ ...options, env: envDebug });
    logger(`[spawn] (${optionsDebugString}) ${command} ${args.join(" ")}`);
    const process = spawn(command, args, options);
    return new ChildProcess(process);
  };

  const fileSystem = new NodeFileSystem();
  const locateServiceDirectoryVirtualEnvDirWithFileSystemProvided = (workspaceFolder: string): string | undefined =>
    locateServiceDirectoryVirtualEnvDir(fileSystem, workspaceFolder);

  const processLaunchContext: IRPCProcessLaunchContext = {
    getAnthropicApiKey: anthropic.getAnthropicApiKey.bind(anthropic),
    locateServiceDirectoryVirtualEnvDir: locateServiceDirectoryVirtualEnvDirWithFileSystemProvided,
    isCopilotLMProviderAvailable,
    onError: onRPCLaunchProcessError,
    onPortChanged: APP.portChanged.bind(APP),
    logger,
    rpcLogger,
    spawn: spawnChildProcess,
  };

  await enrollRpcProcess(context, processLaunchContext);

  // TODO: Related to the LLM provider
  // 1) Watch anthropic key to change
  // 2) Watch for Copilot to be available
  // 3) Support other LLM keys?

  const tipDecorations = enrollApplyDecorations(context, tipsModel.listTipsForFile.bind(tipsModel));
  APP.reapplyDecorations = tipDecorations.reapplyDecorations;
  APP.applyDecorations = tipDecorations.applyDecorations;

  const tipsRetrievedByFolder = new Map<string, boolean>();

  // Retrieve the first batch of tips and apply decorations.
  const retrieveInitialTips = async (folder: string) => {
    if (tipsRetrievedByFolder.get(folder)) {
      logger(`[app-events] Tips already retrieved for ${folder}`);
      return;
    }

    logger(`[app-events] Retrieving initial tips for ${folder}`);
    const tips = await Tips.listTips(folder, TIPS_LIMIT);
    if (!tips || tips.length === 0) {
      return;
    }

    tipsRetrievedByFolder.set(folder, true);
    APP.tipsReceived(tips);
  };

  APP.retrieveInitialTips = retrieveInitialTips;

  watchRpcPortSetting((port) => {
    rpcLogger(`[app-events] Port setting changed: ${port}`);
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      APP.portChanged(folder.uri.fsPath, port);
    }
  });

  const portSetting = rpcPortSetting();
  if (portSetting) {
    rpcLogger(`[app-events] Applying port setting: ${portSetting}`);
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      APP.portChanged(folder.uri.fsPath, portSetting);
    }
  }

  // TODO: Check python.interpreterPath and see if Python is available. If not, open the walkthrough.
  // Add command opentips.open.walkthrough
}

// This method is called when your extension is deactivated
export function deactivate() {}
