import { join } from "node:path";

import { IInstaller, IInstallerFeedback, IInstallResult } from "../types/installer";
import { Logger } from "../types/platform";
import { IFileSystem, IProcessResult, IProcessRunner, WithLockFile } from "../types/system";
import { installWindows } from "../installer/install-windows";

const INSTALL_MACOS_SCRIPT = "install_macos.sh";
const INSTALL_WIN_COMMANDS = "install_win.yaml";
const INSTALL_LINUX_SCRIPT = "install_linux.sh";

const SHELL_NAME = "bash";

const SCRIPT_NAME_FOR_PLATFORM: Record<NodeJS.Platform, string | null> = {
  darwin: INSTALL_MACOS_SCRIPT,
  win32: INSTALL_WIN_COMMANDS,
  linux: INSTALL_LINUX_SCRIPT,
  aix: null,
  android: null,
  freebsd: null,
  openbsd: null,
  sunos: null,
  haiku: null,
  cygwin: null,
  netbsd: null,
};

export class CoreInstaller implements IInstaller {
  public readonly defaultWorkingDirectory: string;

  constructor(
    private readonly extensionPath: string,
    private readonly fileSystem: IFileSystem,
    private readonly processRunner: IProcessRunner,
    private readonly withLockFile: WithLockFile<IInstallResult>,
    private readonly logger: Logger
  ) {
    this.defaultWorkingDirectory = join(fileSystem.getHomeDir(), ".opentips");
  }

  public async install(workingDirectory: string, feedback: IInstallerFeedback): Promise<IInstallResult> {
    this.logger(`[installer] Installing OpenTips package to ${workingDirectory}`);

    if (!this.fileSystem.existsSync(workingDirectory)) {
      const message = `${workingDirectory} does not exist.`;
      this.logger(message);
      return {
        succeeded: false,
        error: message,
      };
    }

    let stat: { isDirectory(): boolean };
    try {
      stat = this.fileSystem.statSync(workingDirectory);
    } catch {
      const message = `Failed to stat ${workingDirectory}.`;
      this.logger(message);
      return {
        succeeded: false,
        error: message,
      };
    }

    if (!stat.isDirectory()) {
      const message = `${workingDirectory} is not a directory.`;
      this.logger(message);
      return {
        succeeded: false,
        error: message,
      };
    }

    const performInstallation = async (): Promise<IInstallResult> => {
      let executionResult: IProcessResult;
      const { platform } = this.processRunner;
      if (platform === "win32") {
        const scriptPath = this.resolveScriptPath(INSTALL_WIN_COMMANDS);
        if (!scriptPath) {
          return {
            succeeded: false,
            error: `Script not found for platform: ${platform}`,
          };
        }
        executionResult = await installWindows(this.processRunner, this.logger, feedback, scriptPath, workingDirectory);
      } else if (platform === "darwin" || platform === "linux") {
        const scriptPath = this.resolveScriptPath(platform === "darwin" ? INSTALL_MACOS_SCRIPT : INSTALL_LINUX_SCRIPT);
        if (!scriptPath) {
          return {
            succeeded: false,
            error: `Script not found for platform: ${this.processRunner.platform}`,
          };
        }
        executionResult = await this.executeInstallScriptForPlatform(workingDirectory);
      } else {
        return {
          succeeded: false,
          error: `Unsupported platform: ${platform}`,
        };
      }

      if (executionResult.succeeded) {
        return { succeeded: true };
      }

      return {
        succeeded: executionResult.succeeded,
        error: executionResult.error,
      };
    };

    const lockFilePath = join(workingDirectory, "install.lock");
    try {
      return await this.withLockFile(this.logger, lockFilePath, performInstallation);
    } catch (error) {
      return {
        succeeded: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async executeInstallScriptForPlatform(workingDirectory: string): Promise<IProcessResult> {
    const { platform } = this.processRunner;
    const scriptName = SCRIPT_NAME_FOR_PLATFORM[platform];
    if (!scriptName) {
      return {
        succeeded: false,
        error: `Unsupported platform: ${platform}`,
      };
    }

    const scriptPath = this.resolveScriptPath(scriptName);
    if (!scriptPath) {
      return {
        succeeded: false,
        error: `Installation script not found for platform: ${platform}`,
      };
    }

    const commandId = Math.random().toString(36).substring(7);
    this.logger(`[${commandId}] Executing command: ${scriptPath}`);

    const commands = [SHELL_NAME, "-c", scriptPath];
    const processResult = await this.processRunner.execute(commands, { cwd: workingDirectory });
    const { succeeded, stdout, stderr } = processResult;
    if (stdout) this.logger(`[${commandId}] stdout: ${stdout}`);
    if (stderr) this.logger(`[${commandId}] stderr: ${stderr}`);
    if (succeeded) {
      this.logger(`[${commandId}] Command succeeded`);
      return { succeeded: true };
    }

    return processResult;
  }

  private resolveScriptPath(scriptName: string): string | undefined {
    const scriptPath = join(this.extensionPath, "scripts", scriptName);
    if (!this.fileSystem.existsSync(scriptPath)) {
      this.logger(`Installation script not found at ${scriptPath}`);
      return undefined;
    }

    return scriptPath;
  }
}
