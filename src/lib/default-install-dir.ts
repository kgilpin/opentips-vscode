import { join } from "path";
import xdg from "@folder/xdg";

import { IFileSystem } from "../types/system";
import { logger } from "../extension-point/logger";

export default function getDefaultInstallDir(fileSystem: IFileSystem): string {
  const homeSubDir = join(fileSystem.getHomeDir(), ".opentips");
  const platformDataDir = xdg({ subdir: "opentips" }).data;
  let result = platformDataDir;
  if (!result) {
    logger(`[installer] No XDG_DATA_HOME found. Using ${homeSubDir} instead.`);
    result = homeSubDir;
  }
  return result;
}
