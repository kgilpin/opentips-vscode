import * as vscode from "vscode";
import { Tip } from "./tips";
import { OpenTipsJSONRPCClient } from "./rpc-client";

export interface IAppEvents {
  // Events
  tipsReceived(tips: Tip[]): void;
  tipDismissed(tipId: string): void;
  tipApplied(tip: Tip): void;
  activeEditorChanged(editor: vscode.TextEditor | undefined): void;
  fileChanged(uri: vscode.Uri): void;
  portChanged(folder: string, port: number | undefined): void;

  // Methods
  newRpcClient(folder: string): OpenTipsJSONRPCClient | undefined;
}
