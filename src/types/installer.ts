export type CommandResult = {
  succeeded: boolean;
  errorMessage?: string;
};

export type ExecError = {
  code: number;
  killed: boolean;
  signal: string | null;
  cmd: string;
  stdout: string;
  stderr: string;
};

export type PlatformConfig = {
  scriptName: string;
  commandRunner: string;
};

export interface IInstaller {
  install(): Promise<void>;
}

export function isExecError(error: any): error is ExecError {
  return error && typeof error.code === "number" && error.cmd;
}
