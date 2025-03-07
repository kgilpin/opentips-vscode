import { commands, ExtensionContext } from "vscode";

export function enrollOpenSettings(context: ExtensionContext) {
  const openSettings = async () => {
    await commands.executeCommand("workbench.action.openSettings", "OpenTips");
  };
  context.subscriptions.push(commands.registerCommand("opentips.title.openSettings", openSettings));
}
