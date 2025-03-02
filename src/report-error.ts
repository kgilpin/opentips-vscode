import * as vscode from "vscode";
import { logger } from "./logger";

let lastErrorMessageTime: number | null = null;

const ERROR_MESSAGE_NOTIFICATION_INTERVAL_MS = 60 * 1000; // 60 seconds * 1000 milliseconds

export default async function invokeWithErrorReporting<T>(
  operation: string,
  fn: () => T | Promise<T>
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      reportError(operation, error);
    } else {
      logger(`Error: ${error}`);
    }
    return undefined;
  }
}

export function reportError(operation: string, error: Error) {
  const now = Date.now(); // More suitable than performance.now for this use case
  const timeSinceLastErrorMessage = lastErrorMessageTime ? now - lastErrorMessageTime : undefined;

  logger(`Error ${operation}: ${error.name} ${error.message}`);
  logger(`Stack trace:\n${error.stack}`);
  if ((timeSinceLastErrorMessage ?? Infinity) >= ERROR_MESSAGE_NOTIFICATION_INTERVAL_MS) {
    const errorMessage = `OpenTips error ${operation}: ${error.message}`;

    vscode.window.showErrorMessage(errorMessage);
    lastErrorMessageTime = now;
  }
}
