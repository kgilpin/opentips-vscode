export interface IExtensionInfo {
  extensionPath: string;
}

export interface INotifier {
  showError(message: string): void;
  showSuccess(message: string): void;
}

export interface IExtensionLoader {
  getExtension(id: string): IExtensionInfo | undefined;
}
