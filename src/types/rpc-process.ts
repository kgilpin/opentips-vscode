export enum RPCProcessLaunchErrorCode {
  NoServiceDirectory,
  NoLanguageModelProvider,
  SpawnError,
}

export type RPCProcessLaunchError = {
  succeeded: false;
  code: RPCProcessLaunchErrorCode;
  message?: string;
};

export interface VirtualenvRpcProcessEvents {
  ready: (port: number) => void;
  error: (error: Error) => void;
  exit: (code: number) => void;
  killed: () => void;
}

export enum RPCProcessLaunchContextErrorAction {
  Restart,
  NoRestart,
}

export interface SpawnedProcessEvents {
  stdout: (data: Buffer) => void;
  stderr: (data: Buffer) => void;
  exit: (code: number) => void;
  error: (error: Error) => void;
}

export interface SpawnedProcess {
  kill(signal?: number): void;
  on(event: keyof SpawnedProcessEvents, listener: SpawnedProcessEvents[keyof SpawnedProcessEvents]): this;
}

export type SpawnOptions = {
  cwd?: string;
  env?: Record<string, string>;
  shell?: boolean;
};

export interface IRPCProcessLaunchContext {
  logger(message: string): void;
  rpcLogger(message: string): void;
  locateServiceDirectoryVirtualEnvDir: (workspaceFolder: string) => string | undefined;
  getAnthropicApiKey: () => Promise<string | undefined>;
  isCopilotLMProviderAvailable: () => Promise<boolean>;
  spawn(command: string, args?: readonly string[], options?: SpawnOptions): SpawnedProcess;

  onPortChanged(workspaceFolder: string, port: number | undefined): void;
  onError(rpcProcess: RPCProcessLaunchError): RPCProcessLaunchContextErrorAction;
}
