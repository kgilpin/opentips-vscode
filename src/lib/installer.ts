import { join, resolve } from "node:path";
import { CommandResult, isExecError, IInstaller, PlatformConfig } from "../types/installer";
import { IExtensionLoader, INotifier } from "../types/platform";
import { IFileSystem, IProcessRunner } from "../types/system";
import { logger } from "../extension-point/logger";

export class CoreInstaller implements IInstaller {
  private static readonly INSTALL_MACOS_SCRIPT = "install_macos.sh";
  private static readonly INSTALL_WIN_SCRIPT = "install_win.bat";
  private static readonly INSTALL_LINUX_SCRIPT = "install_linux.sh";

  constructor(
    private readonly extensionLoader: IExtensionLoader,
    private readonly notifier: INotifier,
    private readonly fileSystem: IFileSystem,
    private readonly processRunner: IProcessRunner
  ) {}

  private readonly platformConfig: Record<string, PlatformConfig> = {
    win32: {
      scriptName: CoreInstaller.INSTALL_WIN_SCRIPT,
      commandRunner: "cmd.exe /c",
    },
    darwin: {
      scriptName: CoreInstaller.INSTALL_MACOS_SCRIPT,
      commandRunner: "bash",
    },
    linux: {
      scriptName: CoreInstaller.INSTALL_LINUX_SCRIPT,
      commandRunner: "bash",
    },
  };

  private async executeAndLog(command: string): Promise<CommandResult> {
    if (
      ![CoreInstaller.INSTALL_MACOS_SCRIPT, CoreInstaller.INSTALL_WIN_SCRIPT, CoreInstaller.INSTALL_LINUX_SCRIPT].some(
        (script) => command.includes(script)
      )
    ) {
      throw new Error(`Invalid command: ${command}`);
    }

    const workingDirectory = join(this.fileSystem.getHomeDir(), ".opentips");
    const commandId = Math.random().toString(36).substring(7);
    logger(`[${commandId}] Executing command: ${command}`);

    try {
      const { stdout, stderr } = await this.processRunner.execute(command, { cwd: workingDirectory });
      if (stdout) logger(`[${commandId}] stdout: ${stdout}`);
      if (stderr) logger(`[${commandId}] stderr: ${stderr}`);
      return { succeeded: true };
    } catch (error) {
      if (isExecError(error)) {
        const message = `Command '${command}' failed with code ${error.code}: ${error.stderr}`;
        logger(`[${commandId}] ${message}`);
        return { succeeded: false, errorMessage: message };
      }
      const message = error instanceof Error ? error.message : "Unknown error";
      logger(`[${commandId}] ${message}`);
      return { succeeded: false, errorMessage: message };
    }
  }

  public async install(): Promise<void> {
    const extension = this.extensionLoader.getExtension("opentips.opentips");
    if (!extension) {
      throw new Error("Could not find OpenTips extension");
    }

    const config = this.platformConfig[process.platform];
    if (!config) {
      this.notifier.showError(`Unsupported platform: ${process.platform}`);
      return;
    }

    const scriptPath = resolve(extension.extensionPath, "scripts", config.scriptName);
    if (!this.fileSystem.existsSync(scriptPath)) {
      const errorMsg = `Installation script not found at ${scriptPath}`;
      logger(errorMsg);
      this.notifier.showError(`Failed to install opentips package: ${errorMsg}`);
      return;
    }

    const executionResult = await this.executeAndLog(`${config.commandRunner} "${scriptPath}"`);
    if (executionResult.succeeded) {
      this.notifier.showSuccess("OpenTips package installed successfully");
    } else {
      this.notifier.showError(`Failed to install opentips package: ${executionResult.errorMessage}`);
    }
  }
}
