import EventEmitter from "events";
import { IRPCProcessLaunchContext } from "../types/rpc-process";

export type ITimeoutStatusLoadingEvents = {
  timeout: () => void;
};

export type IProviderStatusEvents = {
  changed: () => void;
};

export interface IProviderStatus extends EventEmitter {
  dispose(): unknown;
  portChanged(folder: string, port: number | undefined): void;

  get isStarting(): boolean;
  get isServiceDirectoryAvailable(): boolean;
  get isServiceAvailable(): boolean;
  isLanguageModelProviderAvailable(): Promise<boolean>;
}

export class ProviderStatus extends EventEmitter implements IProviderStatus {
  static STARTUP_TIMEOUT = 10000;
  static POLLING_INTERVAL = 10000;

  private _isStarting = true;
  private _startingTimeout: NodeJS.Timeout | undefined;
  private _pollingInterval: NodeJS.Timeout | undefined;
  private portsByFolder = new Map<string, number | undefined>();

  constructor(private launchContext: IRPCProcessLaunchContext) {
    super();
    this._startingTimeout = setTimeout(() => this.clearStarting(), ProviderStatus.STARTUP_TIMEOUT);
    this._startingTimeout.unref();
  }

  dispose(): void {
    this.removeAllListeners();

    if (this._startingTimeout) {
      clearTimeout(this._startingTimeout);
    }
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
    }
    this._startingTimeout = undefined;
    this._pollingInterval = undefined;
  }

  portChanged(folder: string, port: number | undefined): void {
    const thenAnyFolderHasPort = this.anyFolderHasPort;
    this.portsByFolder.set(folder, port);
    const nowAnyFolderHasPort = this.anyFolderHasPort;

    if (thenAnyFolderHasPort !== nowAnyFolderHasPort) {
      this.emit("changed");
    }
  }

  get isStarting(): boolean {
    return this._isStarting;
  }

  get isServiceDirectoryAvailable(): boolean {
    return this.launchContext.locateServiceDirectoryVirtualEnvDir() !== undefined;
  }

  get isServiceAvailable(): boolean {
    return this.anyFolderHasPort;
  }

  async isLanguageModelProviderAvailable(): Promise<boolean> {
    return (
      (await this.launchContext.isCopilotLMProviderAvailable()) || this.launchContext.getAnthropicApiKey() !== undefined
    );
  }

  private clearStarting(): void {
    this._isStarting = false;

    // Taking a basic approach here of polling every 10 seconds
    this._pollingInterval = setInterval(() => this.emit("mayHaveChanged"), ProviderStatus.POLLING_INTERVAL);
    this._pollingInterval.unref();
    this.emit("changed");
  }

  private get anyFolderHasPort(): boolean {
    return [...this.portsByFolder.values()].some((port) => port !== undefined);
  }
}
