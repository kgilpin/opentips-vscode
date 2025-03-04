import { commands, ExtensionContext, window } from "vscode";

const output = window.createOutputChannel("OpenTips");

const rpcOutput = window.createOutputChannel("OpenTips RPC");

export function logger(message: string) {
  output.appendLine(message);
}

export function rpcLogger(message: string) {
  rpcOutput.append(message);
}

export function enrollOutput(context: ExtensionContext) {
  context.subscriptions.push(
    ...[
      commands.registerCommand("opentips.openExtensionChannel", output.show.bind(output)),
      commands.registerCommand("opentips.openRPCChannel", rpcOutput.show.bind(rpcOutput)),
    ]
  );
}
