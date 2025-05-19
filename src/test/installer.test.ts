import { CoreInstaller } from "../lib/installer";
import { jest } from "@jest/globals";
import type { IFileSystem, IProcessRunner, WithLockFile } from "../types/system";
import type { IInstallResult, IInstallerFeedback } from "../types/installer";

// Mock external dependencies
jest.mock("../extension-point/logger", () => ({
  logger: jest.fn(),
}));

jest.mock("../lib/default-install-dir", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue("/default/path"),
}));

describe("CoreInstaller", () => {
  let mockFileSystem: jest.Mocked<IFileSystem>;
  let mockProcessRunner: jest.Mocked<IProcessRunner>;
  let mockWithLockFile: jest.MockedFunction<WithLockFile<IInstallResult>>;
  let installer: CoreInstaller;
  let mockFeedback: IInstallerFeedback;

  beforeEach(() => {
    mockFileSystem = {
      existsSync: jest.fn(),
      mkdirSync: jest.fn(),
      statSync: jest.fn(),
    } as unknown as jest.Mocked<IFileSystem>;

    mockProcessRunner = {} as jest.Mocked<IProcessRunner>;

    mockWithLockFile = jest.fn().mockImplementation((_, __, fn: any) => fn()) as any;

    mockFeedback = {} as IInstallerFeedback;

    installer = new CoreInstaller("/extension/path", mockFileSystem, mockProcessRunner, mockWithLockFile);
  });

  test("constructor sets defaultWorkingDirectory", () => {
    expect(installer.defaultWorkingDirectory).toBe("/default/path");
  });

  test("install creates directory when it does not exist", async () => {
    mockFileSystem.existsSync.mockReturnValue(false);
    mockFileSystem.statSync.mockReturnValue({ isDirectory: () => true });

    await installer.install("/test/path", mockFeedback);

    expect(mockFileSystem.mkdirSync).toHaveBeenCalledWith("/test/path", { recursive: true });
  });

  test("install handles directory creation error", async () => {
    mockFileSystem.existsSync.mockReturnValue(false);
    mockFileSystem.mkdirSync.mockImplementation(() => {
      throw new Error("mkdir error");
    });

    const result = await installer.install("/test/path", mockFeedback);

    expect(result.succeeded).toBe(false);
    expect(result.error).toContain("Failed to create directory");
  });

  test("install handles stat error", async () => {
    mockFileSystem.existsSync.mockReturnValue(true);
    mockFileSystem.statSync.mockImplementation(() => {
      throw new Error("stat error");
    });

    const result = await installer.install("/test/path", mockFeedback);

    expect(result.succeeded).toBe(false);
    expect(result.error).toBe("Failed to stat /test/path.");
  });

  test("install validates directory path", async () => {
    mockFileSystem.existsSync.mockReturnValue(true);
    mockFileSystem.statSync.mockReturnValue({ isDirectory: () => false });

    const result = await installer.install("/test/path", mockFeedback);

    expect(result.succeeded).toBe(false);
    expect(result.error).toBe("/test/path is not a directory.");
  });

  test("install uses lock file for installation", async () => {
    mockFileSystem.existsSync.mockReturnValue(true);
    mockFileSystem.statSync.mockReturnValue({ isDirectory: () => true });

    await installer.install("/test/path", mockFeedback);

    expect(mockWithLockFile).toHaveBeenCalledWith(
      expect.any(Function),
      "/test/path/install.lock",
      expect.any(Function)
    );
  });

  test("install handles lock file error", async () => {
    mockFileSystem.existsSync.mockReturnValue(true);
    mockFileSystem.statSync.mockReturnValue({ isDirectory: () => true });
    mockWithLockFile.mockRejectedValue(new Error("lock error"));

    const result = await installer.install("/test/path", mockFeedback);

    expect(result.succeeded).toBe(false);
    expect(result.error).toBe("lock error");
  });
});
