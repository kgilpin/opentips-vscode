export interface IProcessResult {
  stdout: string;
  stderr: string;
}

export interface IFileSystem {
  existsSync(path: string): boolean;
  getHomeDir(): string;
}

export interface IProcessRunner {
  execute(command: string, options: { cwd: string }): Promise<IProcessResult>;
}
