import { commands, ExtensionContext, workspace, window, Progress, ProgressLocation } from "vscode";
import { Tips } from "./tips";

export function enrollRefreshTips(context: ExtensionContext) {
  const refreshTips = async () => {
    const workspaceFolders = workspace.workspaceFolders ?? [];

    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "Refreshing tips",
        cancellable: false,
      },
      async (progress: Progress<{ message?: string }>) => {
        for (const folder of workspaceFolders) {
          progress.report({ message: `Processing ${folder.name}...` });
          try {
            await Tips.suggest(folder.uri.fsPath);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            window.showWarningMessage(`Failed to process ${folder.name}: ${message}`);
          }
        }
      }
    );
  };

  context.subscriptions.push(commands.registerCommand("opentips.title.refreshTips", refreshTips));
}
