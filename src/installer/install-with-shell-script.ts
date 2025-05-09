import { logger } from "../extension-point/logger";
import { IProcessRunner, IProcessResult } from "../types/system";

const SHELL_NAME = "bash";

export default async function installWithShellScript(
  processRunner: IProcessRunner,
  scriptPath: string,
  workingDirectory: string
): Promise<IProcessResult> {
  const commandId = Math.random().toString(36).substring(7);
  logger(`[${commandId}] Executing command: ${scriptPath}`);

  const commands = [SHELL_NAME, "-c", scriptPath];
  const processResult = await processRunner.execute(commands, { cwd: workingDirectory });
  const { succeeded, stdout, stderr } = processResult;
  if (stdout) logger(`[${commandId}] stdout: ${stdout}`);
  if (stderr) logger(`[${commandId}] stderr: ${stderr}`);
  if (succeeded) {
    logger(`[${commandId}] Command succeeded`);
    return { succeeded: true };
  }

  return processResult;
}
