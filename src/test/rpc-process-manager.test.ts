import { EventEmitter } from "events";
import { IRPCProcessLaunchContext, RPCProcessLaunchContextErrorAction, SpawnedProcess } from "../types/rpc-process";
import { RpcProcessManager } from "../lib/rpc-process-manager";

class MockSpawnedProcess extends EventEmitter implements SpawnedProcess {
  killed = false;
  signal?: number;

  kill(signal?: number): void {
    this.killed = true;
    this.signal = signal;
  }
}

describe("RPC Process Manager Test Suite", () => {
  let mockContext: IRPCProcessLaunchContext;
  let mockLogger: jest.Mock;
  const mockSpawned = new MockSpawnedProcess();
  let mockOnError: jest.Mock;
  let manager: RpcProcessManager;
  let currentPort: number | undefined;

  beforeEach(() => {
    jest.useFakeTimers();
    mockLogger = jest.fn();
    mockOnError = jest.fn().mockReturnValue(RPCProcessLaunchContextErrorAction.Restart);
    currentPort = undefined;

    mockContext = {
      logger: () => {},
      rpcLogger: () => {},
      locateServiceDirectoryVirtualEnvDir: () => "/fake/venv",
      getAnthropicApiKey: async () => "fake-key",
      isCopilotLMProviderAvailable: async () => false,
      spawn: () => mockSpawned,
      onPortChanged: (_, port) => {
        currentPort = port;
      },
      onError: mockOnError,
    };

    manager = new RpcProcessManager(mockContext, mockLogger);
  });

  afterEach(() => {
    jest.useRealTimers();
    manager.dispose();
  });

  it("successfully starts RPC process", async () => {
    await manager.startRpcProcess("/workspace");
    expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining("Starting RPC process for /workspace"));
  });

  it("handles launch errors with retry", async () => {
    const onError = jest.fn().mockReturnValue(RPCProcessLaunchContextErrorAction.Restart);
    const errorContext = {
      ...mockContext,
      onError,
      locateServiceDirectoryVirtualEnvDir: () => undefined,
    };

    manager = new RpcProcessManager(errorContext, mockLogger);
    await manager.startRpcProcess("/workspace");

    expect(onError).toHaveBeenCalled();

    jest.advanceTimersByTime(30000);
    expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining("Starting RPC process for /workspace"));
  });

  describe("stopRpcProcess", () => {
    it("stops and cleans up an existing process", async () => {
      await manager.startRpcProcess("/workspace");

      // Verify process is running by checking port assignment
      mockSpawned.emit("stdout", Buffer.from("OpenTips running on localhost:12345\n"));
      expect(currentPort).toBe(12345);

      // Stop the process
      manager.stopRpcProcess("/workspace");

      // Verify cleanup
      expect(mockSpawned.killed).toBe(true);
      expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining("Stopping RPC process for /workspace"));
      expect(currentPort).toBeUndefined();
    });

    it("handles stopping non-existent process", () => {
      const response = manager.stopRpcProcess("/nonexistent");
      expect(response).toBeUndefined();
      expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining("No RPC process for /nonexistent"));
      expect(currentPort).toBeUndefined();
    });

    it("removes process from internal map after stopping", async () => {
      await manager.startRpcProcess("/workspace");
      manager.stopRpcProcess("/workspace");
      expect(currentPort).toBeUndefined();

      // Try to stop it again - should log "no process"
      manager.stopRpcProcess("/workspace");
      expect(mockLogger).toHaveBeenLastCalledWith(expect.stringContaining("No RPC process for /workspace"));
    });

    it("calls onPortChanged with undefined when stopping process", async () => {
      await manager.startRpcProcess("/workspace");

      // Simulate process ready
      mockSpawned.emit("stdout", Buffer.from("OpenTips running on localhost:12345\n"));
      expect(currentPort).toBe(12345);

      // Stop the process
      manager.stopRpcProcess("/workspace");
      expect(currentPort).toBeUndefined();
    });
  });

  it("handles unexpected process exit with restart", async () => {
    await manager.startRpcProcess("/workspace");

    // Simulate process starting successfully
    mockSpawned.emit("stdout", Buffer.from("OpenTips running on localhost:12345\n"));
    expect(currentPort).toBe(12345);

    // Simulate unexpected exit
    mockSpawned.emit("exit", 1);

    // Verify error notification and port reset
    expect(currentPort).toBeUndefined();

    // Verify restart attempt
    jest.advanceTimersByTime(30000);
    expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining("Starting RPC process for /workspace"));
  });
});
