import * as vscode from "vscode";
import { logger } from "../extension-point/logger";
import MarkdownIt from "markdown-it";
import EventEmitter from "events";

class TimeoutStatusLoading extends EventEmitter {
  private timeout: NodeJS.Timeout | undefined;

  constructor(public delay: number) {
    super();

    this.startTimeout();
  }

  clear() {
    this.removeAllListeners();
  }

  private startTimeout() {
    if ( this.timeout ) {
      clearTimeout(this.timeout); 
    }

    this.timeout = setTimeout(() => {
      this.emit("timeout");
    }, this.delay);
  }
}



export class StatusPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "opentips.status";

  private portsByFolder = new Map<string, number | undefined>();
  private webviewView: vscode.WebviewView | undefined;
  private markdownRenderer = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
  });
  private statusTimeout: TimeoutStatusLoading | undefined;

  get anyFolderHasPort(): boolean {
    return Array.from(this.portsByFolder.values()).some((port) => port !== undefined);
  }

  portChanged(folder: string, port: number | undefined): void {
    this.statusTimeout?.clear();
    this.statusTimeout = undefined;

    const thenAnyFolderHasPort = this.anyFolderHasPort;

    this.portsByFolder.set(folder, port);
    const nowAnyFolderHasPort = this.anyFolderHasPort;

    if (thenAnyFolderHasPort !== nowAnyFolderHasPort) {
      this.updateContent();
    }
  }

  updateContent() {
    if (this.anyFolderHasPort) {
      this.showStatusAvailable();
    } else {
      this.showStatusUnavailable();
    }
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

    if (this.anyFolderHasPort) {
      this.showStatusAvailable();
      return;
    }

    this.showStatusLoading();
  }

  private showStatusLoading() {
    const loadingMarkdown = `OpenTips is starting...
`;
    this.renderMarkdown(loadingMarkdown);

    this.statusTimeout = new TimeoutStatusLoading(10000);
    this.statusTimeout.on("timeout", () => {
      this.showStatusUnavailable();
    });

  }

  private showStatusAvailable() {
    // TODO: Detect and show this when the port is available.
    const _runningMarkdown = `OpenTips is running
    
<div class="button-container">
  <button class="button" id="showOutputChannel">Show Output Channel</button>
</div>
`;
    this.renderMarkdown(_runningMarkdown);
  }

  private showStatusUnavailable() {
    const notRunningMarkdown = `OpenTips is not running yet.

Ensure that the OpenTips Python package is installed:

<div class="button-container">
  <button class="button" id="showServiceInstallationWalkthrough">Service Installation Instructions</button>
</div>

Ensure that a language model provider is available:

<div class="button-container">
  <button class="button" id="showLanguageModelWalkthrough">Language Model Instructions</button>
</div>

Check the OpenTips output channel for more information:

<div class="button-container">
  <button class="button" id="showOutputChannel">Show Output Channel</button>
</div>
`;
    this.renderMarkdown(notRunningMarkdown);
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
