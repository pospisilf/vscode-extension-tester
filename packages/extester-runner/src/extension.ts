import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new ExtesterTreeProvider();
  vscode.window.registerTreeDataProvider('extesterView', treeDataProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand('extester-runner.refreshTests', () => {
      treeDataProvider.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extester-runner.runAll', async () => {
      vscode.window.showInformationMessage('Running all tests...');
      await runAllTests();
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
  private parsedContent: Map<string, { line: number; label: string }[]> = new Map();

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
    this.findTestFiles();
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      const folderMap = this.groupFilesByFolder();
      return Array.from(folderMap.keys()).map(
        (folder) => new TreeItem(folder, vscode.TreeItemCollapsibleState.Collapsed, true)
      );
    } else if (element.isFolder && typeof element.label === 'string') {
      const folderMap = this.groupFilesByFolder();
      const files = folderMap.get(element.label) || [];
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      return files.map(
        (file) =>
          new TreeItem(
            file,
            vscode.TreeItemCollapsibleState.Collapsed,
            false,
            path.join(workspaceFolder, element.label as string, file)
          )
      );
    } else if (!element.isFolder && element.filePath) {
      const content = this.parsedContent.get(element.filePath) || [];
      return content.map(
        (item) =>
          new TreeItem(item.label, vscode.TreeItemCollapsibleState.None, false, element.filePath, item.line)
      );
    }
    return [];
  }

  private async findTestFiles(): Promise<void> {
    try {
      const configuration = vscode.workspace.getConfiguration('extesterRunner');
      const testFileGlob = configuration.get<string>('testFileGlob') || '**/*.test.ts';
      const excludeGlob = configuration.get<string>('excludeGlob') || '**/node_modules/**';

      const files = await vscode.workspace.findFiles(testFileGlob, excludeGlob);
      this.files = files;
      this.parsedContent.clear();

      await Promise.all(
        files.map(async (fileUri) => {
          const filePath = fileUri.fsPath;
          const content = await this.parseFile(filePath);
          this.parsedContent.set(filePath, content);
        })
      );

      this._onDidChangeTreeData.fire();
    } catch (error) {
      if (error instanceof Error) {
        vscode.window.showErrorMessage(`Error finding test files: ${error.message}`);
      } else {
        vscode.window.showErrorMessage(`Unknown error occurred while finding test files.`);
      }
    }
  }

  private async parseFile(filePath: string): Promise<{ line: number; label: string }[]> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const describeOrItRegex = /(describe|it)\(['"](.*?)['"]\s*,/g;

      const matches: { line: number; label: string }[] = [];
      let match;

      const lines = fileContent.split('\n');
      lines.forEach((line, index) => {
        while ((match = describeOrItRegex.exec(line)) !== null) {
          matches.push({ line: index, label: `${match[1]}: ${match[2]}` });
        }
      });

      return matches;
    } catch (error) {
      vscode.window.showErrorMessage(`Error parsing file ${filePath}: ${error}`);
      return [];
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
    public filePath?: string,
    public lineNumber?: number
  ) {
    super(label, collapsibleState);

    this.iconPath = isFolder
      ? new vscode.ThemeIcon('folder')
      : new vscode.ThemeIcon('file');

    this.contextValue = isFolder ? 'folder' : 'file';
    if (!isFolder && filePath) {
      this.command = lineNumber !== undefined
        ? {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(filePath), {
              selection: new vscode.Range(lineNumber, 0, lineNumber, 0)
            }],
          }
        : {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(filePath)],
          };
    }
  }
}

async function runAllTests() {
  vscode.window.showInformationMessage('Running UI tests in the terminal...');

  let terminal = vscode.window.terminals.find(t => t.name === 'UI Test Runner');
  if (!terminal) {
    terminal = vscode.window.createTerminal({
      name: 'UI Test Runner',
    });
  }

  terminal.show();
  terminal.sendText('npm run ui-test');

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Running UI tests...",
      cancellable: false,
    },
    async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  );

  vscode.window.showInformationMessage('UI tests have been initiated in the terminal.');
}
