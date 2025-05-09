import { CoreInstaller } from "../lib/installer";

import * as resolveScriptPath from "../lib/resolve-script-path";
import * as installWindows from "../installer/install-windows";
import * as installWithShellScript from "../installer/install-with-shell-script";

import { isWindows } from "../lib/is-windows";
import getDefaultInstallDir from "../lib/default-install-dir";

jest.mock("../lib/resolve-script-path", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../installer/install-windows", () => {
  const actual = jest.requireActual("../installer/install-windows");
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(actual.default),
  };
});

jest.mock("../installer/install-with-shell-script", () => {
  const actual = jest.requireActual("../installer/install-with-shell-script");
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(actual.default),
  };
});

let mockFileSystem: {
  getHomeDir: jest.Mock;
  existsSync: jest.Mock;
  mkdirSync: jest.Mock;
  chmod: jest.Mock;
  statSync: jest.Mock;
};
let mockProcessRunner: {
  execute: jest.Mock;
  platform: NodeJS.Platform;
};
let mockLockFile: jest.Mock;
let mockLogger: jest.Mock;
let mockResolveScriptPath: jest.MockedFunction<typeof resolveScriptPath.default>;
let mockInstallWindows: jest.MockedFunction<typeof installWindows.default>;
let mockInstallWithShellScript: jest.MockedFunction<typeof installWithShellScript.default>;
let installer: CoreInstaller;
let mockFeedback = {
  step: jest.fn(),
};

describe("CoreInstaller", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFileSystem = {
      getHomeDir: jest.fn().mockReturnValue("/home/user"),
      existsSync: jest.fn().mockReturnValue(true),
      mkdirSync: jest.fn().mockReturnValue(undefined),
      chmod: jest.fn().mockResolvedValue(undefined),
      statSync: jest.fn().mockReturnValue({ isDirectory: () => true }),
    };

    mockProcessRunner = {
      platform: "darwin",
      execute: jest.fn(),
    };

    mockLogger = jest.fn();
    mockFeedback.step = jest.fn();
    mockLockFile = jest.fn().mockImplementation((logger, lockFile, operation) => operation());

    mockResolveScriptPath = jest.mocked(resolveScriptPath.default);
    mockResolveScriptPath.mockImplementation(
      (fileSystem, extensionPath, scriptName) => "/extension/path/scripts/" + scriptName
    );

    mockInstallWindows = jest.mocked(installWindows.default);
    mockInstallWithShellScript = jest.mocked(installWithShellScript.default);

    installer = new CoreInstaller("/extension/path", mockFileSystem, mockProcessRunner, mockLockFile);
  });

  function mockInstallScripts() {
    mockInstallWindows.mockResolvedValue({
      succeeded: true,
    });

    mockInstallWithShellScript.mockResolvedValue({
      succeeded: true,
      stdout: "Installation successful",
    });
  }

  describe("initialization", () => {
    it("should create installer with correct default working directory", () => {
      const tipsDir = getDefaultInstallDir(mockFileSystem);
      expect(installer.defaultWorkingDirectory).toBe(tipsDir);
      expect(mockFileSystem.getHomeDir).toHaveBeenCalled();
    });
  });

  describe("input validation", () => {
    beforeEach(() => mockInstallScripts());

    it("should create the working directory", async () => {
      mockFileSystem.existsSync.mockReturnValue(false);
      mockInstallWithShellScript.mockResolvedValue({
        succeeded: true,
      });

      const result = await installer.install("/workspace", mockFeedback);

      expect(result.error).toBeUndefined();
      expect(result.succeeded).toBe(true);
      expect(mockFileSystem.existsSync).toHaveBeenCalledWith("/workspace");
      expect(mockFileSystem.mkdirSync).toHaveBeenCalledWith("/workspace", { recursive: true });
    });

    it("should fail if working directory cannot be created", async () => {
      mockFileSystem.existsSync.mockReturnValue(false);
      mockFileSystem.mkdirSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const result = await installer.install("/workspace", mockFeedback);

      expect(result.succeeded).toBe(false);
      expect(result.error).toContain("Permission denied");
    });
  });

  describe("platform-specific installation", () => {
    describe("macOS", () => {
      it("should successfully install", async () => {
        const result = await installer.install("/workspace", mockFeedback);
        const scriptPath = isWindows()
          ? "\\extension\\path\\scripts\\install_macos.sh"
          : "/extension/path/scripts/install_macos.sh";

        expect(result.succeeded).toBe(true);
        expect(installWithShellScript).toHaveBeenCalledWith(
          mockLogger,
          mockProcessRunner,
          mockFeedback,
          scriptPath,
          "/workspace"
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
        const scriptPath = isWindows()
          ? "\\extension\\path\\scripts\\install_linux.sh"
          : "/extension/path/scripts/install_linux.sh";

        expect(result.error).toBeUndefined();
        expect(result.succeeded).toBe(true);
        expect(mockProcessRunner.execute).toHaveBeenCalledWith(["bash", "-c", scriptPath], { cwd: "/workspace" });
      });
    });

    describe("Windows", () => {
      it("should successfully install", async () => {
        mockProcessRunner.platform = "win32";
        mockInstallWindows.mockResolvedValue({
          succeeded: true,
        });

        const result = await installer.install("/workspace", mockFeedback);
        const scriptPath = isWindows()
          ? "\\extension\\path\\scripts\\install_win.yaml"
          : "/extension/path/scripts/install_win.yaml";

        expect(result.error).toBeUndefined();
        expect(result.succeeded).toBe(true);
        expect(mockInstallWindows).toHaveBeenCalledWith(
          mockProcessRunner,
          mockLogger,
          mockFeedback,
          scriptPath,
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
