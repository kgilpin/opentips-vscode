import * as yaml from "js-yaml";
import * as fs from "fs";

import { Logger } from "../types/platform";
import { IProcessResult, IProcessRunner } from "../types/system";
import { IInstallerFeedback, IInstallResult } from "../types/installer";

interface InstallConfigStep {
  readonly name: string;
  readonly command: string;
}

interface InstallConfig {
  readonly name: string;
  readonly commands: InstallConfigStep[];
}

const POWERSHELL_COMMAND = "powershell.exe";
const POWERSHELL_COMMAND_FLAG = "-Command";

async function runPowerShellCommand(
  processRunner: IProcessRunner,
  workingDirectory: string,
  command: string
): Promise<IProcessResult> {
  const commands = [POWERSHELL_COMMAND, POWERSHELL_COMMAND_FLAG, command];
  // Exceptions are caught by the caller
  return await processRunner.execute(commands, { cwd: workingDirectory });
}

export async function installWindows(
  processRunner: IProcessRunner,
  logger: Logger,
  feedback: IInstallerFeedback,
  scriptPath: string,
  workingDirectory: string
): Promise<IInstallResult> {
  try {
    const config = yaml.load(fs.readFileSync(scriptPath, "utf8")) as InstallConfig;

    logger(`[install-windows] Installing opentips on Windows using script: ${config.name}`);

    // Execute each command in sequence
    for (const command of config.commands) {
      const { name, command: commandString } = command;
      feedback.step(name);
      const commandResult = await runPowerShellCommand(processRunner, workingDirectory, commandString);
      if (!commandResult.succeeded) {
        logger(`[install-windows] Command failed: ${commandString}`);
        logger(`[install-windows] ${commandResult.stdout}`);
        logger(`[install-windows] ${commandResult.stderr}`);
        return {
          succeeded: false,
          error: `Failed to run step: ${name}`,
        };
      } else {
        logger(`[install-windows] Command succeeded: ${commandString}`);
        logger(`[install-windows] ${commandResult.stdout}`);
        logger(`[install-windows] ${commandResult.stderr}`);
      }
    }
    return { succeeded: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger(`[install-windows] Error: ${message}`);
    return { succeeded: false, error: message };
  }
}
