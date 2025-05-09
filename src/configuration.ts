import { existsSync } from "fs";
import { globalServiceDirectory, serviceDirectorySetting } from "./settings";
import { join } from "path";
import { IFileSystem } from "./types/system";

export const VIRTUALENV_DIRS = [".venv", "venv"];

/**
 * Locates the virtual environment directory for the specified workspace. The virtual environment directory
 * may be specified by a global setting, or it may be detected in the workspace folder.
 *
 * @param fileSystem The file system.
 * @param workspaceFolder The path to the workspace folder.
 * @returns The path to the virtual environment directory, or undefined if not found.
 */
export function locateServiceDirectoryVirtualEnvDir(fileSystem: IFileSystem): string | undefined {
  const venvPath = (dir: string, venvDir: string) => join(dir, venvDir);

  let serviceDirectory = serviceDirectorySetting();
  // If the service directory setting is specified, look for the virtual environment directory in that directory.
  // If it's not found, return undefined and don't fall back to the systemwide virtual environment.
  if (serviceDirectory) {
    return VIRTUALENV_DIRS.map((dir) => venvPath(serviceDirectory!, dir)).find((dir) => existsSync(dir));
  }

  serviceDirectory = globalServiceDirectory(fileSystem);
  return VIRTUALENV_DIRS.map((dir) => venvPath(serviceDirectory, dir)).find((dir) => existsSync(dir));
}
