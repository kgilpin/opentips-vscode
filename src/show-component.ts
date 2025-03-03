import { commands, ExtensionContext } from "vscode";

export function enrollShowComponents(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("opentips.showUsageWalkthrough", () =>
      commands.executeCommand("workbench.action.openWalkthrough", "opentips.opentips#usage", false)
    )
  );
  context.subscriptions.push(
    commands.registerCommand("opentips.showServiceInstallationWalkthrough", () =>
      commands.executeCommand("workbench.action.openWalkthrough", "opentips.opentips#service", false)
    )
  );
  context.subscriptions.push(
    commands.registerCommand("opentips.showLanguageModelWalkthrough", () =>
      commands.executeCommand("workbench.action.openWalkthrough", "opentips.opentips#languageModel", false)
    )
  );
}
