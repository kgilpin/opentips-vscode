import { window } from "vscode";
import { INotifier } from "../types/platform";

export class VSCodeNotifier implements INotifier {
  showError(message: string): void {
    window.showErrorMessage(message);
  }

  showSuccess(message: string): void {
    window.showInformationMessage(message);
  }
}
