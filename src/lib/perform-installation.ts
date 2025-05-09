import { logger } from "../extension-point/logger";
import installWindows from "../installer/install-windows";
import installWithShellScript from "../installer/install-with-shell-script";
import { IInstallerFeedback, IInstallResult } from "../types/installer";
import { Logger } from "../types/platform";
import { IFileSystem, IProcessResult, IProcessRunner } from "../types/system";
import resolveScriptPath from "./resolve-script-path";

const INSTALL_MACOS_SCRIPT = "install_macos.sh";
const INSTALL_WIN_COMMANDS = "install_win.yaml";
const INSTALL_LINUX_SCRIPT = "install_linux.sh";

export default async function performInstallation(
  fileSystem: IFileSystem,
  processRunner: IProcessRunner,
  feedback: IInstallerFeedback,
  extensionPath: string,
  workingDirectory: string
): Promise<IInstallResult> {
  let executionResult: IProcessResult;
  const { platform } = processRunner;
  if (platform === "win32") {
    const scriptPath = resolveScriptPath(fileSystem, extensionPath, INSTALL_WIN_COMMANDS);
    if (!scriptPath) {
      return {
        succeeded: false,
        error: `Script not found for platform: ${platform}`,
      };
    }
    executionResult = await installWindows(processRunner, feedback, scriptPath, workingDirectory);
  } else if (platform === "darwin" || platform === "linux") {
    const scriptPath = resolveScriptPath(
      fileSystem,
      extensionPath,
      platform === "darwin" ? INSTALL_MACOS_SCRIPT : INSTALL_LINUX_SCRIPT
    );
    if (!scriptPath) {
      return {
        succeeded: false,
        error: `Script not found for platform: ${processRunner.platform}`,
      };
    }

    logger(`[installer] Ensuring script is executable: ${scriptPath}`);
    await fileSystem.chmod(scriptPath, "755");

    logger(`[installer] Executing script: ${scriptPath}`);
    executionResult = await installWithShellScript(processRunner, scriptPath, workingDirectory);
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
}
