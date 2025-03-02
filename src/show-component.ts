import { commands, ExtensionContext } from "vscode";

export function enrollShowComponents(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("opentips.showSetupWalkthrough", () =>
      commands.executeCommand("workbench.action.openWalkthrough", "opentips.opentips#setup", false)
    )
  );
  context.subscriptions.push(
    commands.registerCommand("opentips.showLanguageModelWalkthrough", () =>
      commands.executeCommand("workbench.action.openWalkthrough", "opentips.opentips#languageModel", false)
    )
  );
}
