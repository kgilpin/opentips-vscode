import { exec as execWithCb } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "util";
import { IFileSystem, IProcessRunner } from "../types/system";

const exec = promisify(execWithCb);

export class NodeFileSystem implements IFileSystem {
  existsSync(path: string): boolean {
    return existsSync(path);
  }

  getHomeDir(): string {
    return homedir();
  }
}

export class NodeProcessRunner implements IProcessRunner {
  async execute(command: string, options: { cwd: string }) {
    return await exec(command, options);
  }
}
