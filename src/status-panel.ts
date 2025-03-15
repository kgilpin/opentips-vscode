import { ExtensionContext, window } from "vscode";
import { StatusPanelViewProvider } from "./webviews/status-panel";
import { IProviderStatus } from "./lib/status-panel";

export function enrollStatusPanel(context: ExtensionContext, providerStatus: IProviderStatus) {
  const provider = new StatusPanelViewProvider(providerStatus);

  context.subscriptions.push(window.registerWebviewViewProvider(StatusPanelViewProvider.viewType, provider));
  context.subscriptions.push(provider);
}
