import * as vscode from "vscode";
import { TIP_CONTEXT_SEARCH_RADIUS } from "./apply-decorations";
import { logger } from "./extension-point/logger";
import { Tip } from "./tips";

// TODO: Needs to be invoked as the Editor changes, as well as when the Tips change. When Tips are no longer applicable
// to the Editor, they should be removed from the Tips model itself.
export function locateTip(tip: Tip, document: vscode.TextDocument): vscode.Range | undefined {
  const startLine = Math.max(0, tip.line - TIP_CONTEXT_SEARCH_RADIUS);
  const endLine = Math.min(document.lineCount - 1, tip.line + TIP_CONTEXT_SEARCH_RADIUS);

  const { context } = tip;
  const contextLines = context.split("\n");
  // TODO: Consider other lines as well.
  const contextFirstLine = contextLines[0];

  let textLineIndex = -1;
  for (let i = startLine; i <= endLine; i++) {
    if (document.lineAt(i).text.includes(contextFirstLine)) {
      textLineIndex = i;
      break;
    }
  }

  if (textLineIndex === -1) {
    logger(`[locate-tip] Could not find context line in ${document.uri.fsPath}: ${contextFirstLine}`);
    return;
  }

  tip.line = textLineIndex;
  const start = new vscode.Position(textLineIndex, 0);
  const end = new vscode.Position(textLineIndex, document.lineAt(textLineIndex).text.length);

  return new vscode.Range(start, end);
}
