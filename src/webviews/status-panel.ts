import * as vscode from "vscode";
import { logger } from "../extension-point/logger";
import MarkdownIt from "markdown-it";
import { IProviderStatus } from "../lib/status-panel";

export class StatusPanelViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly viewType = "opentips.status";

  private webviewView: vscode.WebviewView | undefined;
  private markdownRenderer = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
  });

  constructor(private providerStatus: IProviderStatus) {
    this.providerStatus.on("changed", this.updateContent.bind(this));
    this.providerStatus.on("mayHaveChanged", this.updateContent.bind(this));
  }

  dispose() {
    this.providerStatus.dispose();
    this.webviewView = undefined;
  }

  async updateContent() {
    const contentSections = ["## OpenTips Status", ""];

    const renderStartingContent = () => contentSections.push(`OpenTips is initializing...`);

    const renderStatusDetails = async () => {
      if (this.providerStatus.isServiceDirectoryAvailable) {
        contentSections.push("✅ Service directory is available.");
      } else {
        contentSections.push("⚠️ Service directory is not available.");
      }
      contentSections.push("");

      if (this.providerStatus.isServiceAvailable) {
        contentSections.push("✅ Service is available.");
      } else {
        contentSections.push("🔄 Service is attempting to start...");
      }
      contentSections.push("");

      if (!this.providerStatus.isServiceAvailable || !this.providerStatus.isServiceDirectoryAvailable) {
        contentSections.push(`<div class="button-container">
  <button class="button" id="showServiceInstallationWalkthrough">Service Installation Instructions</button>
</div>`);
        contentSections.push("");
      }

      const languageModelProviderAvailable = await this.providerStatus.isLanguageModelProviderAvailable();
      if (languageModelProviderAvailable) {
        contentSections.push("✅ Language model provider is available.");
      } else {
        contentSections.push("⚠️ Language model provider is not available.");
        contentSections.push(`<div class="button-container"></div>
  <button class="button" id="showLanguageModelWalkthrough">Language Model Instructions</button>
</div>`);
      }
    };

    if (this.providerStatus.isStarting) {
      renderStartingContent();
    } else {
      await renderStatusDetails();
    }

    contentSections.push("");
    contentSections.push(`<div class="button-container">
        <button class="button" id="showOutputChannel">Show Output Channel</button>
      </div>`);

    this.renderMarkdown(contentSections.join("\n"));
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true, // Enable scripts for button interaction
      localResourceRoots: [],
    };

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case "showServiceInstallation":
          // Handle refresh click
          vscode.commands.executeCommand("opentips.showServiceInstallationWalkthrough");
          break;
        case "showLanguageModel":
          // Handle refresh click
          vscode.commands.executeCommand("opentips.showLanguageModelWalkthrough");
          break;
        case "showOutputChannel":
          vscode.commands.executeCommand("opentips.openExtensionChannel");
      }
    }, undefined);

    this.updateContent();
  }

  private renderMarkdown(markdownText: string) {
    if (!this.webviewView) {
      logger("[status-panel] Webview view not available.");
      return;
    }

    const htmlContent = this.markdownToHtml(markdownText);

    this.webviewView.webview.html = `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { 
                        padding: 10px;
                        color: var(--vscode-foreground);
                        font-family: var(--vscode-font-family);
                    }
                    img { max-width: 100%; }
                    .button-container {
                        margin-top: 20px;
                    }
                    .button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 4px 10px;
                        cursor: pointer;
                        display: inline-block;
                        border-radius: 2px;
                        font-family: var(--vscode-font-family);
                        font-size: 13px;
                        line-height: 1.4;
                    }
                    .button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                ${htmlContent}
                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById('showServiceInstallationWalkthrough')?.addEventListener('click', () => {
                        vscode.postMessage({ type: 'showServiceInstallation' });
                    });
                    document.getElementById('showLanguageModelWalkthrough')?.addEventListener('click', () => {
                        vscode.postMessage({ type: 'showLanguageModel' });
                    });
                    document.getElementById('showOutputChannel')?.addEventListener('click', () => {
                        vscode.postMessage({ type: 'showOutputChannel' });
                    });
                </script>
            </body>
            </html>`;
  }

  private markdownToHtml(markdownText: string): string {
    return this.markdownRenderer.render(markdownText);
  }
}
