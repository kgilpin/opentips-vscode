import { existsSync } from "fs";
import { serviceDirectorySetting } from "./settings";
import { join } from "path";

export const VIRTUALENV_DIRS = [".venv", "venv"];

/**
 * Locates the virtual environment directory for the specified workspace. The virtual environment directory
 * may be specified by a global setting, or it may be detected in the workspace folder.
 *
 * @param workspaceFolder The path to the workspace folder.
 * @returns The path to the virtual environment directory, or undefined if not found.
 */
export function locateServiceDirectoryVirtualEnvDir(workspaceFolder: string): string | undefined {
  const serviceDirectory = serviceDirectorySetting();
  if (serviceDirectory) {
    return join(serviceDirectory, "venv");
  }

  const foundDir = VIRTUALENV_DIRS.find((dir) => existsSync(join(workspaceFolder, dir)));
  return foundDir ? join(workspaceFolder, foundDir) : undefined;
}
