import { CoreInstaller } from "../lib/installer";
import { IExtensionLoader, INotifier } from "../types/platform";
import { IFileSystem, IProcessRunner } from "../types/system";
import { logger } from "../extension-point/logger";

jest.mock("../logger", () => ({
  logger: jest.fn(),
}));

describe("CoreInstaller Test Suite", () => {
  let mockExtensionLoader: jest.Mocked<IExtensionLoader>;
  let mockNotifier: jest.Mocked<INotifier>;
  let mockFileSystem: jest.Mocked<IFileSystem>;
  let mockProcessRunner: jest.Mocked<IProcessRunner>;
  let installer: CoreInstaller;

  // Helper function to create command execution error
  function createCommandError(message: string, code: number, stderr: string): Error {
    const error = new Error(message);
    (error as any).code = code;
    (error as any).stderr = stderr;
    return error;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtensionLoader = {
      getExtension: jest.fn(),
    };

    mockNotifier = {
      showError: jest.fn(),
      showSuccess: jest.fn(),
    };

    mockFileSystem = {
      existsSync: jest.fn(),
      getHomeDir: jest.fn().mockReturnValue("/home/user"),
    };

    mockProcessRunner = {
      execute: jest.fn(),
    };

    installer = new CoreInstaller(mockExtensionLoader, mockNotifier, mockFileSystem, mockProcessRunner);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("successful installation on macOS", async () => {
    // Mock platform
    Object.defineProperty(process, "platform", { value: "darwin" });

    // Mock extension exists
    mockExtensionLoader.getExtension.mockReturnValue({ extensionPath: "/ext/path" });
    mockFileSystem.existsSync.mockReturnValue(true);
    mockProcessRunner.execute.mockResolvedValue({ stdout: "success", stderr: "" });

    await installer.install();

    expect(mockProcessRunner.execute).toHaveBeenCalledWith('bash "/ext/path/scripts/install_macos.sh"', {
      cwd: "/home/user/.opentips",
    });
    expect(mockNotifier.showSuccess).toHaveBeenCalledWith("OpenTips package installed successfully");
  });

  it("handles missing extension", async () => {
    mockExtensionLoader.getExtension.mockReturnValue(undefined);

    await expect(installer.install()).rejects.toThrow("Could not find OpenTips extension");
  });

  it("handles unsupported platform", async () => {
    Object.defineProperty(process, "platform", { value: "unknown" });
    mockExtensionLoader.getExtension.mockReturnValue({ extensionPath: "/ext/path" });

    await installer.install();

    expect(mockNotifier.showError).toHaveBeenCalledWith("Unsupported platform: unknown");
  });

  it("handles missing installation script", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    mockExtensionLoader.getExtension.mockReturnValue({ extensionPath: "/ext/path" });
    mockFileSystem.existsSync.mockReturnValue(false);

    await installer.install();

    expect(mockNotifier.showError).toHaveBeenCalledWith(expect.stringContaining("Installation script not found"));
  });

  it("handles installation failure", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    mockExtensionLoader.getExtension.mockReturnValue({ extensionPath: "/ext/path" });
    mockFileSystem.existsSync.mockReturnValue(true);

    const error = createCommandError("Command failed", 1, "Installation failed");
    mockProcessRunner.execute.mockRejectedValue(error);

    await installer.install();

    expect(mockNotifier.showError).toHaveBeenCalledWith(expect.stringContaining("Failed to install opentips package"));
  });

  it("successful installation on Windows", async () => {
    Object.defineProperty(process, "platform", { value: "win32" });
    mockExtensionLoader.getExtension.mockReturnValue({ extensionPath: "/ext/path" });
    mockFileSystem.existsSync.mockReturnValue(true);
    mockProcessRunner.execute.mockResolvedValue({ stdout: "success", stderr: "" });

    await installer.install();

    expect(mockProcessRunner.execute).toHaveBeenCalledWith('cmd.exe /c "/ext/path/scripts/install_win.bat"', {
      cwd: "/home/user/.opentips",
    });
    expect(mockNotifier.showSuccess).toHaveBeenCalled();
  });

  it("logs command execution details", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    mockExtensionLoader.getExtension.mockReturnValue({ extensionPath: "/ext/path" });
    mockFileSystem.existsSync.mockReturnValue(true);
    mockProcessRunner.execute.mockResolvedValue({ stdout: "success", stderr: "" });

    await installer.install();

    expect(logger).toHaveBeenCalledWith(expect.stringContaining("Executing command:"));
    expect(logger).toHaveBeenCalledWith(expect.stringContaining("stdout: success"));
  });

  it("logs installation errors", async () => {
    Object.defineProperty(process, "platform", { value: "darwin" });
    mockExtensionLoader.getExtension.mockReturnValue({ extensionPath: "/ext/path" });
    mockFileSystem.existsSync.mockReturnValue(true);

    const error = createCommandError("Command failed", 1, "Installation failed");
    mockProcessRunner.execute.mockRejectedValue(error);

    await installer.install();

    expect(logger).toHaveBeenCalledWith(expect.stringContaining("Command failed"));
  });
});
