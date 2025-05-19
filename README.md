# OpenTips - Realtime Code Review

[![Version](https://img.shields.io/visual-studio-marketplace/v/kgilpin.opentips)](https://marketplace.visualstudio.com/items?itemName=kgilpin.opentips)
[![License](https://img.shields.io/github/license/kgilpin/opentips-vscode)](LICENSE)

<!--
TODO: Add more badges as the numbers become meaningful.

[![Installs](https://img.shields.io/visual-studio-marketplace/i/kgilpin.opentips)](https://marketplace.visualstudio.com/items?itemName=kgilpin.opentips)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/kgilpin.opentips)](https://marketplace.visualstudio.com/items?itemName=kgilpin.opentips)
-->

Does code review come too late to be useful? Get code review suggestions automatically in real-time: bugs, security
flaws, and performance problems.

With OpenTips, you don't have to manually initiate code review with a button, command, or menu; and you don't have to wait for a CI job to run.
OpenTips continuously reviews your work-in-progress, delivering instant, context-aware suggestions for code quality, best practices, and improvements. Like having a code reviewer always by your side, OpenTips helps you catch issues and refine your code before you commit. Suggestions and review comments are displayed in a dedicated panel in the editor, and are also highlighted within the code itself.

OpenTips Realtime Code Review is 100% free to install and use. It can even use the LLM provided by GitHub Copilot, so if you're a Copilot user, you can get the best of both worlds: OpenTips and Copilot working together to help you write better code, with no added LLM cost.

You can also bring your own Anthropic API key to use OpenTips independently of GitHub Copilot.

![VS Code interface showing OpenTips panel with coding suggestions and inline code highlighting](https://raw.githubusercontent.com/kgilpin/opentips-vscode/refs/heads/main/resources/panel_and_tips.png)

For each review suggestion, you can choose to:

- **`</>` Apply**: Change your code in the way suggested by the review.
- **`？` Explain**: Learn more about the review comment and how it can help, without making a code change yet.
- **`🗑️` Dismiss**: Ignore the review suggestion.

### Quick Start

1. **Install Extension** - Get OpenTips from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=kgilpin.opentips)
2. **Install Python** - Make sure you have Python 3.11 or later installed on your system
3. **Automatic Setup** - Python backend configures automatically
4. **Check Status** - Open the `OpenTips` status view to ensure everything is set up and running correctly
5. **Start Coding** - Real-time code review suggestions appear immediately as you write code

## Table of Contents

- [Actions](#suggestion-actions)
- [Features](#features)
- [Installation Status](#installation-status)
- [Configuration](#configuration)
  - [Language Model Provider](#language-model-provider)
  - [opentips Python Service](#opentips-python-service)
- [Commands](#commands)
  - [Setup and Configuration](#setup-and-configuration)
  - [API Key Management](#api-key-management)
- [Output](#output)
- [Installation](#installation)
  - [Quick Start (3 Steps)](#quick-start-3-steps)
  - [Detailed Installation](#detailed-installation)
    - [VS Code Extension](#vs-code-extension)
    - [Service Package](#service-package)
- [Build and Install from Source](#build-and-install-from-source)
- [Bugs and Feature Requests](#bugs-and-feature-requests)

## Actions

### Apply

> Requires GitHub Copilot

Apply suggestions effortlessly with a single click directly from your code editor. This will open a GitHub Copilot Chat that's pre-filled with information about the suggestion. You can then send the message to apply the suggestion to your code.

### Explain

> Works seamlessly with your GitHub Copilot subscription or independently via an Anthropic API key

Click on the question mark icon ？, or `Explain` link in the popup, to get a detailed explanation of the suggestion. There will be a slight delay while the explanation is fetched, then it will be opened in a new text editor document for you to read.

### Dismiss

Click on the trash can icon 🗑️, or `Dismiss` link to remove the suggestion from the list. You can do this when the suggestion has been applied, or if you are not interested in the suggestion.

## Features

### Diff Inspection

> Requires Git

Automatically identifies relevant improvements by analyzing code changes in your working branch versus your default branch (which should be named `main`, `master`, or `develop`).

### Auto-Hiding

If you change your code in a way that makes a suggestion no longer relevant, the suggestion will be automatically hidden. You can also manually dismiss suggestions that you are not interested in.

### Prioritization and Diversity

Avoid overload — suggestions are prioritized and diversified to keep your coding productive. This helps to prevent OpenTips from overwhelming you with too many suggestions at once!

## Installation Status

The `STATUS` view shows the installation status of the extension. This view will be displayed when the extension is first installed, and it will show the progress of the installation process.

![OpenTips status view showing the installation status of the extension](https://raw.githubusercontent.com/kgilpin/opentips-vscode/refs/heads/main/resources/status.png)

If OpenTips is not fully running and configured, you can use the information provided in this view to complete the setup process. Easy troubleshooting — quickly diagnose any setup issues via clear logs directly within VS Code.

# Configuration

## Language Model Provider

OpenTips uses a large-language model (LLM) to provide suggestions. You can choose between the two following ways of providing an LLM to OpenTips:

1. **GitHub Copilot**: If you have GitHub Copilot installed, OpenTips will use it as the language model provider. This is an easy way to use OpenTips, as you don't need to provide any additional configuration.
2. **Anthropic Claude API Key**: For standalone functionality without requiring GitHub Copilot. This will allow OpenTips to use the Anthropic API as the language model provider.

## `opentips` Python Service

OpenTips features a built-in Python backend for advanced, seamless integration and enhanced processing.

The Python service is provided as a separate package, `opentips`, which will be installed automatically when you first use OpenTips. This package is required for OpenTips to function correctly.

The Python backend enables several key capabilities:

- **Git Integration**: Analyzes your Git repository's history and branch structure to provide context-aware suggestions based on code changes
- **Code Analysis**: Performs deep static analysis of your codebase to identify patterns and potential improvements
- **Language Support**: Provides enhanced support for Python-specific suggestions and best practices
- **Performance**: Handles computationally intensive tasks outside of VS Code to maintain editor responsiveness
- **Caching**: Maintains a local cache of analysis results to speed up suggestion generation
- **State Management**: Tracks which suggestions have been shown, applied, or dismissed to avoid duplicates
- **File System Access**: Safely manages access to your project files for comprehensive code analysis

Requires Python 3.11+.

## Commands

OpenTips provides several commands that you can access through the Command Palette (Ctrl+Shift+P or Cmd+Shift+P).
Once you've opened the Command Palette, start typing "OpenTips" to see the available commands:

### Setup and Configuration

- **OpenTips: Open Usage Walkthrough** - Show the usage walkthrough and feature tour.
- **OpenTips: Open Service Installation Walkthrough** - Get help configuring and installing the Python backend service.
- **OpenTips: Open Language Model Walkthrough** - Get help configuring your preferred language model.
- **OpenTips: Install opentips Python Package** - Install or update the required Python backend service package. This command runs automatically on installation of the extension.

### API Key Management

- **OpenTips: Set Anthropic API Key** - Configure your Claude API key for standalone operation
- **OpenTips: Show Anthropic API Key Status** - Check if your Claude API key is configured and valid
- **OpenTips: Clear Anthropic API Key** - Remove your stored Claude API key

## Output

OpenTips provides output channels where you can see logs and debug information. You can access these output channels by looking for the `Output` tab in the bottom panel of the editor. You'll see two channels related to OpenTips:

- **OpenTips**: Log messages from the operation of the OpenTips extension.
- **OpenTips RPC**: Logs from the `opentips` Python service.

If you aren't getting suggestions, check these output channels for messages that might help you diagnose the issue.

## Installation

## Install from VSCode

1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "OpenTips"
4. Click Install

## Install from VSCode Marketplace

[🔗 Visit OpenTips on VS Code Marketplace &raquo;](https://marketplace.visualstudio.com/items?itemName=kgilpin.opentips)

### Service Package

OpenTips requires a Python package called "opentips".

To complete your installation, you'll need to set up the Python environment and install the `opentips` package.

#### Install Python

You'll need to have Python 3.11 or later.

- MacOS and Linux come with Python built in.
- Windows users can install Python from the Microsoft Store: [Python 3.11](https://apps.microsoft.com/detail/9nrwmjp3717k)

#### Automatic Installer

By default, OpenTips will automatically install the `opentips` package to `$HOME/.opentips`.

#### Automatic Installer Setting

You can disable the automated installer by changing the setting "OpenTips: Install Globally" to "false".
Do this if you want to manually manage the `opentips` package in a virtualenv of your project
(the virtualenv must be located in `.venv` or `venv`).

#### Installer Command

You can initiate the automatic installer by running the command "OpenTips: Install opentips Python Package". For example, if you need to install Python, you can then run this command to complete the install of OpenTips.

#### Lock File

A lock file called "install.lock" protects against multiple concurrent installations.

#### Manual Installation

Run the Python extension command `Python: Select Interpreter` from the Command Palette `(Ctrl+Shift+P)` or `(Cmd+Shift+P)`:

![select-interpreter-prompt](https://raw.githubusercontent.com/kgilpin/opentips-vscode/refs/heads/main/walkthroughs/service/images/select-interpreter-prompt.png)

Next, select the Python interpreter and virtualenv you want to use for this project:

![python-select-interpreter](https://raw.githubusercontent.com/kgilpin/opentips-vscode/refs/heads/main/walkthroughs/service/images/choose-interpreter.png)

Once you've selected the Python interpreter, run the command `Python: Create Terminal` from the Command Palette `(Ctrl+Shift+P)` or `(Cmd+Shift+P)` to open a terminal with the selected Python interpreter:

![create-terminal](https://raw.githubusercontent.com/kgilpin/opentips-vscode/refs/heads/main/walkthroughs/service/images/create-terminal.png)

From the terminal, install the `opentips` package using the following command:

```bash
pip install opentips
```

Now the OpenTips extension will detect that the package is available and it will run the RPC server in the background.

You can check the status of the server by checking the `Output` panel:

![opentips-output](https://raw.githubusercontent.com/kgilpin/opentips-vscode/refs/heads/main/walkthroughs/service/images/opentips-output.png)

## Build and Install from Source

```bash
# Clone the repository
git clone https://github.com/kgilpin/opentips-vscode.git

# Navigate to the directory
cd opentips-vscode

# Install dependencies
yarn

# Package the extension, outputting opentips-x.y.z.vsix
yarn package
```

Once the packaging is complete, install the generated .vsix file:

1. In VS Code, open the Extensions view (Ctrl+Shift+X or Cmd+Shift+X)
2. Click the "..." menu in the top-right of the Extensions view
3. Select "Install from VSIX..."
4. Navigate to the packaged .vsix file in the project directory
5. Click "Install"

![VS Code Extensions view showing the "Install from VSIX" menu option](https://raw.githubusercontent.com/kgilpin/opentips-vscode/refs/heads/main/resources/install_vsix.png)

Alternatively, you can install the .vsix from the command line:

```bash
code --install-extension opentips-x.y.z.vsix
```

Where `x.y.z` is the version number of the package.

## Bugs and Feature Requests

If you encounter any bugs or have feature requests, please open an issue on the [GitHub repository](https://github.com/kgilpin/opentips-vscode/issues).

If you are reporting a bug, please include the contents of the `OpenTips` and `OpenTips RPC` output channels in your issue. See the [Output](#output) section for details on how to access these logs.
