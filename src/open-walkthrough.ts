import { Disposable } from "vscode";
import { commands, ExtensionContext } from "vscode";

export function enrollOpenWalkthrough(context: ExtensionContext) {
  const registerWalkthroughCommand = (command: string, walkthroughId: string): Disposable =>
    commands.registerCommand(command, () =>
      commands.executeCommand("workbench.action.openWalkthrough", `kgilpin.opentips#${walkthroughId}`, false)
    );

  context.subscriptions.push(
    registerWalkthroughCommand("opentips.showUsageWalkthrough", "usage"),
    registerWalkthroughCommand("opentips.showServiceInstallationWalkthrough", "service"),
    registerWalkthroughCommand("opentips.showLanguageModelWalkthrough", "languageModel")
  );
}
