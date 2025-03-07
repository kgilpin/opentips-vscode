import { ExtensionContext, window } from "vscode";
import { StatusPanelViewProvider } from "./webviews/status-panel";

export interface IStatusPanel {
  portChanged(folder: string, port: number | undefined): void;
}

export function enrollStatusPanel(context: ExtensionContext): IStatusPanel {
  const provider = new StatusPanelViewProvider();

  context.subscriptions.push(window.registerWebviewViewProvider(StatusPanelViewProvider.viewType, provider));

  return {
    portChanged: provider.portChanged.bind(provider),
  };
}
