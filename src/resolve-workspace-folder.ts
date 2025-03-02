import * as vscode from "vscode";

export default function resolveWorkspaceFolder(directory: string): vscode.WorkspaceFolder | undefined {
  return vscode.workspace.workspaceFolders?.find((folder) => directory.startsWith(folder.uri.fsPath));
}
