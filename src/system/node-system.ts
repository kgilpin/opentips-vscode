import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { IFileSystem, IProcessResult, IProcessRunner } from "../types/system";

export class NodeFileSystem implements IFileSystem {
  existsSync(path: string): boolean {
    return existsSync(path);
  }

  statSync(path: string): { isDirectory(): boolean } {
    const stats = statSync(path);
    return {
      isDirectory() {
        return stats.isDirectory();
      },
    };
  }

  getHomeDir(): string {
    return homedir();
  }
}

export class NodeProcessRunner implements IProcessRunner {
  get platform(): NodeJS.Platform {
    return process.platform;
  }

  /**
   * Execute a command in a non-shell environment. Default signal handling is used.
   * There is no timeout for the command, so do not use this for commands that may hang.
   */
  async execute(command: string[], options: { cwd: string }): Promise<IProcessResult> {
    const scriptName = command[0];
    const args = command.slice(1);

    const process = spawn(scriptName, args, { cwd: options.cwd });
    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString("utf8");
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString("utf8");
    });

    // Note that resolve is the only handler needed, since the response reports
    // success or failure, and the caller can handle the result accordingly.
    return new Promise<IProcessResult>((resolve) => {
      process.on("close", (exitCode) => {
        resolve({ succeeded: exitCode === 0, stdout, stderr, exitCode: exitCode !== null ? exitCode : undefined });
      });
      process.on("error", (error) => {
        resolve({ succeeded: false, stdout, stderr, error: error.message });
      });
    });
  }
}
