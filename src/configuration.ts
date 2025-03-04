import { existsSync } from "fs";
import { serviceDirectorySetting } from "./settings";
import { join } from "path";
import { homedir } from "os";
import { IFileSystem } from "./types/system";

export const VIRTUALENV_DIRS = [".venv", "venv"];

/**
 * Locates the virtual environment directory for the specified workspace. The virtual environment directory
 * may be specified by a global setting, or it may be detected in the workspace folder.
 *
 * @param workspaceFolder The path to the workspace folder.
 * @returns The path to the virtual environment directory, or undefined if not found.
 */
export function locateServiceDirectoryVirtualEnvDir(fileSystem: IFileSystem, workspaceFolder: string): string | undefined {
  const serviceDirectory = serviceDirectorySetting();
  if (serviceDirectory) {
    return join(serviceDirectory, "venv");
  }

  const venvPath = (dir: string, venvDir: string) => join(dir, ".opentips", venvDir);

  let foundDir = VIRTUALENV_DIRS.find((dir) => existsSync(venvPath(workspaceFolder, dir)));
  if ( foundDir ) {
    return venvPath(workspaceFolder, foundDir);
  }

  foundDir = VIRTUALENV_DIRS.find((dir) => existsSync(venvPath(fileSystem.getHomeDir(), dir)));
  if ( foundDir ) {
    return venvPath(fileSystem.getHomeDir(), foundDir);
  }

  return undefined;
}
