import * as vscode from "vscode";

const output = vscode.window.createOutputChannel("OpenTips");

const rpcLog = vscode.window.createOutputChannel("OpenTips RPC");

export function logger(message: string) {
  output.appendLine(message);
}

export function rpcLogger(message: string) {
  rpcLog.append(message);
}
