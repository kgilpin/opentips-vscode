import * as vscode from "vscode";
import { Tip } from "./tips";
import { locateTip } from "./locate-tip";

const TIP_BACKGROUND_COLOR = "rgba(255, 100, 100, 0.5)";
const TIP_LABEL_COLOR = "rgba(200, 200, 200, 0.5)";

// The LLM is not that good at identifying the specific line of a change, so we search for the context within a pretty wide radius.
export const TIP_CONTEXT_SEARCH_RADIUS = 30;

export type TipsProvider = (uri: vscode.Uri) => Tip[];

export type ApplyDecorations = (editor: vscode.TextEditor | undefined) => void;

export type ReapplyDecorations = () => void;

export type TipDecorations = {
  applyDecorations: ApplyDecorations;
  reapplyDecorations: ReapplyDecorations;
};

export function enrollApplyDecorations(context: vscode.ExtensionContext, tipsProvider: TipsProvider): TipDecorations {
  const decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: TIP_BACKGROUND_COLOR,
    isWholeLine: true,
  });

  const applyDecorations = async (editor: vscode.TextEditor | undefined) => {
    if (!editor) {
      return;
    }

    const uri = editor.document.uri;
    const tips = await tipsProvider(uri);
    const decorations = tips
      .map((tip): vscode.DecorationOptions | undefined => {
        const range = locateTip(tip, editor.document);
        if (!range) {
          return;
        }

        function createCommandUrl(command: string, tipId: string): string {
          const tipIdArgument = encodeURIComponent(JSON.stringify([tipId]));
          return `command:${command}?${tipIdArgument}`;
        }

        /**
         * Creates a command button within the Markdown hover message.
         */
        // Note: I have tried rendering this as a button, but button tags are not allowed by VSCode even with supportHtml: true.
        // I also tried rendering this as a link with VSCode styles (as suggested by Copilot), but the styles seemed to have no effect.
        function createCommandButton(label: string, command: string, tipId: string): string {
          const commandUrl = createCommandUrl(command, tipId);
          return `[${label}](${commandUrl})`;
        }

        // TODO: Can these commands be rendered as buttons instead of links in Markdown?
        const applyButton = createCommandButton("Apply", "opentips.context.applyTip", tip.id);
        const explainButton = createCommandButton("Explain", "opentips.context.explainTip", tip.id);
        const dismissButton = createCommandButton("Dismiss", "opentips.context.deleteTip", tip.id);
        const description = ` ${tip.description}\n\n${applyButton} | ${explainButton} | ${dismissButton}`;
        const hoverMessage = new vscode.MarkdownString(description);
        hoverMessage.isTrusted = true;

        return {
          range,
          hoverMessage,
          renderOptions: {
            after: {
              contentText: tip.label,
              color: TIP_LABEL_COLOR,
              margin: "0 0 0 1rem",
            },
          },
        };
      })
      .filter(Boolean) as vscode.DecorationOptions[];
    editor.setDecorations(decorationType, decorations);
  };

  const reapplyDecorations = () => {
    if (vscode.window.activeTextEditor) {
      applyDecorations(vscode.window.activeTextEditor);
    }
  };

  const disposable = vscode.window.onDidChangeActiveTextEditor(applyDecorations);
  context.subscriptions.push(disposable);

  return { applyDecorations, reapplyDecorations };
}
