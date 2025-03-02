import { extensions } from "vscode";
import { IExtensionInfo, IExtensionLoader } from "../types/platform";

export class VSCodeExtensionLoader implements IExtensionLoader {
  getExtension(id: string): IExtensionInfo | undefined {
    const extension = extensions.getExtension(id);
    if (!extension) {
      return undefined;
    }
    return {
      extensionPath: extension.extensionPath,
    };
  }
}
