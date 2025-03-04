import { join, sep } from "path";
import { EventEmitter } from "events";
import { isWindows } from "./is-windows";
import {
  RPCProcessLaunchError,
  RPCProcessLaunchErrorCode,
  VirtualenvRpcProcessEvents,
  SpawnedProcess,
  IRPCProcessLaunchContext,
} from "../types/rpc-process";
import { IFileSystem } from "../types/system";

export function isRPCProcessLaunchError(
  obj: RPCProcessLaunchError | VirtualenvRpcProcess
): obj is RPCProcessLaunchError {
  return !obj.succeeded;
}

export function isVirtualenvRpcProcess(obj: RPCProcessLaunchError | VirtualenvRpcProcess): obj is VirtualenvRpcProcess {
  return obj.succeeded;
}

export class VirtualenvRpcProcess extends EventEmitter {
  public succeeded = true;
  public killed = false;
  private host: string | undefined;
  private port: number | undefined;

  constructor(
    public workspaceFolder: string,
    private process: SpawnedProcess,
    private readonly logger: (message: string) => void,
    private readonly rpcLogger: (message: string) => void
  ) {
    super();
  }

  on<K extends keyof VirtualenvRpcProcessEvents>(event: K, listener: VirtualenvRpcProcessEvents[K]): this {
    return super.on(event, listener);
  }

  emit<K extends keyof VirtualenvRpcProcessEvents>(
    event: K,
    ...args: Parameters<VirtualenvRpcProcessEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  start() {
    let output = "";
    const inspectOutputForPort = (data: any) => {
      this.rpcLogger(data.toString());

      output += data.toString();

      if (this.port) {
        return;
      }

      const outputPrefix = "OpenTips running on";
      const lines = output.split(sep);
      const startupMessageLineIndex = lines.findIndex((line) => line.includes(outputPrefix));
      if (startupMessageLineIndex !== -1) {
        const startupMessageLine = lines[startupMessageLineIndex];
        const prefixIndex = startupMessageLine.indexOf(outputPrefix);
        const hostAndPortTokens = startupMessageLine
          .slice(prefixIndex + outputPrefix.length)
          .trim()
          .split(":");

        this.logger(`[rpc-process] RPC process started on ${hostAndPortTokens}`);

        this.host = hostAndPortTokens[0];
        const parsedPort = parseInt(hostAndPortTokens[1]);

        if (isNaN(parsedPort)) {
          this.emit("error", new Error(`Invalid port number: ${hostAndPortTokens[1]}`));
          return;
        }

        this.port = parsedPort;
        this.emit("ready", this.port);
      }
    };
    this.process.on("stdout", inspectOutputForPort);
    this.process.on("stderr", inspectOutputForPort);
    this.process.on("exit", (code: number) => {
      this.rpcLogger(`RPC process exited with code ${code}\n`);
      if (!this.killed) {
        this.emit("exit", code);
      } else {
        this.emit("killed");
      }
    });
    this.process.on("error", (error: Error) => {
      const errorMessage = `RPC process error: ${error.message}`;
      this.logger(errorMessage);
      this.rpcLogger(errorMessage);
      this.emit("error", error);
    });
  }

  kill(signal?: number): void {
    this.killed = true;
    this.process?.kill(signal);
  }
}

/**
 * Launch an RPC process running in a Python virtualenv located in a virtualenv, returning an object that
 * can be used to interact with the process.
 *
 * Once the process starts, it listens for the port number in the stdout output and emits the "ready" event
 * with the port number.
 *
 * If an error occurs during the process startup, the "error" event is emitted with the error.
 *
 * The "exit" event is emitted when the process exits, with the exit code.
 */
export async function launchRpcProcess(
  context: IRPCProcessLaunchContext,
  workspaceFolder: string
): Promise<RPCProcessLaunchError | VirtualenvRpcProcess> {
  const venvDir = context.locateServiceDirectoryVirtualEnvDir(workspaceFolder);
  if (!venvDir) {
    return Promise.resolve({
      succeeded: false,
      code: RPCProcessLaunchErrorCode.NoServiceDirectory,
      errorMessage: `No service directory found for ${workspaceFolder}`,
    });
  }

  const anthropicApiKey = await context.getAnthropicApiKey();
  const isCopilotLMProviderAvailable = await context.isCopilotLMProviderAvailable();

  if (!anthropicApiKey && !isCopilotLMProviderAvailable) {
    return Promise.resolve({
      succeeded: false,
      code: RPCProcessLaunchErrorCode.NoLanguageModelProvider,
      errorMessage: "No Anthropic API key set and no Copilot language model provider is available",
    });
  }

  const pythonDir = join(venvDir, isWindows() ? "Scripts" : "bin");
  const pythonPathDir = join(venvDir, "..");
  const pythonProgram = join(pythonDir, isWindows() ? "python.exe" : "python");
  const moduleName = "opentips.cli.main";
  const env: Record<string, string> = {
    ...process.env,
    PYTHONPATH: pythonPathDir,
  };
  if (anthropicApiKey) env.ANTHROPIC_API_KEY = anthropicApiKey;

  context.logger(`[rpc-process] Starting RPC process with the following parameters: `);
  context.logger(`[rpc-process]   python:            ${pythonProgram}`);
  context.logger(`[rpc-process]   PYTHONPATH:        ${pythonPathDir}`);
  context.logger(`[rpc-process]   cwd:               ${workspaceFolder}`);
  context.logger(`[rpc-process]   module:            ${moduleName}`);
  context.logger(`[rpc-process]   ANTHROPIC_API_KEY: ${anthropicApiKey ? "set" : "not set"}`);

  try {
    const osProcess = context.spawn(pythonProgram, ["-m", moduleName, "-p", "0"], {
      shell: isWindows(),
      cwd: workspaceFolder,
      env,
    });
    return new VirtualenvRpcProcess(workspaceFolder, osProcess, context.logger, context.rpcLogger);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    context.logger(`[rpc-process] Error starting RPC process: ${errorMessage}`);
    return {
      succeeded: false,
      code: RPCProcessLaunchErrorCode.SpawnError,
      message: errorMessage,
    };
  }
}
