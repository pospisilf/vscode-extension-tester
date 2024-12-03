import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // Register a tree view provider
  const testTreeProvider = new ExtesterTreeProvider();
  vscode.window.registerTreeDataProvider('extesterView', testTreeProvider);

  // Add other activation code here
}

export function deactivate() {}

class ExtesterTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!element) {
      return Promise.resolve([
        new TreeItem('Run All Tests', vscode.TreeItemCollapsibleState.None),
        new TreeItem('Test Suite 1', vscode.TreeItemCollapsibleState.Collapsed),
      ]);
    }
    return Promise.resolve([new TreeItem('Test Case 1'), new TreeItem('Test Case 2')]);
  }
}

class TreeItem extends vscode.TreeItem {
  constructor(label: string, collapsibleState?: vscode.TreeItemCollapsibleState) {
    super(label, collapsibleState);
  }
}
