import * as vscode from "vscode";
import { logger } from "./logger";
import { APP } from "./extension";

const DEFAULT_NOTIFICATION_DELAY = 5000;

/**
 * Notifier class that schedules notifications for file changes.
 * Stores a mapping of folders to files that have changed in that folder.
 * When a file change is detected, it schedules a notification for the folder.
 * If another file change is detected for the same folder before the notification is sent,
 * the previous notification is cancelled and a new one is scheduled.
 */
class FileChangeNotifier {
  files: Map<string, Set<string>> = new Map();
  notificationsByFolder = new Map<string, NodeJS.Timeout>();
  notificationDelay = DEFAULT_NOTIFICATION_DELAY;

  /**
   * Notify that a file has changed in a folder. This should be called whenever a file change is detected.
   */
  notify(folder: string, fileName: string) {
    // Get existing set or create new one if it doesn't exist
    const fileSet = this.files.get(folder) || this.files.set(folder, new Set()).get(folder)!;
    fileSet.add(fileName);
    this.scheduleNotification(folder);
  }

  protected scheduleNotification(folder: string) {
    const existingNotification = this.notificationsByFolder.get(folder);
    if (existingNotification) {
      clearTimeout(existingNotification);
    }

    const notification = setTimeout(() => this.sendNotification(folder), this.notificationDelay);
    this.notificationsByFolder.set(folder, notification);
  }

  protected sendNotification(folder: string) {
    const client = APP.newRpcClient(folder);
    if (!client) {
      logger(`[file-watcher] No RPC client for folder ${folder}. Rescheduling notification.`);
      this.scheduleNotification(folder);
      return;
    }

    this.notificationsByFolder.delete(folder);

    const fileNames = Array.from(this.files.get(folder) || []);
    logger(`[file-watcher] Sending change notification for ${folder}: ${fileNames.join(", ")}`);

    this.files.delete(folder);
    // Allow errors to propagate up to the framework.
    client.changed(fileNames);
  }
}

const notifier = new FileChangeNotifier();

function onFileChanged(uri: vscode.Uri) {
  const fileName = uri.fsPath;
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) {
    logger(`[file-watcher] No workspace folder for file ${fileName}`);
    return;
  }

  notifier.notify(folder?.uri.fsPath, fileName);
}

export function enrollFileWatcher(context: vscode.ExtensionContext) {
  const fileWatcher = vscode.workspace.createFileSystemWatcher("**/*");
  context.subscriptions.push(fileWatcher);
  fileWatcher.onDidChange(onFileChanged);
}
