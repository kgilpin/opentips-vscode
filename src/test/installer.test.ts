import { CoreInstaller } from "../lib/installer";

// Mock the installWindows function
jest.mock("../installer/install-windows", () => ({
  installWindows: jest.fn(),
}));

import { installWindows } from "../installer/install-windows";

let mockFileSystem: {
  getHomeDir: jest.Mock;
  existsSync: jest.Mock;
  statSync: jest.Mock;
};
let mockProcessRunner: {
  execute: jest.Mock;
  platform: NodeJS.Platform;
};
let mockLockFile: jest.Mock;
let mockLogger: jest.Mock;
let mockInstallWindows: jest.MockedFunction<typeof installWindows>;
let installer: CoreInstaller;
let mockFeedback = {
  step: jest.fn(),
};

describe("CoreInstaller", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize mockInstallWindows here with other mocks
    mockInstallWindows = installWindows as jest.MockedFunction<typeof installWindows>;
    mockInstallWindows.mockResolvedValue({ succeeded: true });

    mockFileSystem = {
      getHomeDir: jest.fn().mockReturnValue("/home/user"),
      existsSync: jest.fn().mockReturnValue(true),
      statSync: jest.fn().mockReturnValue({ isDirectory: () => true }),
    };

    mockProcessRunner = {
      platform: "darwin",
      execute: jest.fn(),
    };

    mockLogger = jest.fn();
    mockFeedback.step = jest.fn();
    mockLockFile = jest.fn().mockImplementation((logger, lockFile, operation) => operation());

    installer = new CoreInstaller("/extension/path", mockFileSystem, mockProcessRunner, mockLockFile, mockLogger);
  });

  describe("initialization", () => {
    it("should create installer with correct default working directory", () => {
      expect(installer.defaultWorkingDirectory).toBe("/home/user/.opentips");
      expect(mockFileSystem.getHomeDir).toHaveBeenCalled();
    });
  });

  describe("input validation", () => {
    it("should fail if working directory does not exist", async () => {
      mockFileSystem.existsSync.mockReturnValue(false);

      const result = await installer.install("/workspace", mockFeedback);

      expect(result.succeeded).toBe(false);
      expect(result.error).toContain("does not exist");
      expect(mockFileSystem.existsSync).toHaveBeenCalledWith("/workspace");
    });

    it("should fail if working directory is not a directory", async () => {
      mockFileSystem.statSync.mockReturnValue({ isDirectory: () => false });

      const result = await installer.install("/workspace", mockFeedback);

      expect(result.succeeded).toBe(false);
      expect(result.error).toContain("is not a directory");
      expect(mockFileSystem.statSync).toHaveBeenCalledWith("/workspace");
    });
  });

  describe("platform-specific installation", () => {
    describe("macOS", () => {
      it("should successfully install", async () => {
        mockProcessRunner.platform = "darwin";
        mockProcessRunner.execute.mockResolvedValue({
          succeeded: true,
          stdout: "Installation successful",
        });

        const result = await installer.install("/workspace", mockFeedback);

        expect(result.succeeded).toBe(true);
        expect(mockProcessRunner.execute).toHaveBeenCalledWith(
          ["bash", "-c", "/extension/path/scripts/install_macos.sh"],
          { cwd: "/workspace" }
        );
      });
    });

    describe("Linux", () => {
      it("should successfully install", async () => {
        mockProcessRunner.platform = "linux";
        mockProcessRunner.execute.mockResolvedValue({
          succeeded: true,
          stdout: "Installation successful",
        });

        const result = await installer.install("/workspace", mockFeedback);

        expect(result.succeeded).toBe(true);
        expect(mockProcessRunner.execute).toHaveBeenCalledWith(
          ["bash", "-c", "/extension/path/scripts/install_linux.sh"],
          { cwd: "/workspace" }
        );
      });
    });

    describe("Windows", () => {
      it("should successfully install", async () => {
        mockProcessRunner.platform = "win32";
        mockInstallWindows.mockResolvedValue({
          succeeded: true,
        });

        const result = await installer.install("/workspace", mockFeedback);

        expect(result.succeeded).toBe(true);
        expect(mockInstallWindows).toHaveBeenCalledWith(
          mockProcessRunner,
          mockLogger,
          mockFeedback,
          "/extension/path/scripts/install_win.yaml",
          "/workspace"
        );
      });
    });
  });

  describe("error handling", () => {
    describe("platform support", () => {
      it("should fail on unsupported platform", async () => {
        mockProcessRunner.platform = "freebsd";

        const result = await installer.install("/workspace", mockFeedback);

        expect(result.succeeded).toBe(false);
        expect(result.error).toContain("Unsupported platform: freebsd");
        expect(mockProcessRunner.execute).not.toHaveBeenCalled();
      });
    });

    describe("script execution failures", () => {
      it("should handle Unix script failure", async () => {
        mockProcessRunner.platform = "linux";
        mockProcessRunner.execute.mockResolvedValue({
          succeeded: false,
          stderr: "Permission denied",
          error: "Command failed",
        });

        const result = await installer.install("/workspace", mockFeedback);

        expect(result.succeeded).toBe(false);
        expect(result.error).toBe("Command failed");
        expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining("stderr: Permission denied"));
      });

      it("should handle Windows script failure", async () => {
        mockProcessRunner.platform = "win32";
        mockInstallWindows.mockResolvedValue({
          succeeded: false,
          error: "PowerShell execution failed",
        });

        const result = await installer.install("/workspace", mockFeedback);

        expect(result.succeeded).toBe(false);
        expect(result.error).toBe("PowerShell execution failed");
      });
    });

    describe("missing files", () => {
      it("should report missing script file", async () => {
        mockProcessRunner.platform = "darwin";
        mockFileSystem.existsSync.mockImplementation((path: string) => {
          return !path.includes("install_macos.sh");
        });

        const result = await installer.install("/workspace", mockFeedback);

        expect(result.succeeded).toBe(false);
        expect(result.error).toContain("Script not found for platform");
        expect(mockLogger).toHaveBeenCalledWith(expect.stringContaining("Installation script not found"));
        expect(mockProcessRunner.execute).not.toHaveBeenCalled();
      });
    });
  });
});
