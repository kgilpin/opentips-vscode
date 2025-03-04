import { commands, ExtensionContext, ProgressLocation, window } from "vscode";

import { CoreInstaller } from "./lib/installer";
import { NodeFileSystem, NodeProcessRunner } from "./system/node-system";
import { logger } from "./extension-point/logger";
import { IInstallResult } from "./types/installer";
import { withLockFile } from "./system/lock-file";

export function enrollInstallPackage(context: ExtensionContext) {
  const installer = new CoreInstaller(
    context.extensionPath,
    new NodeFileSystem(),
    new NodeProcessRunner(),
    withLockFile,
    logger
  );

  const install = async (directory?: string) => {
    const installDirectory = directory || installer.defaultWorkingDirectory;

    let installResult: IInstallResult = {
      succeeded: false,
    };
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: "Installing OpenTips package",
        cancellable: false,
      },
      async (progress) => {
        const onStep = (step: string) => progress.report({ message: step });

        try {
          installResult = await installer.install(installDirectory, { step: onStep });
        } catch (error) {
          const message = error instanceof Error ? error.message : undefined;
          logger(`[install-package] Failed to install package: ${message}`);
          installResult = { succeeded: false, error: message };
        }
      }
    );

    if (installResult.succeeded) {
      window.showInformationMessage("OpenTips package installed successfully.");
    } else {
      const errorMessage =
        installResult.error || "Failed to install OpenTips package. Check Output > OpenTips for details.";
      window.showErrorMessage(errorMessage);
    }
  };

  context.subscriptions.push(commands.registerCommand("opentips.installPackage", install));
}
