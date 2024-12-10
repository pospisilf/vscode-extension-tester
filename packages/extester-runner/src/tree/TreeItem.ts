import * as vscode from 'vscode';

export class TreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public isFolder: boolean,
    public filePath?: string,
    public lineNumber?: number // Optional line number for test cases
  ) {
    super(label, collapsibleState);

    // Set the icon based on the label and type
    this.iconPath = this.getIconPath(label, isFolder);

    // Context value for enabling conditional commands
    this.contextValue = isFolder ? 'folder' : label.startsWith('describe:') ? 'describe' : 'it';

    // Assign a command to open the file at a specific line or at the top
    if (!isFolder && filePath) {
      this.command = this.getOpenFileCommand(filePath, lineNumber);
    }
  }

  // Get appropriate icon based on label and type
  private getIconPath(label: string, isFolder: boolean): vscode.ThemeIcon {
    if (isFolder) return new vscode.ThemeIcon('folder');
    if (label.startsWith('describe:')) return new vscode.ThemeIcon('symbol-enum');
    if (label.startsWith('it:')) return new vscode.ThemeIcon('symbol-constant');
    return new vscode.ThemeIcon('file');
  }

  // Generate the VS Code command for opening files
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
