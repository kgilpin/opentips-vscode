import * as vscode from "vscode";
import { Tip, Tips } from "./tips";

export function enrollDeleteTip(context: vscode.ExtensionContext) {
  const deleteTip = async (tipOrId: Tip | string) => {
    await Tips.deleteTip(tipOrId);
  };

  context.subscriptions.push(vscode.commands.registerCommand("opentips.context.deleteTip", deleteTip));
}
