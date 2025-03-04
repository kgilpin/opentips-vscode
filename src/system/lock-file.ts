import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { pid } from "node:process";
import { Logger } from "../types/platform";

/**
 * Performs an operation with a lock file to prevent concurrent installations.
 */
export async function withLockFile<T>(logger: Logger, lockFilePath: string, operation: () => Promise<T>): Promise<T> {
  try {
    writeFileSync(lockFilePath, `pid: ${pid}`, { flag: "wx" });
  } catch (error) {
    // Check specifically for EEXIST errors (file already exists)
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      logger(`Lock file ${lockFilePath} cannot be created because it already exists`);
      throw new Error(
        `Installation is already in progress in another process. Wait for installation to finish, or remove the lock file: ${lockFilePath}`
      );
    }

    // Handle other errors (permissions, etc.)
    const message = error instanceof Error ? error.message : "Unknown error";
    logger(`Failed to create lock file ${lockFilePath}: ${message}`);
    throw new Error(`Failed to create lock file ${lockFilePath}: ${message}`);
  }

  try {
    return await operation();
  } finally {
    try {
      unlinkSync(lockFilePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger(`Failed to remove lock file ${lockFilePath}: ${message}`);
    }
  }
}
