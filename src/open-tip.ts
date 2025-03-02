import * as vscode from "vscode";
import { Tips } from "./tips";

export function enrollOpenTip(context: vscode.ExtensionContext) {
  const openTip = async (tipId: string) => {
    const tip = await Tips.fetchTip(tipId);
    if (!tip) {
      return;
    }

    const { directory, file, line } = tip;
    // TODO: file may be a hallucinated or incorrect path, so in that case, search for the best match.
    const dirUri = vscode.Uri.file(directory);
    const fileUri = vscode.Uri.joinPath(dirUri, file);
    const selection = new vscode.Selection(line - 1, 0, line - 1, 0);
    await vscode.window.showTextDocument(fileUri, { selection });
  };

  context.subscriptions.push(vscode.commands.registerCommand("opentips.openTip", openTip));
}
