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

    // Assign a command to handle file opening
    if (!isFolder && filePath) {
      console.log(`Assigning command to TreeItem: ${label}, FilePath: ${filePath}, Line: ${lineNumber}`);
      this.command = {
        command: 'vscode-runner.openFileAtLine',
        title: 'Open File at Line',
        arguments: [filePath, lineNumber],
      };
    }
  }

  // Get appropriate icon based on label and type
  private getIconPath(label: string, isFolder: boolean): vscode.ThemeIcon {
    if (isFolder) {
      return new vscode.ThemeIcon('folder');
    }
    if (label.startsWith('describe:')) {
      return new vscode.ThemeIcon('symbol-enum');
    }
    if (label.startsWith('it:')) {
      return new vscode.ThemeIcon('symbol-constant');
    }
    return new vscode.ThemeIcon('file');
  }
}

export function registerOpenFileAtLineCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'vscode-runner.openFileAtLine',
    async (filePath: string, lineNumber?: number) => {
      try {
        if (!filePath) {
          vscode.window.showErrorMessage('File path is not provided!');
          return;
        }

        console.log(`Opening file: ${filePath}, Line: ${lineNumber}`);

        const document = await vscode.workspace.openTextDocument(filePath);
        const editor = await vscode.window.showTextDocument(document, {
          preserveFocus: false,
          preview: false, // Ensure it always opens in a new editor group if necessary
        });

        if (lineNumber !== undefined && lineNumber >= 0) {
          const position = new vscode.Position(lineNumber, 0);
          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to open file: ${filePath}. Error: ${error}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}
