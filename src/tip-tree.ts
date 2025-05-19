import * as vscode from "vscode";
import { Tip } from "./tips";
import path from "path";
import { logger } from "./extension-point/logger";

const PRIORITY_INDEXES: Record<string, number> = {
  high: 3,
  normal: 2,
  medium: 2,
  low: 1,
};

class TipListProvider implements vscode.TreeDataProvider<string | Tip> {
  public _tips: Tip[] = [];
  private _filteredTips: Tip[] | null = null;
  private filter: ((tip: Tip) => boolean) | undefined;

  private _onDidChangeTreeData = new vscode.EventEmitter<string | Tip | null | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  /**
   * Note that tips are de-duplicated by the Tips service, so we can safely add all tips to the list.
   *
   * @param tips additional tips to add to the list
   */
  setTips(tips: Tip[]) {
    Array.prototype.push.apply(this._tips, tips);
    this._filteredTips = null;
    this._onDidChangeTreeData.fire();
  }

  tipsForFile(filePath: string): Tip[] {
    const tipPath = (tip: Tip) => path.join(tip.directory, tip.file);
    return this._tips.filter((tip) => tipPath(tip) === filePath);
  }

  setFilter(filter: (tip: Tip) => boolean) {
    this.filter = filter;
    this._filteredTips = null;
    this._onDidChangeTreeData.fire();
  }

  removeTip(tipId: string) {
    const initialLength = this._tips.length;
    this._tips = this._tips.filter((tip) => tip.id !== tipId);

    if (this._tips.length === initialLength) {
      logger(`[TipListProvider] Tip not found: ${tipId}`);
      return;
    }

    this._filteredTips = null;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: string | Tip): vscode.TreeItem {
    if (typeof element === "string") {
      return {
        label: `${element} priority`,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
      };
    } else {
      const iconPath: vscode.ThemeIcon = new vscode.ThemeIcon("file");
      const fileName = path.basename(element.file);
      return {
        iconPath,
        id: element.id,
        label: `${element.type} - ${element.label} - ${fileName}:${element.line}`,
        tooltip: element.description,
        contextValue: "opentips.tip",
        command: {
          command: "opentips.openTip",
          title: "Open File",
          arguments: [element.id],
        },
      };
    }
  }

  getParent(element: string | Tip): vscode.ProviderResult<string | Tip> {
    if (typeof element === "string") {
      return null;
    } else {
      return element.priority;
    }
  }

  getChildren(element?: string | Tip): Thenable<(string | Tip)[]> {
    if (element === undefined) {
      const observedPriorities = Array.from(new Set(this.filteredTips.map((tip) => tip.priority)));
      const prioritySortOrder = (priority: string) => PRIORITY_INDEXES[priority] ?? 0;
      observedPriorities.sort((a, b) => {
        return prioritySortOrder(b) - prioritySortOrder(a);
      });
      return Promise.resolve(observedPriorities);
    } else if (typeof element === "string") {
      return Promise.resolve(this.filteredTips.filter((tip) => tip.priority === element));
    } else {
      return Promise.resolve([]);
    }
  }

  get filteredTips(): Tip[] {
    if (this._filteredTips === null) {
      this._filteredTips = this.filter ? this._tips.filter(this.filter) : this._tips.slice();
    }
    return this._filteredTips;
  }
}

export interface ITipsModel {
  listTipsForFile(uri: vscode.Uri): Tip[];

  filterTips(filter: (tip: Tip) => boolean): void;

  addTips(tips: Tip[]): void;

  removeTip(tipId: string): void;
}

export function enrollTipList(context: vscode.ExtensionContext): ITipsModel {
  const tipsModel = new TipListProvider();
  const tipsTree = vscode.window.createTreeView("opentips.tipList", {
    treeDataProvider: tipsModel,
  });

  tipsModel.onDidChangeTreeData(() => {
    tipsTree.badge = {
      tooltip: "Number of tips",
      value: tipsModel.filteredTips.length,
    };
  });

  context.subscriptions.push(tipsTree);

  return {
    listTipsForFile(uri: vscode.Uri): Tip[] {
      const filePath = uri.fsPath;
      return tipsModel.tipsForFile(filePath);
    },

    filterTips(filter: (tip: Tip) => boolean) {
      tipsModel.setFilter(filter);
    },

    addTips(tips: Tip[]) {
      tipsModel.setTips(tips);
    },

    removeTip(tipId: string) {
      tipsModel.removeTip(tipId);
    },
  };
}
