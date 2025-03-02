import { commands, ExtensionContext, workspace } from "vscode";
import { Tips } from "./tips";

export function enrollRefreshTips(context: ExtensionContext) {
  const refreshTips = async () => {
    const workspaceFolders = workspace.workspaceFolders ?? [];
    for (const folder of workspaceFolders) {
      Tips.suggest(folder.uri.fsPath);
    }
  };
  context.subscriptions.push(commands.registerCommand("opentips.title.refreshTips", refreshTips));
}
