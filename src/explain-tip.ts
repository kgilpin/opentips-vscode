import * as vscode from "vscode";
import { Tip, Tips } from "./tips";

export function enrollExplainTip(context: vscode.ExtensionContext) {
  const explainTip = async (tipOrId: Tip | string) => {
    const tip = await Tips.resolveTip(tipOrId);
    if (!tip) {
      return;
    }

    const explanation = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Explaining tip...",
        cancellable: false,
      },
      async () => await Tips.explainTip(tip)
    );

    const document = await vscode.workspace.openTextDocument({
      language: "markdown",
      content: explanation,
    });
    await vscode.window.showTextDocument(document);
  };

  context.subscriptions.push(vscode.commands.registerCommand("opentips.context.explainTip", explainTip));
}
