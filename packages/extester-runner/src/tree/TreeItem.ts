import * as vscode from 'vscode';

export class TreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public isFolder: boolean,
    public filePath?: string,
    public lineNumber?: number
  ) {
    super(label, collapsibleState);

    this.iconPath = this.getIconPath(label, isFolder);
    this.contextValue = isFolder ? 'folder' : 'file';

    if (!isFolder && filePath) {
      this.command = this.getOpenFileCommand(filePath, lineNumber);
    }
  }

  private getIconPath(label: string, isFolder: boolean): vscode.ThemeIcon {
    if (isFolder) return new vscode.ThemeIcon('folder');
    if (label.startsWith('describe:')) return new vscode.ThemeIcon('symbol-enum');
    if (label.startsWith('it:')) return new vscode.ThemeIcon('symbol-constant');
    return new vscode.ThemeIcon('file');
  }

  private getOpenFileCommand(filePath: string, lineNumber?: number): vscode.Command {
    return lineNumber !== undefined
      ? {
          command: 'vscode.open',
          title: 'Open File',
          arguments: [
            vscode.Uri.file(filePath),
            { selection: new vscode.Range(lineNumber, 0, lineNumber, 0) },
          ],
        }
      : {
          command: 'vscode.open',
          title: 'Open File',
          arguments: [vscode.Uri.file(filePath)],
        };
  }
}
