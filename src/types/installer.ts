export interface IInstallResult {
  succeeded: boolean;
  error?: string;
}

export interface IInstallerFeedback {
  step(name: string): void;
}

export interface IInstaller {
  install(workingDirectory: string, feedback: IInstallerFeedback): Promise<IInstallResult>;
}
