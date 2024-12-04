import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new ExtesterTreeProvider();
  vscode.window.registerTreeDataProvider('extesterView', treeDataProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand('extester-runner.refreshTests', () => {
      treeDataProvider.refresh();
    })
  );

  // Register the "Run All" command
  context.subscriptions.push(
    vscode.commands.registerCommand('extester-runner.runAll', async () => {
      vscode.window.showInformationMessage('Running all tests...');
      // Simulate backend logic for running tests
      await runAllTests();
    })
  );
}

export function deactivate() { }

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
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      return Promise.resolve(
        files.map(
          (file) =>
            new TreeItem(
              file,
              vscode.TreeItemCollapsibleState.None,
              false,
              path.join(workspaceFolder, element.label as string, file) // Correct file path
            )
        )
      );
    }
    return Promise.resolve([]);
  }

  private async findTestFiles(): Promise<void> {
    try {
      // Get settings or use the default
      const configuration = vscode.workspace.getConfiguration('extesterRunner');
      const testFileGlob = configuration.get<string>('testFileGlob') || '**/*.test.ts';
      const excludeGlob = configuration.get<string>('excludeGlob') || '**/node_modules/**';
  
      // Use the settings in findFiles
      const files = await vscode.workspace.findFiles(testFileGlob, excludeGlob);
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
  
  // private async findTestFiles(): Promise<void> {
  //   try {
  //     const files = await vscode.workspace.findFiles('**/*.test.ts', '**/node_modules/**');
  //     this.files = files;
  //     this._onDidChangeTreeData.fire();
  //   } catch (error) {
  //     if (error instanceof Error) {
  //       vscode.window.showErrorMessage(`Error finding test files: ${error.message}`);
  //     } else {
  //       vscode.window.showErrorMessage(`Unknown error occurred while finding test files.`);
  //     }
  //   }
  // }

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

async function runAllTests() {
  // Show a notification to the user
  vscode.window.showInformationMessage('Running UI tests in the terminal...');

  // Find an existing terminal or create a new one
  let terminal = vscode.window.terminals.find(t => t.name === 'UI Test Runner');
  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name: 'UI Test Runner', // Name of the terminal
    });
  }

  // Focus the terminal and send the command
  terminal.show();
  terminal.sendText('npm run ui-test');

  // Optionally, show progress while the command runs
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Running UI tests...",
      cancellable: false,
    },
    async () => {
      // Simulate a short delay for demonstration purposes
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  );

  // Notify the user once the process is initiated
  vscode.window.showInformationMessage('UI tests have been initiated in the terminal.');
}
