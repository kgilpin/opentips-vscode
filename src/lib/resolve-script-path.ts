import { join } from "path";
import { IFileSystem } from "../types/system";
import { logger } from "../extension-point/logger";

export default function resolveScriptPath(
  fileSystem: IFileSystem,
  extensionPath: string,
  scriptName: string
): string | undefined {
  const scriptPath = join(extensionPath, "scripts", scriptName);
  if (!fileSystem.existsSync(scriptPath)) {
    logger(`[installer] Installation script not found at ${scriptPath}`);
    return undefined;
  }

  return scriptPath;
}
