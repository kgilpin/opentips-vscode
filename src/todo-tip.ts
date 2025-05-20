import * as vscode from "vscode";
import { Tip, Tips } from "./tips";
import { logger } from "./extension-point/logger";
import { existsSync } from "fs";
import { extname, join } from "path";
import { locateTip } from "./locate-tip";

// Add these type definitions at the top of the file
type CommentStyle = string | [string, string];
type CommentStyleMap = Record<string, CommentStyle>;

// Make COMMENT_STYLES const and properly typed
const COMMENT_STYLES: CommentStyleMap = {
  // Hash-style comments
  py: "#",
  rb: "#",
  erb: "#",
  haml: "#",
  sh: "#",
  nim: "#",
  jl: "#",
  clj: "#",
  cljc: "#",
  cljs: "#",
  coffee: "#",
  scss: "#",
  sass: "#",
  css: "#",

  // Double-dash comments
  hs: "--",
  sql: "--",
  lua: "--",

  // HTML-style comments
  html: ["<!--", "-->"],
  xml: ["<!--", "-->"],
  md: ["<!--", "-->"],

  // Default (C-style) comments
  default: "//",
} as const;

// Add the type guard function
function isValidFileExtension(ext: string): ext is keyof typeof COMMENT_STYLES {
  return ext in COMMENT_STYLES;
}

export function enrollTodoTip(context: vscode.ExtensionContext) {
  const todoTip = async (tipOrId: Tip | string) => {
    const tip = await Tips.resolveTip(tipOrId);
    if (!tip) {
      logger(`[todo-tip] Tip not found: ${tipOrId}`);
      return;
    }

    const folder = vscode.workspace.workspaceFolders?.find((folder) => folder.uri.fsPath === tip.directory);
    if (!folder) {
      logger(`[todo-tip] Could not resolve workspace folder for ${tip.directory}`);
      return;
    }

    const filePath = tip.file;
    const fileLocation = join(folder.uri.fsPath, filePath);
    if (!existsSync(fileLocation)) {
      logger(`[todo-tip] File not found: ${fileLocation}`);
      return;
    }

    // Insert a language-specific TODO comment
    const document = await vscode.workspace.openTextDocument(fileLocation);
    const editor = await vscode.window.showTextDocument(document);

    // Determine comment style based on file extension
    const fileExt = extname(filePath).toLowerCase().slice(1);
    const commentStyle = isValidFileExtension(fileExt) ? COMMENT_STYLES[fileExt] : COMMENT_STYLES.default;

    const commentTokens: string[] = [];
    // Open the comment
    if (Array.isArray(commentStyle)) commentTokens.push(commentStyle[0]);
    else commentTokens.push(commentStyle);

    // Add the TODO message
    commentTokens.push("TODO:");
    commentTokens.push(`(${tip.type}) ${tip.description}`);

    // Close the comment
    if (Array.isArray(commentStyle)) commentTokens.push(commentStyle[1]);

    // Collect the final comment
    const todoComment = commentTokens.join(" ");

    const tipLocation = locateTip(tip, document);
    if (!tipLocation) {
      logger(`[todo-tip] Could not locate tip in ${document.uri.fsPath}`);
      return;
    }

    const leadingWhitespace = document.lineAt(tipLocation.start.line).text.match(/^\s*/)?.[0] || "";
    const previousLine = Math.max(0, tipLocation.start.line - 1);
    const contentsOfPreviousLine = document.lineAt(previousLine).text;
    const lastCharPositionOnPreviousLine = contentsOfPreviousLine.length;

    const position = new vscode.Position(previousLine, lastCharPositionOnPreviousLine);
    // TODO: (error-handling) Rather than just awaiting the editor.edit result, add try/catch to handle potential failures and prevent inconsistent state before calling Tips.deleteTip().
    await editor.edit((editBuilder) => {
      editBuilder.insert(position, ["\n", leadingWhitespace, todoComment].join(""));
    });

    await Tips.deleteTip(tip.id);
  };

  context.subscriptions.push(vscode.commands.registerCommand("opentips.context.todoTip", todoTip));
}
