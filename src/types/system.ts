import { Mode } from "node:fs";
import { ILogger } from "../lib/rpc-process-manager";

export interface IProcessResult {
  succeeded: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
  exitCode?: number;
}

export interface IFileSystem {
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: { recursive: boolean }): void;
  statSync(path: string): { isDirectory(): boolean };
  chmod(scriptPath: string, mode: Mode): Promise<void>;
  getHomeDir(): string;
}

export type WithLockFile<T> = (logger: ILogger, lockFile: string, fn: () => Promise<T>) => Promise<T>;

export interface IProcessRunner {
  get platform(): NodeJS.Platform;

  execute(commands: string[], options: { cwd: string }): Promise<IProcessResult>;
}
