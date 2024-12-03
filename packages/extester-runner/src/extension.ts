import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new ExtesterTreeProvider();
  vscode.window.registerTreeDataProvider('extesterView', treeDataProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand('extesterRunner.refreshTests', () => {
      treeDataProvider.refresh();
    })
  );
}

export function deactivate() {}

class ExtesterTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> =
    new vscode.EventEmitter<TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> =
    this._onDidChangeTreeData.event;

  private files: vscode.Uri[] = [];

  constructor() {
    this.refresh(); // Load the test files on initialization
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
    this.findTestFiles();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
	if (!element) {
	  // If no parent, return top-level folders
	  const folderMap = this.groupFilesByFolder();
	  return Promise.resolve(
		Array.from(folderMap.keys()).map(
		  (folder) => new TreeItem(folder, vscode.TreeItemCollapsibleState.Collapsed, true)
		)
	  );
	} else if (element.isFolder && typeof element.label === 'string') {
	  // If the parent is a folder and label is a string, return its files
	  const folderMap = this.groupFilesByFolder();
	  const files = folderMap.get(element.label) || [];
	  return Promise.resolve(
		files.map(
		  (file) =>
			new TreeItem(
			  file,
			  vscode.TreeItemCollapsibleState.None,
			  false,
			  path.join(element.label as string, file)
			)
		)
	  );
	}
	return Promise.resolve([]);
  }
 
  private async findTestFiles(): Promise<void> {
	try {
	  const files = await vscode.workspace.findFiles('**/*.test.ts', '**/node_modules/**');
	  this.files = files;
	  this._onDidChangeTreeData.fire();
	} catch (error) {
	  if (error instanceof Error) {
		vscode.window.showErrorMessage(`Error finding test files: ${error.message}`);
	  } else {
		vscode.window.showErrorMessage(`Unknown error occurred while finding test files.`);
	  }
	}
  }
 
  private groupFilesByFolder(): Map<string, string[]> {
    const folderMap = new Map<string, string[]>();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

    this.files.forEach((fileUri) => {
      const relativePath = path.relative(workspaceFolder, fileUri.fsPath);
      const folder = path.dirname(relativePath);
      const fileName = path.basename(relativePath);

      if (!folderMap.has(folder)) {
        folderMap.set(folder, []);
      }
      folderMap.get(folder)?.push(fileName);
    });

    return folderMap;
  }
}

class TreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public isFolder: boolean,
    public filePath?: string
  ) {
    super(label, collapsibleState);

	// Set a folder or file icon
	this.iconPath = isFolder
	? new vscode.ThemeIcon('folder')
	: new vscode.ThemeIcon('file');

    this.contextValue = isFolder ? 'folder' : 'file';
    if (!isFolder && filePath) {
      this.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [vscode.Uri.file(filePath)],
      };
    }
  }
}
