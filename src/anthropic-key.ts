import * as vscode from "vscode";

export type GetAnthropicApiKey = () => Promise<string | undefined>;

export interface AnthropicKey {
  getAnthropicApiKey: GetAnthropicApiKey;
}

export function enrollAnthropicKey(context: vscode.ExtensionContext): AnthropicKey {
  async function getAnthropicApiKey(): Promise<string | undefined> {
    return await context.secrets.get("anthropicKey");
  }

  async function setAnthropicKey() {
    // Prompt the user for the key
    const key = await vscode.window.showInputBox({
      placeHolder: "Enter your Anthropic Key",
      prompt: "This key is used to authenticate with the Anthropic API",
    });
    if (!key) {
      await context.secrets.delete("anthropicKey");
      vscode.window.showInformationMessage("OpenTips: Removed Anthropic key from VSCode secrets store");
      return;
    }

    // Save the key to the VSCode secrets
    await context.secrets.store("anthropicKey", key);

    // Show a message to the user
    vscode.window.showInformationMessage("OpenTips: Saved Anthropic key to VSCode secrets store");
  }

  async function clearAnthropicKey() {
    await context.secrets.delete("anthropicKey");
    vscode.window.showInformationMessage("OpenTips: Removed Anthropic key from VSCode secrets store");
  }

  async function showAnthropicKeyStatus() {
    const hasKey = !!(await context.secrets.get("anthropicKey"));
    if (hasKey) {
      vscode.window.showInformationMessage(`OpenTips: Anthropic API key is set`);
    } else {
      vscode.window.showInformationMessage(`OpenTips: Anthropic API key is NOT set`);
    }
  }

  context.subscriptions.push(vscode.commands.registerCommand("opentips.setAnthropicKey", setAnthropicKey));
  context.subscriptions.push(vscode.commands.registerCommand("opentips.clearAnthropicKey", clearAnthropicKey));
  context.subscriptions.push(
    vscode.commands.registerCommand("opentips.showAnthropicKeyStatus", showAnthropicKeyStatus)
  );

  return {
    getAnthropicApiKey,
  };
}
