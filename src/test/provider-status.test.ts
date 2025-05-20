import { ProviderStatus } from '../lib/status-panel';
import { IRPCProcessLaunchContext } from '../types/rpc-process';

// Mock IRPCProcessLaunchContext
const mockLaunchContext: IRPCProcessLaunchContext = {
  getAnthropicApiKey: jest.fn(),
  locateServiceDirectoryVirtualEnvDir: jest.fn(),
  isCopilotLMProviderAvailable: jest.fn(),
  onError: jest.fn(),
  onPortChanged: jest.fn(),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  rpcLogger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  spawn: jest.fn(),
};

describe('ProviderStatus', () => {
  let providerStatus: ProviderStatus;

  beforeEach(() => {
    providerStatus = new ProviderStatus(mockLaunchContext);
  });

  afterEach(() => {
    providerStatus.dispose();
  });

  test('setPythonVersion should update the pythonVersion property', () => {
    providerStatus.setPythonVersion("Python 3.9.0");
    expect(providerStatus.pythonVersion).toBe("Python 3.9.0");

    providerStatus.setPythonVersion(null);
    expect(providerStatus.pythonVersion).toBeNull();
  });

  test('setPythonVersion should emit pythonVersionDetected event', () => {
    const listener = jest.fn();
    providerStatus.on('pythonVersionDetected', listener);

    providerStatus.setPythonVersion("Python 11.0.1");
    expect(listener).toHaveBeenCalledWith("Python 11.0.1");

    listener.mockClear(); // Clear mock for the next call

    providerStatus.setPythonVersion(null);
    expect(listener).toHaveBeenCalledWith(null);
  });
});
