import { commands, ExtensionContext } from "vscode";

import { CoreInstaller } from "./lib/installer";
import { NodeFileSystem, NodeProcessRunner } from "./system/node-system";
import { VSCodeExtensionLoader } from "./extension-point/extension-loader";
import { VSCodeNotifier } from "./extension-point/notifier";

export function enrollInstallPackage(context: ExtensionContext) {
  const installer = new CoreInstaller(
    new VSCodeExtensionLoader(),
    new VSCodeNotifier(),
    new NodeFileSystem(),
    new NodeProcessRunner()
  );

  context.subscriptions.push(commands.registerCommand("opentips.installPackage", installer.install.bind(installer)));
}
