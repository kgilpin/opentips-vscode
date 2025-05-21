import { EventEmitter } from "events";
import { VirtualenvRpcProcess, isRPCProcessLaunchError, launchRpcProcess } from "../lib/rpc-process";
import { RPCProcessLaunchContextErrorAction, RPCProcessLaunchErrorCode, SpawnedProcess } from "../types/rpc-process";
import { get } from "http";

class MockSpawnedProcess extends EventEmitter implements SpawnedProcess {
  killed = false;
  signal?: number;

  kill(signal?: number): void {
    this.killed = true;
    this.signal = signal;
  }
}

describe("RPC Process Test Suite", () => {
  let mockContext: any;

  beforeEach(() => {
    mockContext = {
      logger: jest.fn(),
      rpcLogger: jest.fn(),
      locateServiceDirectoryVirtualEnvDir: () => "/fake/venv",
      getAnthropicApiKey: async () => "fake-key",
      isCopilotLMProviderAvailable: async () => false,
      spawn: () => new MockSpawnedProcess(),
      onPortChanged: jest.fn(),
      onError: () => RPCProcessLaunchContextErrorAction.Restart,
      getTipDelay: () => undefined,
    };
  });

  it("successful process launch", async () => {
    const result = await launchRpcProcess(mockContext, "/workspace");
    expect(result.succeeded).toBe(true);
  });

  it("missing service directory", async () => {
    const contextWithoutVenv = {
      ...mockContext,
      locateServiceDirectoryVirtualEnvDir: () => undefined,
    };

    const result = await launchRpcProcess(contextWithoutVenv, "/workspace");
    expect(result.succeeded).toBe(false);

    const launchError = isRPCProcessLaunchError(result) ? result : undefined;
    expect(launchError).toBeDefined();
    expect(launchError?.code).toBe(RPCProcessLaunchErrorCode.NoServiceDirectory);
  });

  it("no language model provider", async () => {
    const contextWithoutProviders = {
      ...mockContext,
      getAnthropicApiKey: async () => undefined,
      isCopilotLMProviderAvailable: async () => false,
    };

    const result = await launchRpcProcess(contextWithoutProviders, "/workspace");
    expect(result.succeeded).toBe(false);

    const launchError = isRPCProcessLaunchError(result) ? result : undefined;
    expect(launchError).toBeDefined();
    expect(launchError?.code).toBe(RPCProcessLaunchErrorCode.NoLanguageModelProvider);
  });

  it("process emits ready with correct port", async () => {
    const result = await launchRpcProcess(mockContext, "/workspace");
    expect(result.succeeded).toBe(true);
    const process = result as VirtualenvRpcProcess;
    process.start();

    let port: number | undefined;
    process.on("ready", (p) => (port = p));

    const mockProc = process["process"] as MockSpawnedProcess;
    mockProc.emit("stdout", Buffer.from("OpenTips running on localhost:12345\n"));

    expect(port).toBe(12345);
  });

  it("process handles kill signal", async () => {
    const result = await launchRpcProcess(mockContext, "/workspace");
    expect(result.succeeded).toBe(true);
    const process = result as VirtualenvRpcProcess;

    let killed = false;
    process.on("killed", () => (killed = true));

    process.start();

    process.kill();
    expect(process.killed).toBe(true);

    const mockProc = process["process"] as MockSpawnedProcess;
    mockProc.emit("exit", 0);

    expect(killed).toBe(true);
  });

  it("process handles errors", async () => {
    const result = await launchRpcProcess(mockContext, "/workspace");
    expect(result.succeeded).toBe(true);
    const process = result as VirtualenvRpcProcess;

    let error: Error | undefined;
    process.on("error", (e) => (error = e));
    process.start();

    const mockProc = process["process"] as MockSpawnedProcess;
    const testError = new Error("Test error");
    mockProc.emit("error", testError);

    expect(error).toBe(testError);
  });

  it("process handles exit", async () => {
    const result = await launchRpcProcess(mockContext, "/workspace");
    expect(result.succeeded).toBe(true);
    const process = result as VirtualenvRpcProcess;

    let code: number | undefined;
    process.on("exit", (c) => (code = c));
    process.start();

    const mockProc = process["process"] as MockSpawnedProcess;
    mockProc.emit("exit", 1);

    expect(code).toBe(1);
  });
});
