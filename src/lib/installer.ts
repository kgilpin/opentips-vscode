import { join } from "node:path";

import { IInstaller, IInstallerFeedback, IInstallResult } from "../types/installer";
import { IFileSystem, IProcessRunner, WithLockFile } from "../types/system";
import getDefaultInstallDir from "./default-install-dir";
import performInstallation from "./perform-installation";
import { logger } from "../extension-point/logger";

export class CoreInstaller implements IInstaller {
  public readonly defaultWorkingDirectory: string;

  constructor(
    private readonly extensionPath: string,
    private readonly fileSystem: IFileSystem,
    private readonly processRunner: IProcessRunner,
    private readonly withLockFile: WithLockFile<IInstallResult>
  ) {
    this.defaultWorkingDirectory = getDefaultInstallDir(fileSystem);
  }

  public async install(workingDirectory: string, feedback: IInstallerFeedback): Promise<IInstallResult> {
    logger(`[installer] Installing OpenTips package to ${workingDirectory}`);

    // Use or create the working directory
    if (!this.fileSystem.existsSync(workingDirectory)) {
      try {
        this.fileSystem.mkdirSync(workingDirectory, { recursive: true });
      } catch (error) {
        const message = `Failed to create directory ${workingDirectory}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        logger(message);
        return {
          succeeded: false,
          error: message,
        };
      }
    }

    let stat: { isDirectory(): boolean };
    try {
      stat = this.fileSystem.statSync(workingDirectory);
    } catch {
      const message = `Failed to stat ${workingDirectory}.`;
      logger(message);
      return {
        succeeded: false,
        error: message,
      };
    }

    if (!stat.isDirectory()) {
      const message = `${workingDirectory} is not a directory.`;
      logger(message);
      return {
        succeeded: false,
        error: message,
      };
    }

    const performInstallationFn = () => {
      return performInstallation(
        this.fileSystem,
        this.processRunner,
        feedback,
        this.extensionPath,
        workingDirectory
      );
    };

    const lockFilePath = join(workingDirectory, "install.lock");
    try {
      return await this.withLockFile(logger, lockFilePath, performInstallationFn);
    } catch (error) {
      return {
        succeeded: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
