# OpenTips

[![Version](https://img.shields.io/visual-studio-marketplace/v/opentips.opentips)](https://marketplace.visualstudio.com/items?itemName=opentips.opentips)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/opentips.opentips)](https://marketplace.visualstudio.com/items?itemName=opentips.opentips)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/opentips.opentips)](https://marketplace.visualstudio.com/items?itemName=opentips.opentips)
[![License](https://img.shields.io/github/license/SgtAirRaid/opentips-vscode)](LICENSE)

OpenTips provides coding tips and suggestions in your code editor. It's like having a helpful colleague who points out potential improvements and best practices as you write code.

Tips are displayed in a dedicated panel in the editor, and they are also highlighted within the code itself.

For each tip, you can choose to:

- **Explain**: Learn more about the tip and why it's important.
- **Apply**: Apply the tip to your code. This will open a GitHub Copilot Chat with a pre-filled message that you can send to apply the tip.
- **Dismiss**: Remove the tip from the list.

## Tip Actions

### Explain Tip

Click on the question mark icon ？, or `Explain` link in the popup, to get a detailed explanation of the tip. There will be a slight delay while the explanation is fetched, then it will be opened in a new text editor document for you to read.

### Apply Tip

Click on the code icon `{}`, or `Apply` link in the popup, to apply the tip to your code. This will open a GitHub Copilot Chat that's pre-filled with information about the tip. You can then send the message to apply the tip to your code.

### Dismiss Tip

Click on the trash can icon 🗑️, or `Dismiss` link to remove the tip from the list. You can do this when the tip has been applied, or if you are not interested in the tip.

## Features

### Auto-suggestion

As you code, OpenTips looks at your work-in-progress and provides tips based on the code you are writing. Tips are displayed in a dedicated panel in the editor, and they are also highlighted within the code itself.

Specifically, OpenTips looks at the differences between your working branch and the main branch (which should be
named `main`, `master`, or `develop`). Therefore, your project must be using Git in order to use OpenTips.

### Auto-hiding

If you change your code in a way that makes a tip no longer relevant, the tip will be automatically hidden. You can also manually dismiss tips that you are not interested in.

### Prioritization and diversity

Tips are continually updated and improved to provide a diverse set of suggestions. This also helps to prevent OpenTips from overwhelming you with too many tips at once!

# Configuration

## Language Model Provider

OpenTips uses a large-language model (LLM) to provide tips. You can choose between the two following ways of providing an LLM to OpenTips:

1. **GitHub Copilot**: If you have GitHub Copilot installed, OpenTips will use it as the language model provider. This is an easy way to use OpenTips, as you don't need to provide any additional configuration.
2. **Anthropic API Key**: If you don't have GitHub Copilot installed, you can provide an API key for the Anthropic API. This will allow OpenTips to use the Anthropic API as the language model provider.

## `opentips` Python Service

OpenTips is complemented by a Python backend that enhances its functionality, allowing for advanced processing and integration.

The Python service is provided as a separate package, `opentips`, which will be installed automatically when you first use OpenTips. This package is required for OpenTips to function correctly.

## Commands

OpenTips provides several commands that you can access through the Command Palette (Ctrl+Shift+P or Cmd+Shift+P).
Once you've opened the Command Palette, start typing "OpenTips" to see the available commands:

### Setup and Configuration

- **OpenTips: Open Usage Walkthrough** - Show the usage walkthrough and feature tour
- **OpenTips: Open Service Installation Walkthrough** - Get help configuring and installing the Python backend service
- **OpenTips: Open Language Model Walkthrough** - Get help configuring your preferred language model
- **OpenTips: Install opentips Python Package** - Install or update the required Python backend service package

### API Key Management

- **OpenTips: Set Anthropic API Key** - Configure your Anthropic API key for using Claude models
- **OpenTips: Show Anthropic API Key Status** - Check if your Anthropic API key is configured and valid
- **OpenTips: Clear Anthropic API Key** - Remove your stored Anthropic API key

## Output

OpenTips provides output channels where you can see logs and debug information. You can access these output channels by looking for the `Output` tab in the bottom panel of the editor. You'll see two channels related to OpenTips:

- **OpenTips**: Log messages from the operation of the OpenTips extension.
- **OpenTips RPC**: Logs from the `opentips` Python service.

If you aren't getting tips, check these output channels for messages that might help you diagnose the issue.

## Installation

### VS Code Marketplace

1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "OpenTips"
4. Click Install

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/SgtAirRaid/opentips-vscode.git

# Navigate to the directory
cd opentips-vscode

# Install dependencies
yarn

# Package the extension, outputting opentips-x.y.z.vsix
yarn run package
```

Once the packaging is complete, install the generated .vsix file:

1. In VS Code, open the Extensions view (Ctrl+Shift+X or Cmd+Shift+X)
2. Click the "..." menu in the top-right of the Extensions view
3. Select "Install from VSIX..."
4. Navigate to the packaged .vsix file in the project directory
5. Click "Install"

![Install from VSIX](https://raw.githubusercontent.com/SgtAirRaid/opentips-vscode/refs/heads/main/resources/install_vsix.png)

Alternatively, you can install the .vsix from the command line:

```bash
code --install-extension opentips-x.y.z.vsix
```

Where `x.y.z` is the version number of the package.

## Bugs and Feature Requests

If you encounter any bugs or have feature requests, please open an issue on the [GitHub repository](https://github.com/SgtAirRaid/opentips-vscode/issues).

If you are reporting a bug, please include the contents of the `OpenTips` and `OpenTips RPC` output channels in your issue. See the [Output](#output) section for details on how to access these logs.
