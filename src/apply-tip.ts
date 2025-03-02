import * as vscode from "vscode";
import { Tip, Tips } from "./tips";
import { IAppEvents } from "./app-events";
import { join } from "path";

/**
 * Enroll a function handler for the 'opentips.context.applyTip' command.
 */
export function enrollApplyTip(context: vscode.ExtensionContext, appEvents: IAppEvents) {
  const waitForDocumentOpen = async (filePath: string): Promise<vscode.TextDocument> => {
    const existingDoc = vscode.workspace.textDocuments.find((doc) => doc.uri.fsPath === filePath);
    if (existingDoc) {
      return existingDoc;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        disposable.dispose();
        reject(new Error("Timeout waiting for document to open"));
      }, 3000);

      const disposable = vscode.workspace.onDidOpenTextDocument((doc) => {
        if (doc.uri.fsPath === filePath) {
          clearTimeout(timeout);
          disposable.dispose();
          resolve(doc);
        }
      });
    });
  };

  const doApplyWithErrorHandling = async (tipOrId: string | Tip, applyTip: (tip: Tip) => Promise<void>) => {
    try {
      const tip = await Tips.resolveTip(tipOrId);
      if (!tip) {
        return;
      }
      await applyTip(tip);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      vscode.window.showErrorMessage(`Failed to apply tip: ${message}`);
    }
  };

  const applyTipUsingCopilot = async (tipOrId: string | Tip) => {
    const tip = await Tips.resolveTip(tipOrId);
    if (!tip) {
      return;
    }

    await doApplyWithErrorHandling(tip, async (tip: Tip) => {
      // Open file and wait for it to be fully loaded
      await vscode.commands.executeCommand("opentips.openTip", tip.id);
      const tipFullPath = join(tip.directory, tip.file);
      await waitForDocumentOpen(tipFullPath);

      // Now we can safely proceed with opening the chat
      await vscode.commands.executeCommand("workbench.action.chat.open", tip.description);

      // In the case of Copilot, we don't mark the tip as applied, because the user will make the decision
      // about whether to accept the generated code.
    });
  };

  // Alternative implementation
  const applyTipUsingOpenTipsBackend = async (tipOrId: string | Tip) => {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Applying tip...",
        cancellable: false,
      },
      async () => {
        await doApplyWithErrorHandling(tipOrId, async (tip: Tip) => {
          await Tips.applyTip(tip);
          appEvents.tipApplied(tip);
        });
      }
    );
  };

  context.subscriptions.push(vscode.commands.registerCommand("opentips.context.applyTip", applyTipUsingCopilot));
}
