import { IRPCProcessLaunchContext, RPCProcessLaunchContextErrorAction } from "../types/rpc-process";
import { IFileSystem } from "../types/system";
import { isRPCProcessLaunchError, launchRpcProcess, VirtualenvRpcProcess } from "./rpc-process";

// Logger interface to decouple from specific logging implementation
export type ILogger = (message: string) => void;

export class RpcProcessManager {
  private rpcProcessesByFolder = new Map<string, VirtualenvRpcProcess>();
  private readonly INITIAL_RETRY_DELAY = 15 * 1000;
  private readonly RETRY_MULTIPLIER = 1.5;
  private readonly MAX_RETRY_DELAY = 5 * 60 * 1000;
  private retryDelay = this.INITIAL_RETRY_DELAY;

  constructor(private readonly processLaunchContext: IRPCProcessLaunchContext, private readonly logger: ILogger) {}

  private calculateRetryDelayBackoff(currentDelay: number): number {
    const newDelay = Math.round(currentDelay * this.RETRY_MULTIPLIER);
    return Math.min(newDelay, this.MAX_RETRY_DELAY);
  }

  private scheduleRestart(folder: string): (error: Error) => void {
    return (error: Error) => {
      this.logger(`[rpc-process] Error starting RPC process for ${folder}: ${error.message}`);

      this.rpcProcessesByFolder.delete(folder);
      this.logger(`[rpc-process] Scheduling restart in ${this.retryDelay}ms`);
      setTimeout(() => this.startRpcProcess(folder), this.retryDelay);
      this.retryDelay = this.calculateRetryDelayBackoff(this.retryDelay);
    };
  }

  public async startRpcProcess(folder: string) {
    this.logger(`[rpc-process] Starting RPC process for ${folder}`);
    const rpcProcess = await launchRpcProcess(this.processLaunchContext, folder);

    if (isRPCProcessLaunchError(rpcProcess)) {
      if (this.processLaunchContext.onError(rpcProcess) === RPCProcessLaunchContextErrorAction.NoRestart) {
        this.logger(`[rpc-process] Not restarting RPC process for ${folder}`);
        return;
      }

      this.scheduleRestart(folder)(new Error(rpcProcess.message));
      return;
    }

    rpcProcess.on("ready", (port) => this.processLaunchContext.onPortChanged(folder, port));

    rpcProcess.on("error", this.scheduleRestart(folder));
    rpcProcess.on("error", () => this.processLaunchContext.onPortChanged(folder, undefined));

    rpcProcess.on("exit", (code) => {
      this.logger(`[rpc-process] RPC process exited with code ${code}, not due to requested shutdown`);
      this.scheduleRestart(folder)(new Error(`RPC process exited with code ${code}`));
    });
    rpcProcess.on("exit", () => this.processLaunchContext.onPortChanged(folder, undefined));

    rpcProcess.on("killed", () => {
      this.logger(`[rpc-process] RPC process for ${folder} was killed`);
    });
    rpcProcess.on("killed", () => this.processLaunchContext.onPortChanged(folder, undefined));

    rpcProcess.start();
    this.rpcProcessesByFolder.set(folder, rpcProcess);
  }

  public stopRpcProcess(folder: string): void {
    const rpcProcess = this.rpcProcessesByFolder.get(folder);
    if (rpcProcess) {
      this.logger(`[rpc-process] Stopping RPC process for ${folder}`);
      rpcProcess.kill();
      this.processLaunchContext.onPortChanged(folder, undefined);
      this.rpcProcessesByFolder.delete(folder);
    } else {
      this.logger(`[rpc-process] No RPC process for ${folder}`);
    }
  }

  public dispose(): void {
    // Kill all processes
    for (const [folderId, process] of this.rpcProcessesByFolder.entries()) {
      this.logger(`[rpc-process] Killing RPC process for ${folderId} in dispose`);
      process.kill();
      this.rpcProcessesByFolder.delete(folderId);
    }
  }
}
